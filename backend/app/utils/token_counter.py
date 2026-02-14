import tiktoken
from typing import List, Dict

class TokenCounter:
    def __init__(self, model: str = "gpt-4"):
        """初始化token计数器"""
        try:
            self.encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            # 如果模型不存在，使用cl100k_base编码（GPT-4/GPT-3.5使用）
            self.encoding = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        """计算文本的token数量"""
        return len(self.encoding.encode(text))

    def count_message_tokens(self, message: Dict) -> int:
        """计算单条消息的token数量（包括图像和音频文本）"""
        tokens = 0

        # 文本内容
        if message.get("content"):
            tokens += self.count_tokens(message["content"])

        # 图像URLs（每个图像URL大约85个token）
        if message.get("image_urls"):
            tokens += len(message["image_urls"]) * 85

        # 音频文本
        if message.get("audio_text"):
            tokens += self.count_tokens(message["audio_text"])

        # 角色和其他元数据
        if message.get("role"):
            tokens += self.count_tokens(message["role"])

        return tokens

    def count_conversation_tokens(self, messages: List[Dict]) -> int:
        """计算整个对话的token数量"""
        total = 0
        for msg in messages:
            total += self.count_message_tokens(msg)
        return total

    def truncate_messages(
        self,
        messages: List[Dict],
        max_tokens: int = 120000,
        max_messages: int = 50
    ) -> List[Dict]:
        """截断消息列表以符合token限制"""
        if len(messages) > max_messages:
            messages = messages[-max_messages:]

        total_tokens = self.count_conversation_tokens(messages)

        # 如果token数超出限制，从最旧的消息开始移除
        while total_tokens > max_tokens and len(messages) > 1:
            removed = messages.pop(0)
            total_tokens -= self.count_message_tokens(removed)

        return messages

token_counter = TokenCounter()