from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
from urllib.parse import urlparse, unquote
from app.core.database import get_db
from app.core.config import settings
from app.schemas.chat import SessionsResponse, ClearSessionsResponse, SessionToMomentRequest
from app.schemas.moment import MomentCommentResponse, MomentResponse
from app.services.chat_service import ChatService
from app.services.openai_service import openai_service
from app.models.message import Message as MessageModel
from app.models.moment import Moment as MomentModel, MomentComment as MomentCommentModel
from app.models.session import Session as SessionModel

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


def _normalize_username(name: str | None, default: str = "你") -> str:
    normalized = (name or default).strip()
    return normalized or default


def _to_utc_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def _build_moment_content(messages: list[MessageModel], fallback_title: str | None) -> str:
    # 兜底文案（正常流程会由模型生成）。
    user_lines: list[str] = []
    for msg in messages:
        if msg.role == "user":
            text = " ".join((msg.content or "").strip().split())
            if text:
                user_lines.append(text[:120])

    if user_lines:
        seed = user_lines[-1].replace("怎么办", "慢慢来").strip("？?。")
        return f"{seed}。把心事写下来，日子也会一点点变轻🌿"

    return (fallback_title or "").strip() or "记录一段对话心情"


def _collect_assistant_reply_comments(messages: list[MessageModel]) -> list[str]:
    # 将 AI 最近回复落到评论区，不带“AI陪伴助手：”文本前缀。
    comments: list[str] = []
    for msg in messages:
        if msg.role != "assistant":
            continue
        text = " ".join((msg.content or "").strip().split())
        if not text:
            continue
        comments.append(text[:1000])

    return comments[-6:]


def _collect_moment_images(messages: list[MessageModel]) -> list[str]:
    # 朋友圈最多展示 9 张，按聊天顺序去重保留。
    images: list[str] = []
    seen: set[str] = set()
    for msg in messages:
        if msg.role != "user":
            continue
        for image in _sanitize_image_urls(msg.image_urls):
            if image in seen:
                continue
            images.append(image)
            seen.add(image)
            if len(images) >= 9:
                return images
    return images

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


@router.post("/{session_id}/moment", response_model=MomentResponse)
async def create_moment_from_session(
    session_id: str,
    payload: SessionToMomentRequest,
    db: Session = Depends(get_db)
):
    """从历史对话一键生成朋友圈动态"""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="对话不存在")

    messages = (
        db.query(MessageModel)
        .filter(MessageModel.session_id == session_id)
        .order_by(MessageModel.created_at.asc())
        .all()
    )
    if not messages:
        raise HTTPException(status_code=400, detail="该对话暂无可生成的内容")

    generation_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in messages
    ]
    content = await openai_service.generate_moment_copy(generation_messages, session.title)
    if not content:
        content = _build_moment_content(messages, session.title)
    image_urls = _collect_moment_images(messages)
    assistant_comments = _collect_assistant_reply_comments(messages)
    if not content and not image_urls:
        raise HTTPException(status_code=400, detail="该对话暂无可生成的内容")

    moment = MomentModel(
        author_name=_normalize_username(payload.author_name),
        author_avatar_url=(payload.author_avatar_url or "").strip() or None,
        content=content,
        image_urls=image_urls,
        location=(payload.location or "").strip() or None,
        session_id=session_id,
    )
    db.add(moment)
    db.flush()

    for comment_text in assistant_comments:
        db.add(
            MomentCommentModel(
                moment_id=moment.id,
                user_name="AI陪伴助手",
                content=comment_text,
            )
        )

    db.commit()
    db.refresh(moment)

    created_comments = (
        db.query(MomentCommentModel)
        .filter(MomentCommentModel.moment_id == moment.id)
        .order_by(MomentCommentModel.created_at.asc())
        .all()
    )

    return MomentResponse(
        id=moment.id,
        author_name=moment.author_name,
        author_avatar_url=moment.author_avatar_url,
        content=moment.content,
        image_urls=image_urls,
        location=moment.location,
        session_id=moment.session_id,
        created_at=_to_utc_iso(moment.created_at),
        like_count=0,
        comment_count=len(created_comments),
        likes=[],
        liked_by_me=False,
        comments=[
            MomentCommentResponse(
                id=item.id,
                moment_id=item.moment_id,
                parent_id=item.parent_id,
                user_name=item.user_name,
                reply_to_name=item.reply_to_name,
                content=item.content,
                created_at=_to_utc_iso(item.created_at),
            )
            for item in created_comments
        ],
    )
