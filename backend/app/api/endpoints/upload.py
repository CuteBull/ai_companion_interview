from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from sqlalchemy.orm import Session
import tempfile
import os
import logging
import uuid
from pathlib import Path
from app.core.database import get_db
from app.core.config import settings
from app.services.file_service import file_service
from app.services.openai_service import openai_service
from app.models.file import File as FileModel

router = APIRouter()
logger = logging.getLogger(__name__)


def _save_local_upload(
    request: Request,
    content: bytes,
    filename: str | None,
    category: str,
    fallback_extension: str,
):
    """当云存储失败时回退到本地存储。"""
    extension = Path(filename or "").suffix.lower() or fallback_extension
    target_dir = Path(settings.LOCAL_UPLOAD_DIR) / category
    target_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}{extension}"
    local_path = target_dir / stored_name
    local_path.write_bytes(content)

    public_id = f"local/{category}/{stored_name}"
    url = str(request.url_for("uploaded_file", path=f"{category}/{stored_name}"))

    return url, public_id, extension.lstrip(".")

@router.post("")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """上传文件，优先Cloudinary，失败时回退本地存储。"""

    # 验证文件类型
    allowed_image_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    allowed_audio_types = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"]

    if file.content_type not in allowed_image_types + allowed_audio_types:
        raise HTTPException(400, "不支持的文件类型")

    # 读取文件内容并验证大小
    content = await file.read()

    # 文件大小限制：图像10MB，音频20MB
    max_image_size = 10 * 1024 * 1024  # 10MB
    max_audio_size = 20 * 1024 * 1024  # 20MB

    if file.content_type in allowed_image_types and len(content) > max_image_size:
        raise HTTPException(400, f"图像文件大小不能超过 {max_image_size // (1024*1024)}MB")
    elif file.content_type in allowed_audio_types and len(content) > max_audio_size:
        raise HTTPException(400, f"音频文件大小不能超过 {max_audio_size // (1024*1024)}MB")

    # 保存临时文件
    tmp_suffix = Path(file.filename or "").suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=tmp_suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # 根据类型上传
        if file.content_type in allowed_image_types:
            try:
                url, public_id = file_service.upload_image(tmp_path)
                file_format = Path(file.filename or "").suffix.lstrip(".").lower() or "jpg"
            except Exception as exc:
                logger.warning("Cloudinary image upload failed, using local fallback: %s", exc)
                url, public_id, file_format = _save_local_upload(
                    request=request,
                    content=content,
                    filename=file.filename,
                    category="images",
                    fallback_extension=".jpg",
                )
        else:
            try:
                url, public_id = file_service.upload_audio(tmp_path)
                file_format = "mp3"
            except Exception as exc:
                logger.warning("Cloudinary audio upload failed, using local fallback: %s", exc)
                url, public_id, file_format = _save_local_upload(
                    request=request,
                    content=content,
                    filename=file.filename,
                    category="audio",
                    fallback_extension=".webm",
                )

        # 保存文件记录
        file_record = FileModel(
            public_id=public_id,
            url=url,
            format=file_format,
            size=len(content)
        )
        db.add(file_record)
        db.commit()

        return {
            "url": url,
            "public_id": public_id,
            "format": file_format,
            "size": len(content)
        }

    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """转录音频文件为文字"""

    # 验证文件类型
    allowed_audio_types = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"]

    if audio.content_type not in allowed_audio_types:
        raise HTTPException(400, "不支持的音频格式")

    # 读取文件内容并验证大小
    content = await audio.read()

    # 音频文件大小限制：25MB（OpenAI API限制）
    max_audio_size = 25 * 1024 * 1024  # 25MB

    if len(content) > max_audio_size:
        raise HTTPException(400, f"音频文件大小不能超过 {max_audio_size // (1024*1024)}MB")

    # 保存临时文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # 调用OpenAI服务进行转录
        text = await openai_service.transcribe_audio(tmp_path)
        return {"text": text}
    except Exception as e:
        raise HTTPException(500, f"音频转录失败: {str(e)}")
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
