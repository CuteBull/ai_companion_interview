from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.chat import SessionsResponse, ClearSessionsResponse
from app.services.chat_service import ChatService

router = APIRouter()

@router.get("", response_model=SessionsResponse)
def get_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """获取对话列表"""
    service = ChatService(db)
    return service.get_sessions(page=page, limit=limit)

@router.delete("", response_model=ClearSessionsResponse)
def clear_sessions(
    db: Session = Depends(get_db)
):
    """清空全部历史对话"""
    service = ChatService(db)
    return service.clear_sessions()

@router.get("/{session_id}/messages")
def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db)
):
    """获取对话消息历史"""
    from app.models.message import Message as MessageModel
    from app.models.session import Session as SessionModel

    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(404, "对话不存在")

    messages = db.query(MessageModel).filter(
        MessageModel.session_id == session_id
    ).order_by(MessageModel.created_at).all()

    return {
        "session": {
            "id": session.id,
            "title": session.title or f"对话 {session.id[:8]}"
        },
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "image_urls": msg.image_urls,
                "audio_text": msg.audio_text,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
    }
