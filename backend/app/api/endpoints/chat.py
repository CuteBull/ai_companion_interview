from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService
import asyncio

router = APIRouter()

@router.post("", response_class=StreamingResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """处理聊天请求，流式返回响应"""

    service = ChatService(db)

    async def generate():
        async for chunk in service.process_chat(
            session_id=request.session_id,
            user_message=request.message,
            image_urls=request.image_urls,
            audio_text=request.audio_text
        ):
            yield f"data: {chunk}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )