from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # 数据库
    DATABASE_URL: str = "sqlite:///./chat.db"

    # Azure OpenAI
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_API_VERSION: str = "2025-01-01-preview"
    AZURE_OPENAI_TRANSCRIBE_API_VERSION: str = "2025-03-01-preview"
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o"
    AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT: str = "gpt-4o-transcribe"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str
    LOCAL_UPLOAD_DIR: str = "./uploads"
    ALLOW_LOCAL_UPLOAD_FALLBACK: bool = False

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # 安全配置
    API_KEY: str = ""
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_DEFAULT: str = "100/minute"
    REDIS_URL: str = "redis://localhost:6379/0"

    # 本地开发可用的AI模拟模式（不调用真实Azure OpenAI）
    MOCK_OPENAI: bool = False

    class Config:
        env_file = os.getenv("ENV_FILE", ".env")

settings = Settings()
