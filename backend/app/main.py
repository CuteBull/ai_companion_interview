from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.api.endpoints import chat, upload, sessions, health
from app.core.config import settings
from app.middleware import init_error_handlers, init_rate_limit, api_key_middleware as auth_middleware

app = FastAPI(title="Multimodal Chat API", version="0.1.0")

uploads_dir = Path(settings.LOCAL_UPLOAD_DIR)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploaded_file")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API密钥验证中间件
app.middleware("http")(auth_middleware)

# 初始化错误处理
init_error_handlers(app)

# 初始化速率限制
init_rate_limit(app)

# 注册路由
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(health.router, prefix="/api/health", tags=["health"])

@app.get("/")
async def root():
    return {"message": "Multimodal Chat API"}
