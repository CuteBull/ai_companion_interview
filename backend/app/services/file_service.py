import logging
from typing import Optional, Tuple

import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url

from app.core.config import settings


logger = logging.getLogger(__name__)


def _normalize_env_value(value: Optional[str]) -> str:
    if not value:
        return ""

    normalized = value.strip()
    if (normalized.startswith('"') and normalized.endswith('"')) or (
        normalized.startswith("'") and normalized.endswith("'")
    ):
        normalized = normalized[1:-1].strip()

    # 兼容把整行 "CLOUDINARY_URL=..." 粘贴到 value 的情况
    if normalized.upper().startswith("CLOUDINARY_URL="):
        normalized = normalized.split("=", 1)[1].strip()

    return normalized


def _is_placeholder(value: str) -> bool:
    lowered = value.lower()
    return "<your_" in lowered or "your_api_" in lowered or "<cloud_name>" in lowered


class FileService:
    def __init__(self):
        self.enabled = False
        self.config_mode: str = "unconfigured"
        self.config_error: Optional[str] = None
        self._configure()

    def _configure(self):
        cloudinary_url_env = _normalize_env_value(settings.CLOUDINARY_URL)
        cloud_name = _normalize_env_value(settings.CLOUDINARY_CLOUD_NAME)
        api_key = _normalize_env_value(settings.CLOUDINARY_API_KEY)
        api_secret = _normalize_env_value(settings.CLOUDINARY_API_SECRET)

        try:
            if cloudinary_url_env:
                if _is_placeholder(cloudinary_url_env):
                    self.enabled = False
                    self.config_mode = "invalid_config"
                    self.config_error = "CLOUDINARY_URL contains placeholder values. Please replace with real key/secret/cloud name."
                    logger.warning(self.config_error)
                    return

                if not cloudinary_url_env.startswith("cloudinary://"):
                    self.enabled = False
                    self.config_mode = "invalid_config"
                    self.config_error = "CLOUDINARY_URL must start with cloudinary://"
                    logger.warning(self.config_error)
                    return

                cloudinary.config(cloudinary_url=cloudinary_url_env, secure=True)
                self.enabled = True
                self.config_mode = "cloudinary_url"
                self.config_error = None
                return

            if cloud_name and api_key and api_secret:
                if _is_placeholder(cloud_name) or _is_placeholder(api_key) or _is_placeholder(api_secret):
                    self.enabled = False
                    self.config_mode = "invalid_config"
                    self.config_error = "Cloudinary split vars contain placeholder values. Please replace with real credentials."
                    logger.warning(self.config_error)
                    return

                cloudinary.config(
                    cloud_name=cloud_name,
                    api_key=api_key,
                    api_secret=api_secret,
                    secure=True,
                )
                self.enabled = True
                self.config_mode = "triple_vars"
                self.config_error = None
                return

            self.enabled = False
            self.config_mode = "unconfigured"
            self.config_error = (
                "Cloudinary is not configured. Set CLOUDINARY_URL or "
                "CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET."
            )
            logger.warning(self.config_error)
        except Exception as exc:
            self.enabled = False
            self.config_mode = "invalid_config"
            self.config_error = f"Invalid Cloudinary configuration: {exc}"
            logger.warning(self.config_error)

    def _ensure_enabled(self):
        if not self.enabled:
            raise RuntimeError(self.config_error or "Cloudinary is not configured")

    def get_status(self) -> dict:
        return {
            "enabled": self.enabled,
            "mode": self.config_mode,
            "error": self.config_error,
        }

    def upload_image(self, file_path: str, folder: str = "chat/images") -> Tuple[str, str]:
        """上传图片到Cloudinary"""
        self._ensure_enabled()
        result = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            transformation=[
                {"width": 1200, "height": 1200, "crop": "limit"},
                {"quality": "auto"},
            ],
        )
        return self._extract_upload_result(result)

    def upload_audio(self, file_path: str, folder: str = "chat/audio") -> Tuple[str, str]:
        """上传音频到Cloudinary"""
        self._ensure_enabled()
        result = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            resource_type="video",  # Cloudinary将音频视为video资源
            transformation=[{"audio_codec": "mp3"}, {"bit_rate": "128k"}],
        )
        return self._extract_upload_result(result)

    def get_preview_url(self, public_id: str, width: int = 300, height: int = 200) -> str:
        """获取预览图URL"""
        url, _ = cloudinary_url(
            public_id,
            width=width,
            height=height,
            crop="fill",
            gravity="auto",
            quality="auto",
        )
        return url

    def delete_file(self, public_id: str, resource_type: str = "image") -> bool:
        """删除文件"""
        self._ensure_enabled()
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return result.get("result") == "ok"
        except Exception:
            return False

    def _extract_upload_result(self, result: dict) -> Tuple[str, str]:
        """兼容Cloudinary不同URL字段并验证关键返回值"""
        url = result.get("secure_url") or result.get("url")
        public_id = result.get("public_id")

        if not url or not public_id:
            raise ValueError("Cloudinary upload response missing required fields: url/public_id")

        return url, public_id


file_service = FileService()
