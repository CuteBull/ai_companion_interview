from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
from urllib.parse import urlparse, unquote
from app.core.database import get_db
from app.core.config import settings
from app.schemas.chat import SessionsResponse, ClearSessionsResponse
from app.services.chat_service import ChatService

router = APIRouter()


def _extract_local_upload_relative_path(url: str) -> str | None:
    if not url:
        return None

    normalized = url.strip()
    if normalized.startswith("/uploads/"):
        return normalized[len("/uploads/"):].lstrip("/")

    try:
        parsed = urlparse(normalized)
    except Exception:
        return None

    if parsed.path.startswith("/uploads/"):
        return unquote(parsed.path[len("/uploads/"):].lstrip("/"))
    return None


def _local_upload_exists(url: str) -> bool | None:
    relative_path = _extract_local_upload_relative_path(url)
    if relative_path is None:
        return None

    candidate = Path(relative_path)
    if candidate.is_absolute() or ".." in candidate.parts:
        return False

    upload_root = Path(settings.LOCAL_UPLOAD_DIR).resolve()
    target = (upload_root / candidate).resolve()
    if upload_root not in target.parents and target != upload_root:
        return False
    return target.exists()


def _sanitize_image_urls(image_urls: list[str] | None) -> list[str]:
    sanitized: list[str] = []
    for raw in image_urls or []:
        normalized = (raw or "").strip()
        if not normalized:
            continue
        exists = _local_upload_exists(normalized)
        if exists is False:
            continue
        sanitized.append(normalized)
    return sanitized

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
                "image_urls": _sanitize_image_urls(msg.image_urls),
                "audio_text": msg.audio_text,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
    }
