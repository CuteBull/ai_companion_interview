from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
from app.core.config import settings

async def api_key_middleware(request: Request, call_next):
    """API密钥验证中间件"""
    # 跳过健康检查端点
    if request.url.path.startswith("/api/health") or request.url.path == "/":
        return await call_next(request)

    # 如果未配置API_KEY，跳过验证
    if not settings.API_KEY:
        return await call_next(request)

    # 检查API密钥
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "error": {
                    "code": "MISSING_API_KEY",
                    "message": "Missing API Key",
                    "details": None
                }
            }
        )

    if api_key != settings.API_KEY:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "error": {
                    "code": "INVALID_API_KEY",
                    "message": "Invalid API Key",
                    "details": None
                }
            }
        )

    return await call_next(request)