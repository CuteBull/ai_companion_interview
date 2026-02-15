import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.core.config import settings
from app.models.session import Session as SessionModel
from app.models.message import Message as MessageModel
from app.models.moment import Moment as MomentModel
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


def test_create_moment_from_history_session(test_db, monkeypatch):
    """测试从历史对话一键生成朋友圈"""
    session = SessionModel(title="晚安前聊聊")
    test_db.add(session)
    test_db.commit()

    test_db.add_all([
        MessageModel(
            session_id=session.id,
            role="user",
            content="我今天有点累",
            image_urls=["https://example.com/m1.jpg"],
        ),
        MessageModel(
            session_id=session.id,
            role="assistant",
            content="抱抱你，辛苦了。",
        ),
        MessageModel(
            session_id=session.id,
            role="user",
            content="但和你聊完轻松很多",
            image_urls=["https://example.com/m1.jpg", "https://example.com/m2.jpg"],
        ),
        MessageModel(
            session_id=session.id,
            role="user",
            content="准备早点睡啦",
        ),
    ])
    test_db.commit()

    async def mock_generate_moment_copy(_messages, _fallback_title=None):
        return "宝宝小绿便只是小插曲，松口气，日子依旧温柔🍼"

    monkeypatch.setattr(openai_service, "generate_moment_copy", mock_generate_moment_copy)

    response = client.post(
        f"/api/sessions/{session.id}/moment",
        json={
            "author_name": "你",
            "author_avatar_url": "/assistant-avatar.svg",
            "location": "上海",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session.id
    assert data["content"] == "宝宝小绿便只是小插曲，松口气，日子依旧温柔🍼"
    assert data["image_urls"] == ["https://example.com/m1.jpg", "https://example.com/m2.jpg"]
    assert data["location"] == "上海"
    assert data["like_count"] == 0
    assert data["comment_count"] == 1
    assert data["likes"] == []
    assert len(data["comments"]) == 1
    assert data["comments"][0]["user_name"] == "AI陪伴助手"
    assert data["comments"][0]["content"] == "抱抱你，辛苦了。"

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
    monkeypatch.setattr(settings, "ALLOW_LOCAL_UPLOAD_FALLBACK", True)

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


def test_moments_workflow(test_db):
    """测试朋友圈动态发布、点赞和评论回复流程"""
    create_response = client.post(
        "/api/moments",
        json={
            "content": "今天风很舒服，适合散步。",
            "image_urls": ["https://example.com/a.jpg", "https://example.com/b.jpg"],
            "location": "杭州",
            "author_avatar_url": "/avatar-mint.svg",
        },
    )
    assert create_response.status_code == 200
    moment = create_response.json()
    moment_id = moment["id"]
    assert moment["content"] == "今天风很舒服，适合散步。"
    assert moment["author_avatar_url"] == "/avatar-mint.svg"
    assert len(moment["image_urls"]) == 2
    assert moment["like_count"] == 0
    assert moment["comment_count"] == 0

    list_response = client.get("/api/moments")
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert len(list_data["moments"]) >= 1
    assert list_data["moments"][0]["id"] == moment_id

    like_response = client.post(f"/api/moments/{moment_id}/likes/toggle", json={"user_name": "你"})
    assert like_response.status_code == 200
    like_data = like_response.json()
    assert like_data["liked"] is True
    assert like_data["like_count"] == 1
    assert like_data["likes"] == ["你"]

    unlike_response = client.post(f"/api/moments/{moment_id}/likes/toggle", json={"user_name": "你"})
    assert unlike_response.status_code == 200
    unlike_data = unlike_response.json()
    assert unlike_data["liked"] is False
    assert unlike_data["like_count"] == 0
    assert unlike_data["likes"] == []

    comment_response = client.post(
        f"/api/moments/{moment_id}/comments",
        json={"content": "抱抱你，明天会更好。", "user_name": "AI陪伴助手"},
    )
    assert comment_response.status_code == 200
    comment_data = comment_response.json()
    assert comment_data["user_name"] == "AI陪伴助手"

    reply_response = client.post(
        f"/api/moments/{moment_id}/comments",
        json={
            "content": "谢谢你，我感觉好多了。",
            "parent_id": comment_data["id"],
            "reply_to_name": "AI陪伴助手",
            "user_name": "你",
        },
    )
    assert reply_response.status_code == 200
    reply_data = reply_response.json()
    assert reply_data["parent_id"] == comment_data["id"]
    assert reply_data["reply_to_name"] == "AI陪伴助手"

    refreshed = client.get("/api/moments").json()["moments"][0]
    assert refreshed["comment_count"] == 2
    assert len(refreshed["comments"]) == 2

    avatar_update = client.patch(
        "/api/moments/avatar",
        json={"user_name": "你", "author_avatar_url": "https://example.com/new-avatar.png"},
    )
    assert avatar_update.status_code == 200
    assert avatar_update.json()["updated_count"] >= 1

    refreshed_after_avatar = client.get("/api/moments").json()["moments"][0]
    assert refreshed_after_avatar["author_avatar_url"] == "https://example.com/new-avatar.png"

    forbidden_delete = client.delete(f"/api/moments/{moment_id}", params={"user_name": "别人"})
    assert forbidden_delete.status_code == 403

    delete_response = client.delete(f"/api/moments/{moment_id}", params={"user_name": "你"})
    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] is True

    after_delete = client.get("/api/moments").json()
    assert all(item["id"] != moment_id for item in after_delete["moments"])


def test_moments_endpoint_filters_missing_local_media(test_db, monkeypatch, tmp_path):
    """本地上传URL若文件不存在，应从返回中剔除，避免前端出现坏图"""
    monkeypatch.setattr(settings, "LOCAL_UPLOAD_DIR", str(tmp_path))

    moment = MomentModel(
        author_name="你",
        author_avatar_url="/uploads/images/missing-avatar.png",
        content="测试坏图过滤",
        image_urls=["/uploads/images/missing-1.png", "https://example.com/ok.png"],
    )
    test_db.add(moment)
    test_db.commit()

    data = client.get("/api/moments").json()
    item = next(row for row in data["moments"] if row["id"] == moment.id)

    assert item["author_avatar_url"] is None
    assert item["image_urls"] == ["https://example.com/ok.png"]

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
