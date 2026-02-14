import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.core.config import settings
from app.models.session import Session as SessionModel
from app.models.message import Message as MessageModel
from app.api.endpoints import upload as upload_endpoint
from app.services import chat_service
from app.services.file_service import FileService
from app.services.openai_service import openai_service

# 创建测试客户端，包含API密钥头
client = TestClient(app, headers={
    "X-API-Key": settings.API_KEY if settings.API_KEY else ""
})

@pytest.fixture(scope="function")
def test_db():
    """为每个测试创建独立的测试数据库"""
    # 创建表
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    # 清理
    db.close()
    Base.metadata.drop_all(bind=engine)

def test_root():
    """测试根端点"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Multimodal Chat API"}

def test_health_endpoints():
    """测试健康检查端点"""
    # 基础健康检查
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "multimodal-chat-api"

    # 数据库健康检查
    response = client.get("/api/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["database"] in ["connected", "disconnected", "error"]

def test_sessions_endpoint(test_db):
    """测试会话列表端点"""
    # 创建测试会话
    session = SessionModel()
    test_db.add(session)
    test_db.commit()

    response = client.get("/api/sessions")
    assert response.status_code == 200
    data = response.json()
    assert "sessions" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data

def test_session_messages_endpoint(test_db):
    """测试会话消息端点"""
    # 创建测试会话和消息
    session = SessionModel()
    test_db.add(session)
    test_db.commit()

    message = MessageModel(
        session_id=session.id,
        role="user",
        content="Test message"
    )
    test_db.add(message)
    test_db.commit()

    response = client.get(f"/api/sessions/{session.id}/messages")
    assert response.status_code == 200
    data = response.json()
    assert "session" in data
    assert "messages" in data
    assert len(data["messages"]) == 1
    assert data["messages"][0]["content"] == "Test message"

def test_upload_endpoint():
    """测试文件上传端点（模拟）"""
    # 注意：实际测试需要模拟文件上传
    # 这里只测试端点存在性
    response = client.get("/api/upload")
    # POST端点应存在，GET可能返回405
    assert response.status_code in [200, 404, 405]

def test_upload_endpoint_falls_back_to_local_storage(test_db, monkeypatch, tmp_path):
    """测试Cloudinary失败时回退本地上传"""
    monkeypatch.setattr(settings, "LOCAL_UPLOAD_DIR", str(tmp_path))

    def mock_failed_upload(_tmp_path):
        raise RuntimeError("cloudinary failed")

    monkeypatch.setattr(upload_endpoint.file_service, "upload_image", mock_failed_upload)

    files = {"file": ("test.png", b"fake-image-data", "image/png")}
    response = client.post("/api/upload", files=files)

    assert response.status_code == 200
    data = response.json()
    assert "/uploads/images/" in data["url"]
    assert data["public_id"].startswith("local/images/")

def test_chat_stream_endpoint(test_db, monkeypatch):
    """测试聊天流式端点"""
    async def mock_stream(_messages):
        yield "Mock stream response"

    monkeypatch.setattr(chat_service.openai_service, "chat_completion_stream", mock_stream)

    # 测试基本的流式响应
    response = client.post(
        "/api/chat",
        json={
            "message": "Hello",
            "session_id": None,
            "image_urls": [],
            "audio_text": None
        }
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    # 验证响应是流式的
    content = response.content.decode('utf-8')
    assert "data: session:" in content
    assert "data: Mock stream response" in content

def test_error_handling():
    """测试错误处理"""
    # 测试无效的JSON
    response = client.post("/api/chat", data="invalid json")
    assert response.status_code == 422  # 验证错误

    # 测试不存在的端点
    response = client.get("/api/nonexistent")
    assert response.status_code == 404

# 测试模型和服务
def test_models():
    """测试数据模型"""
    session = SessionModel()
    assert hasattr(session, 'id')
    assert hasattr(session, 'title')
    assert hasattr(session, 'created_at')
    assert hasattr(session, 'updated_at')
    assert hasattr(session, 'messages')

    message = MessageModel(
        session_id="test",
        role="user",
        content="Test"
    )
    assert hasattr(message, 'id')
    assert hasattr(message, 'session_id')
    assert hasattr(message, 'role')
    assert hasattr(message, 'content')
    assert hasattr(message, 'image_urls')
    assert hasattr(message, 'audio_text')
    assert hasattr(message, 'created_at')

def test_file_service_extract_upload_result_supports_secure_url():
    """测试Cloudinary返回secure_url字段"""
    service = FileService()
    url, public_id = service._extract_upload_result({
        "secure_url": "https://example.com/secure.jpg",
        "public_id": "secure-id",
    })
    assert url == "https://example.com/secure.jpg"
    assert public_id == "secure-id"

def test_file_service_extract_upload_result_supports_url_fallback():
    """测试Cloudinary返回url字段回退"""
    service = FileService()
    url, public_id = service._extract_upload_result({
        "url": "http://example.com/plain.jpg",
        "public_id": "plain-id",
    })
    assert url == "http://example.com/plain.jpg"
    assert public_id == "plain-id"

def test_file_service_extract_upload_result_raises_on_missing_fields():
    """测试Cloudinary返回缺失关键字段时抛错"""
    service = FileService()
    with pytest.raises(ValueError):
        service._extract_upload_result({"secure_url": "https://example.com/no-id.jpg"})

def test_openai_service_prepare_image_url_for_local_upload(tmp_path, monkeypatch):
    """测试本地上传图片URL会被转换为data URL"""
    monkeypatch.setattr(settings, "LOCAL_UPLOAD_DIR", str(tmp_path))
    local_image = tmp_path / "images" / "sample.png"
    local_image.parent.mkdir(parents=True, exist_ok=True)
    local_image.write_bytes(b"\x89PNG\r\n\x1a\n")

    prepared_url = openai_service._prepare_image_url(
        "http://127.0.0.1:8000/uploads/images/sample.png"
    )
    assert prepared_url.startswith("data:image/png;base64,")

# 创建配置文件
# tests/conftest.py
from unittest.mock import AsyncMock, Mock

@pytest.fixture
def mock_openai_service():
    """模拟OpenAI服务"""
    mock = AsyncMock()
    mock.chat_completion_stream = AsyncMock(return_value=AsyncMock())
    mock.transcribe_audio = AsyncMock(return_value="Mock transcription")
    return mock

@pytest.fixture
def mock_file_service():
    """模拟文件服务"""
    mock = Mock()
    mock.upload_image = Mock(return_value=("http://mock.url/image.jpg", "mock_public_id"))
    mock.upload_audio = Mock(return_value=("http://mock.url/audio.mp3", "mock_public_id"))
    return mock
