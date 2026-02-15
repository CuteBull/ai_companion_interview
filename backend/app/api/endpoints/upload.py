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


def _cloudinary_failure_hint(exc: Exception) -> str:
    message = str(exc).strip().lower()
    config_error = (file_service.get_status().get("error") or "").strip()

    if config_error:
        return config_error

    if any(keyword in message for keyword in ("unknown api key", "invalid signature", "unauthorized", "401")):
        return "Cloudinary 鉴权失败，请核对 API Key 和 API Secret"
    if "cloud name" in message or "unknown cloud" in message:
        return "Cloud name 无效，请核对 CLOUDINARY_CLOUD_NAME"
    if any(keyword in message for keyword in ("timed out", "timeout", "connection", "dns")):
        return "Cloudinary 网络连接失败，请稍后重试"
    if "must supply api_key" in message or "api_key" in message and "missing" in message:
        return "缺少 Cloudinary API Key"
    if "must supply api_secret" in message or "api_secret" in message and "missing" in message:
        return "缺少 Cloudinary API Secret"

    return "Cloudinary 上传请求失败"


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
    relative_path = f"{category}/{stored_name}"
    url = _build_public_upload_url(request, relative_path)

    return url, public_id, extension.lstrip(".")


def _build_public_upload_url(request: Request, path: str) -> str:
    forwarded_proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "https").split(",")[0].strip()
    forwarded_host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(",")[0].strip()

    if forwarded_host:
        scheme = forwarded_proto if forwarded_proto in ("http", "https") else "https"
        # 对公网域名强制HTTPS，避免前端页面出现mixed-content导致图片加载失败
        if scheme == "http" and "localhost" not in forwarded_host and "127.0.0.1" not in forwarded_host:
            scheme = "https"
        return f"{scheme}://{forwarded_host}/uploads/{path}"

    return str(request.url_for("uploaded_file", path=path))

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
                storage = "cloudinary"
            except Exception as exc:
                logger.warning("Cloudinary image upload failed: %s", exc)
                if not settings.ALLOW_LOCAL_UPLOAD_FALLBACK:
                    raise HTTPException(
                        status_code=503,
                        detail=f"图片存储服务不可用：{_cloudinary_failure_hint(exc)}。请检查 Cloudinary 配置后重试",
                    )
                url, public_id, file_format = _save_local_upload(
                    request=request,
                    content=content,
                    filename=file.filename,
                    category="images",
                    fallback_extension=".jpg",
                )
                storage = "local"
        else:
            try:
                url, public_id = file_service.upload_audio(tmp_path)
                file_format = "mp3"
                storage = "cloudinary"
            except Exception as exc:
                logger.warning("Cloudinary audio upload failed: %s", exc)
                if not settings.ALLOW_LOCAL_UPLOAD_FALLBACK:
                    raise HTTPException(
                        status_code=503,
                        detail=f"音频存储服务不可用：{_cloudinary_failure_hint(exc)}。请检查 Cloudinary 配置后重试",
                    )
                url, public_id, file_format = _save_local_upload(
                    request=request,
                    content=content,
                    filename=file.filename,
                    category="audio",
                    fallback_extension=".webm",
                )
                storage = "local"

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
            "size": len(content),
            "storage": storage,
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
