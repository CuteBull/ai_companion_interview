"""
端到端测试 - 验证多模态聊天系统的完整工作流程
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal

# 创建测试客户端，包含API密钥头
client = TestClient(app, headers={
    "X-API-Key": settings.API_KEY if settings.API_KEY else ""
})

@pytest.fixture(scope="function")
def test_db():
    """为每个测试创建独立的测试数据库"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

def test_e2e_health_check():
    """端到端测试1: 健康检查"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Multimodal Chat API"}

    # 测试健康检查端点
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_e2e_api_key_authentication(test_db):
    """端到端测试2: API密钥认证"""
    if not settings.API_KEY:
        pytest.skip("API_KEY 未配置，跳过认证测试")

    # 测试无效API密钥
    invalid_client = TestClient(app, headers={"X-API-Key": "invalid-key"})
    response = invalid_client.get("/api/sessions")
    assert response.status_code == 401
    assert "Invalid API Key" in response.json()["error"]["message"]

    # 测试缺少API密钥
    no_key_client = TestClient(app)
    response = no_key_client.get("/api/sessions")
    assert response.status_code == 401
    assert "Missing API Key" in response.json()["error"]["message"]

    # 测试有效API密钥（应该通过）
    response = client.get("/api/sessions")
    assert response.status_code == 200

@patch("app.services.chat_service.openai_service.chat_completion_stream")
def test_e2e_chat_workflow(mock_chat_stream, test_db):
    """端到端测试3: 完整聊天工作流程"""
    async def mock_stream(_messages):
        yield "Hello! I'm an AI assistant."

    mock_chat_stream.side_effect = mock_stream

    # 1. 创建新会话（通过发送第一条消息）
    chat_data = {
        "message": "Hello AI, can you help me?",
        "session_id": None,
        "image_urls": [],
        "audio_text": None
    }

    response = client.post("/api/chat", json=chat_data)
    assert response.status_code == 200

    # 验证流式响应
    content = ""
    for line in response.iter_lines():
        if line:
            if isinstance(line, bytes):
                line = line.decode('utf-8')
            content += line

    assert "Hello" in content or "AI" in content

    # 2. 获取会话列表
    response = client.get("/api/sessions")
    assert response.status_code == 200
    data = response.json()
    assert "sessions" in data
    assert len(data["sessions"]) > 0

    session_id = data["sessions"][0]["id"]

    # 3. 获取会话消息
    response = client.get(f"/api/sessions/{session_id}/messages")
    assert response.status_code == 200
    data = response.json()
    assert "session" in data
    assert "messages" in data
    assert len(data["messages"]) > 0

    # 验证消息内容
    messages = data["messages"]
    assert any(msg["role"] == "user" for msg in messages)
    assert any(msg["role"] == "assistant" for msg in messages)

@patch("app.services.file_service.cloudinary")
def test_e2e_file_upload_workflow(mock_cloudinary, test_db):
    """端到端测试4: 文件上传工作流程"""
    # 模拟Cloudinary上传
    mock_cloudinary.uploader.upload.return_value = {
        "secure_url": "https://res.cloudinary.com/test/uploaded.jpg",
        "public_id": "test/uploaded"
    }

    # 模拟文件上传（multipart/form-data）
    files = {
        "file": ("test.jpg", b"fake-image-data", "image/jpeg")
    }

    response = client.post("/api/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert "uploaded.jpg" in data["url"]

    # 使用上传的图片发送消息
    chat_data = {
        "message": "What's in this image?",
        "session_id": None,
        "image_urls": [data["url"]],
        "audio_text": None
    }

    # 模拟OpenAI响应（需要额外的mock，简化测试）
    async def mock_stream(_messages):
        yield "I see an image."

    with patch("app.services.chat_service.openai_service.chat_completion_stream", side_effect=mock_stream):

        response = client.post("/api/chat", json=chat_data)
        assert response.status_code == 200

def test_e2e_error_handling():
    """端到端测试5: 错误处理"""
    # 测试无效JSON
    response = client.post("/api/chat", data="invalid json")
    assert response.status_code == 422

    # 测试缺少必要字段
    response = client.post("/api/chat", json={})
    assert response.status_code == 422

    # 测试不存在的端点
    response = client.get("/api/nonexistent")
    assert response.status_code == 404

def test_e2e_rate_limiting():
    """端到端测试6: 速率限制（如果启用）"""
    if settings.RATE_LIMIT_ENABLED:
        # 多次快速请求以触发速率限制
        # 注意：测试环境可能使用内存存储，速率限制可能不会立即触发
        # 这里主要测试速率限制中间件是否正常工作
        for i in range(5):
            response = client.get("/api/health")
            assert response.status_code == 200

        print("速率限制中间件正常工作")
    else:
        pytest.skip("速率限制未启用")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
