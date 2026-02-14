from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import FastAPI, Request
from app.core.config import settings

# 初始化速率限制器
if settings.RATE_LIMIT_ENABLED:
    # 配置存储URI
    storage_uri = None
    storage_options = {}

    if settings.REDIS_URL:
        storage_uri = settings.REDIS_URL
        # Redis存储选项
        storage_options = {"socket_timeout": "5", "socket_connect_timeout": "5"}

    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[settings.RATE_LIMIT_DEFAULT],
        storage_uri=storage_uri,
        storage_options=storage_options,
        in_memory_fallback_enabled=True,  # Redis失败时回退到内存
        swallow_errors=True  # 存储错误不中断请求
    )
else:
    # 禁用速率限制时使用空限制器
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[],
        enabled=False
    )

def init_rate_limit(app: FastAPI):
    """初始化速率限制中间件"""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)