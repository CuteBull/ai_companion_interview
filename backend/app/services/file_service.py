import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
from app.core.config import settings
from typing import Tuple, Optional

class FileService:
    def __init__(self):
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )

    def upload_image(self, file_path: str, folder: str = "chat/images") -> Tuple[str, str]:
        """上传图片到Cloudinary"""
        result = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            transformation=[
                {"width": 1200, "height": 1200, "crop": "limit"},
                {"quality": "auto"}
            ]
        )
        return self._extract_upload_result(result)

    def upload_audio(self, file_path: str, folder: str = "chat/audio") -> Tuple[str, str]:
        """上传音频到Cloudinary"""
        result = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            resource_type="video",  # Cloudinary将音频视为video资源
            transformation=[
                {"audio_codec": "mp3"},
                {"bit_rate": "128k"}
            ]
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
            quality="auto"
        )
        return url

    def delete_file(self, public_id: str, resource_type: str = "image") -> bool:
        """删除文件"""
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return result.get("result") == "ok"
        except:
            return False

    def _extract_upload_result(self, result: dict) -> Tuple[str, str]:
        """兼容Cloudinary不同URL字段并验证关键返回值"""
        url = result.get("secure_url") or result.get("url")
        public_id = result.get("public_id")

        if not url or not public_id:
            raise ValueError("Cloudinary upload response missing required fields: url/public_id")

        return url, public_id

file_service = FileService()
