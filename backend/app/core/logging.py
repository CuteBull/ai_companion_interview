import logging
import sys
import os
from logging.handlers import RotatingFileHandler
from app.core.config import settings

def setup_logging():
    """配置应用程序日志"""

    # 从环境变量获取日志级别，默认为INFO
    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)

    # 创建日志格式
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)

    # 文件处理器（可选）
    file_handler = RotatingFileHandler(
        'app.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)  # 文件记录更详细的日志

    # 配置根日志记录器
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)  # 根日志记录器设置为DEBUG，由处理器控制实际级别
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # 设置第三方库的日志级别
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)

    # 生产环境可以添加JSON格式日志（可选）
    # if os.getenv("ENVIRONMENT") == "production":
    #     import json_log_formatter
    #     json_formatter = json_log_formatter.JSONFormatter()
    #     console_handler.setFormatter(json_formatter)

    return root_logger

logger = setup_logging()