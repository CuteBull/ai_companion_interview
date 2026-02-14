# backend/app/api/endpoints/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("")
async def health_check():
    """基础健康检查"""
    return {
        "status": "healthy",
        "service": "multimodal-chat-api",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@router.get("/db")
async def health_check_db(db: Session = Depends(get_db)):
    """数据库健康检查"""
    try:
        # 执行简单的SQL查询检查数据库连接
        result = db.execute(text("SELECT 1"))
        db_ok = result.scalar() == 1
        return {
            "status": "healthy" if db_ok else "unhealthy",
            "database": "connected" if db_ok else "disconnected",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        logger.error(f"数据库健康检查失败: {str(e)}", exc_info=True)
        return {
            "status": "unhealthy",
            "database": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

@router.get("/services")
async def health_check_services():
    """外部服务健康检查（占位符）"""
    # 在实际实现中，这里应检查Azure OpenAI、Cloudinary等外部服务
    return {
        "status": "healthy",
        "services": {
            "azure_openai": "connected",
            "cloudinary": "connected"
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }