from typing import List, Optional, AsyncGenerator, Dict
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.session import Session as SessionModel
from app.models.message import Message as MessageModel
from app.models.moment import Moment as MomentModel
from app.services.openai_service import openai_service
from app.utils.token_counter import token_counter

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, db: Session):
        self.db = db

    async def process_chat(
        self,
        session_id: Optional[str],
        user_message: str,
        image_urls: Optional[List[str]] = None,
        audio_text: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """处理聊天请求，流式返回AI响应"""

        try:
            # 获取或创建会话
            session = self._get_or_create_session(session_id)
            yield f"session:{session.id}"

            # 维护会话元数据
            session.updated_at = datetime.utcnow()
            if not session.title and user_message:
                session.title = self._generate_title(user_message)
            self.db.add(session)

            # 保存用户消息
            user_msg = MessageModel(
                session_id=session.id,
                role="user",
                content=user_message,
                image_urls=image_urls,
                audio_text=audio_text
            )
            self.db.add(user_msg)
            self.db.commit()

            # 获取会话历史
            history = self._get_session_history(session.id)

            # 流式调用AI
            full_response = ""
            async for chunk in openai_service.chat_completion_stream(history):
                yield chunk
                full_response += chunk

            # 保存AI响应
            ai_msg = MessageModel(
                session_id=session.id,
                role="assistant",
                content=full_response
            )
            session.updated_at = datetime.utcnow()
            self.db.add(ai_msg)
            self.db.add(session)
            self.db.commit()

        except Exception as e:
            logger.error(f"聊天处理错误: {str(e)}", exc_info=True)
            yield f"系统错误: {str(e)}"

    def _get_or_create_session(self, session_id: Optional[str]) -> SessionModel:
        """获取或创建会话"""
        if session_id:
            session = self.db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if session:
                return session

        # 创建新会话
        session = SessionModel()
        self.db.add(session)
        self.db.commit()
        return session

    def _get_session_history(self, session_id: str, max_messages: int = 30, max_tokens: int = 120000) -> List[dict]:
        """获取会话历史消息，使用token计数和消息数量双重限制防止token超限"""
        # 首先按时间倒序获取消息，限制数量
        messages = self.db.query(MessageModel).filter(
            MessageModel.session_id == session_id
        ).order_by(MessageModel.created_at.desc()).limit(max_messages).all()

        # 反转顺序，保持时间顺序
        messages = list(reversed(messages))

        # 转换为字典格式
        history = []
        for msg in messages:
            history.append({
                "role": msg.role,
                "content": msg.content,
                "image_urls": msg.image_urls,
                "audio_text": msg.audio_text
            })

        # 使用token计数器进行智能截断
        truncated_history = token_counter.truncate_messages(
            history,
            max_tokens=max_tokens,
            max_messages=max_messages
        )

        return truncated_history

    def get_sessions(self, page: int = 1, limit: int = 20):
        """获取对话列表"""
        offset = (page - 1) * limit
        sessions = self.db.query(SessionModel).order_by(
            SessionModel.updated_at.desc()
        ).offset(offset).limit(limit).all()

        total = self.db.query(SessionModel).count()

        return {
            "sessions": [
                {
                    "id": session.id,
                    "title": session.title or f"对话 {session.id[:8]}",
                    "created_at": session.created_at.isoformat(),
                    "message_count": len(session.messages),
                    "preview_image": self._get_session_preview(session)
                }
                for session in sessions
            ],
            "total": total,
            "page": page,
            "limit": limit
        }

    def clear_sessions(self) -> Dict[str, int]:
        """清空全部对话，并解除朋友圈对话关联。"""
        sessions = self.db.query(SessionModel).all()
        if not sessions:
            return {
                "deleted_sessions": 0,
                "deleted_messages": 0,
                "detached_moments": 0,
            }

        session_ids = [session.id for session in sessions]
        deleted_messages = self.db.query(MessageModel).filter(
            MessageModel.session_id.in_(session_ids)
        ).count()

        try:
            detached_moments = self.db.query(MomentModel).filter(
                MomentModel.session_id.in_(session_ids)
            ).update({MomentModel.session_id: None}, synchronize_session=False)

            for session in sessions:
                self.db.delete(session)

            self.db.commit()
            return {
                "deleted_sessions": len(session_ids),
                "deleted_messages": deleted_messages,
                "detached_moments": detached_moments,
            }
        except Exception:
            self.db.rollback()
            raise

    def _get_session_preview(self, session: SessionModel) -> Optional[str]:
        """获取会话预览图"""
        for message in session.messages:
            if message.image_urls:
                return message.image_urls[0]
        return None

    def _generate_title(self, content: str, max_length: int = 40) -> str:
        """基于首条用户消息生成对话标题"""
        normalized = " ".join(content.strip().split())
        if not normalized:
            return "新对话"
        return normalized[:max_length]
