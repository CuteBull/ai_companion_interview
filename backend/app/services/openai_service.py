import asyncio
from typing import List, Optional, AsyncGenerator
import logging
import base64
import mimetypes
import re
from pathlib import Path
from urllib.parse import urlparse, unquote
from openai import AsyncAzureOpenAI
from app.core.config import settings
from app.utils.token_counter import token_counter

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        self.chat_client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
        self.transcribe_client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_TRANSCRIBE_API_VERSION,
        )
        self.deployment = settings.AZURE_OPENAI_DEPLOYMENT

    def _sanitize_moment_copy(self, text: str) -> str:
        cleaned = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
        if not cleaned:
            return ""

        cleaned = re.sub(r"^\s*(今日文案|朋友圈文案|文案)\s*[:：]\s*", "", cleaned)
        cleaned = re.sub(r"(?m)^\s*[>#\-*]+\s*", "", cleaned)
        cleaned = re.sub(r"(?m)^\s*(你|用户|AI陪伴助手|助手)\s*[:：]\s*", "", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
        return cleaned.strip()[:220]

    def _fallback_moment_copy(
        self,
        user_text: str,
        assistant_texts: List[str],
        fallback_title: Optional[str] = None
    ) -> str:
        context = " ".join(
            " ".join((text or "").strip().split())
            for text in assistant_texts[-4:]
        )
        user_context = " ".join(user_text.strip().split())
        merged_context = f"{user_context} {context}".strip()

        if any(k in merged_context for k in ["宝宝", "孩子", "绿便", "拉绿", "便便"]):
            return "被宝宝的小状况吓了一跳，先别慌，慢慢观察。愿今晚都能安心一点，日子依旧温柔🍼"

        if any(k in merged_context for k in ["心情不好", "难过", "焦虑", "压力", "烦", "委屈"]):
            return "今天心里有点重，但说出来就轻了一些。慢慢来，愿我们都被温柔接住✨"

        seed = user_context or (fallback_title or "记下今天的小心情")
        seed = seed.replace("怎么办", "慢慢来").strip("？?。")
        if len(seed) > 36:
            seed = f"{seed[:36]}…"

        return f"{seed}。把心事写下来，日子也会一点点变轻🌿"

    async def generate_moment_copy(
        self,
        user_text: str,
        assistant_texts: List[str],
        fallback_title: Optional[str] = None
    ) -> str:
        """根据对话上下文生成朋友圈短文案。"""
        if settings.MOCK_OPENAI:
            return self._fallback_moment_copy(user_text, assistant_texts, fallback_title)

        normalized_user = user_text.strip()
        normalized_assistant = [
            " ".join((text or "").strip().split())
            for text in assistant_texts
            if (text or "").strip()
        ]
        if not normalized_assistant:
            return self._fallback_moment_copy(normalized_user, normalized_assistant, fallback_title)

        system_prompt = (
            "你是中文朋友圈文案助手。请把“用户表达 + 陪伴助手回复”整合为一段用户愿意发朋友圈的心情小记。"
            "要求：1-2句话，20-80字，语气自然温柔、偏第一人称；"
            "不要直接照抄用户原话；只输出文案本身；不要标题、列表、markdown、引号、角色前缀。"
        )
        assistant_block = "\n".join(
            f"回复{i + 1}: {text[:320]}"
            for i, text in enumerate(normalized_assistant[-6:])
        )
        user_prompt = f"用户原话：{normalized_user[:300]}\n\n陪伴助手回复：\n{assistant_block}"

        try:
            response = await self.chat_client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.8,
                max_tokens=140,
            )
            content = (response.choices[0].message.content or "").strip()
            sanitized = self._sanitize_moment_copy(content)
            if sanitized:
                return sanitized
        except Exception as exc:
            logger.warning("Generate moment copy failed, fallback enabled: %s", exc)

        return self._fallback_moment_copy(normalized_user, normalized_assistant, fallback_title)

    def _extract_upload_request_path(self, image_url: str) -> Optional[str]:
        if not image_url:
            return None

        parsed = urlparse(image_url)
        if parsed.scheme in ("http", "https"):
            request_path = unquote(parsed.path)
        else:
            request_path = unquote(image_url)

        if not request_path.startswith("/uploads/"):
            return None
        return request_path

    def _resolve_local_upload_path(self, image_url: str) -> Optional[Path]:
        """将本地上传URL映射到磁盘路径。"""
        request_path = self._extract_upload_request_path(image_url)
        if not request_path:
            return None

        relative_path = request_path[len("/uploads/"):]
        upload_root = Path(settings.LOCAL_UPLOAD_DIR).resolve()
        candidate = (upload_root / relative_path).resolve()

        try:
            candidate.relative_to(upload_root)
        except ValueError:
            return None

        if not candidate.exists():
            return None

        return candidate

    def _prepare_image_url(self, image_url: str) -> Optional[str]:
        """如果是本地上传图片，转换为data URL；若文件已失效则跳过。"""
        is_local_upload = self._extract_upload_request_path(image_url) is not None
        local_path = self._resolve_local_upload_path(image_url)
        if not local_path:
            if is_local_upload:
                logger.warning("Skip inaccessible local upload for OpenAI: %s", image_url)
                return None
            return image_url

        try:
            mime_type, _ = mimetypes.guess_type(str(local_path))
            mime_type = mime_type or "application/octet-stream"
            encoded = base64.b64encode(local_path.read_bytes()).decode("ascii")
            return f"data:{mime_type};base64,{encoded}"
        except Exception as exc:
            logger.warning("Failed to convert local image to data URL: %s", exc)
            if is_local_upload:
                return None
            return image_url

    async def chat_completion_stream(
        self,
        messages: List[dict],
        max_completion_tokens: Optional[int] = None
    ) -> AsyncGenerator[str, None]:
        """流式聊天补全，支持图片和音频文本输入，自动计算token限制"""

        if settings.MOCK_OPENAI:
            user_texts = [
                (msg.get("content") or "").strip()
                for msg in messages
                if msg.get("role") == "user" and (msg.get("content") or "").strip()
            ]
            latest_user_text = user_texts[-1] if user_texts else ""
            recent_context = " ".join(user_texts[-4:])
            lowered_latest = latest_user_text.lower()
            lowered_context = recent_context.lower()

            mood_keywords = ["心情不好", "难过", "低落", "焦虑", "压力大", "委屈", "烦"]
            mood_keywords_en = ["sad", "anxious", "stress", "down", "upset"]
            confirm_keywords = ["好呀", "好啊", "好", "嗯", "可以", "行", "来吧", "想试试"]
            greeting_keywords = ["你好", "嗨", "在吗", "hello", "hi", "早上好", "中午好", "晚上好"]
            relationship_keywords = ["不理我", "怎么办", "冷战", "吵架", "老公", "男朋友", "伴侣", "对象"]

            has_mood_context = any(k in recent_context for k in mood_keywords) or any(
                k in lowered_context for k in mood_keywords_en
            )
            has_mood_latest = any(k in latest_user_text for k in mood_keywords) or any(
                k in lowered_latest for k in mood_keywords_en
            )
            repeated_latest = len(user_texts) >= 2 and latest_user_text == user_texts[-2]
            has_greeting_latest = any(k in latest_user_text for k in greeting_keywords) or any(
                k in lowered_latest for k in ["hello", "hi"]
            )

            if not latest_user_text:
                reply = "我在这儿。你想聊什么，我都认真听着。"
            elif repeated_latest:
                reply = (
                    "我在呢，你慢慢说就好。\n"
                    "不用急着组织语言，想到什么就说什么。"
                )
            elif has_mood_latest:
                reply = (
                    "抱抱你，今天不开心也没关系，我一直都在这儿陪着你。\n"
                    "不管是想吐槽、想安静，还是只想随便说说话，我都听着。\n"
                    "愿你今晚能被温柔接住，坏心情早点飘走。"
                )
            elif latest_user_text in confirm_keywords and has_mood_context:
                reply = (
                    "好呀，我在。\n"
                    "那我们就轻轻说一说：今天让你最难受的那一刻是什么？\n"
                    "你想到哪一句就说哪一句，我都会接着。"
                )
            elif any(k in latest_user_text for k in relationship_keywords):
                reply = (
                    "这真的会让人很难受，尤其是你在乎他的时候。\n"
                    "你先别急着责怪自己，我会陪你一起想办法。\n"
                    "如果你愿意，我们先把刚刚发生的那一幕理一理，我陪你慢慢说。"
                )
            elif has_greeting_latest:
                reply = (
                    "你好呀，我在这儿陪你。\n"
                    "今天想聊点什么？开心的、不开心的，都可以。"
                )
            elif latest_user_text in confirm_keywords:
                reply = (
                    "好呀，我陪你慢慢聊。\n"
                    "你可以从今天最想说的一件小事开始。"
                )
            else:
                reply = (
                    "我在认真听你说。\n"
                    "如果你愿意，可以多说一点点，我会一直陪着你。"
                )

            # 模拟流式输出：按行推送，保留整洁排版
            lines = [line for line in reply.split("\n") if line]
            for idx, line in enumerate(lines):
                if idx < len(lines) - 1:
                    yield line + "\n"
                else:
                    yield line
                await asyncio.sleep(0.25)
            return

        # 计算输入消息的token数量
        input_tokens = token_counter.count_conversation_tokens(messages)

        # GPT-4o最大上下文长度：131072 tokens
        max_context_tokens = 131072

        # 计算可用token数量，留出2000 tokens作为缓冲（考虑token计数差异）
        available_tokens = max_context_tokens - input_tokens - 2000

        # 如果输入已经超过限制，抛出错误
        if available_tokens < 1:
            error_msg = f"输入消息过长 ({input_tokens} tokens)，超过模型限制 ({max_context_tokens} tokens)"
            logger.error(error_msg)
            yield f"错误: {error_msg}"
            return

        # 确定补全token数量
        if max_completion_tokens is not None:
            # 使用用户指定的值，但不超过可用token数
            completion_tokens = min(max_completion_tokens, available_tokens)
        else:
            # 默认使用可用token数的20%，但不超过2000（更保守）
            default_tokens = min(int(available_tokens * 0.2), 2000)
            # 确保至少100 tokens
            completion_tokens = max(default_tokens, 100)

        # 警告：如果可用token太少或输入接近限制
        if available_tokens < 5000:
            logger.warning(f"可用token不足: {available_tokens} (输入={input_tokens})，接近模型限制")
        if input_tokens > 120000:
            logger.warning(f"输入token过多: {input_tokens}，接近模型限制131072")

        logger.info(f"Token统计: 输入={input_tokens}, 可用={available_tokens}, 补全={completion_tokens}")

        # 构建消息列表
        openai_messages = []
        for msg in messages:
            content = []

            # 构建文本内容：合并文本和音频转录文本
            text_content = ""
            if msg.get("content"):
                text_content += msg["content"]
            if msg.get("audio_text"):
                if text_content:
                    text_content += "\n\n[音频转录]: " + msg["audio_text"]
                else:
                    text_content = "[音频转录]: " + msg["audio_text"]

            if text_content:
                content.append({"type": "text", "text": text_content})

            # 添加图片内容
            if msg.get("image_urls"):
                for img_url in msg["image_urls"]:
                    prepared_url = self._prepare_image_url(img_url)
                    if not prepared_url:
                        continue
                    content.append({
                        "type": "image_url",
                        "image_url": {"url": prepared_url}
                    })

            openai_messages.append({
                "role": msg["role"],
                "content": content if content else [{"type": "text", "text": ""}]
            })

        try:
            stream = await self.chat_client.chat.completions.create(
                model=self.deployment,
                messages=openai_messages,
                stream=True,
                max_tokens=completion_tokens,
                temperature=0.7,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"OpenAI聊天补全错误: {str(e)}", exc_info=True)
            yield f"错误: {str(e)}"

    async def transcribe_audio(self, audio_file_path: str) -> str:
        """转录音频文件为文字"""
        if settings.MOCK_OPENAI:
            return "[本地模拟转录] 这是音频转文字的测试结果。"

        try:
            with open(audio_file_path, "rb") as audio_file:
                transcript = await self.transcribe_client.audio.transcriptions.create(
                    file=audio_file,
                    model=settings.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT,
                )
                return transcript.text
        except Exception as e:
            logger.error(f"音频转录错误: {str(e)}", exc_info=True)
            return f"转录错误: {str(e)}"

openai_service = OpenAIService()
