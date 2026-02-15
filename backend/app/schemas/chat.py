from pydantic import BaseModel, Field
from typing import List, Optional

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    image_urls: Optional[List[str]] = None
    audio_text: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    message: str

class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    message_count: int
    preview_image: Optional[str] = None

class SessionsResponse(BaseModel):
    sessions: List[SessionResponse]
    total: int
    page: int
    limit: int


class ClearSessionsResponse(BaseModel):
    deleted_sessions: int
    deleted_messages: int
    detached_moments: int


class SessionToMomentRequest(BaseModel):
    author_name: Optional[str] = Field(default="你", max_length=40)
    author_avatar_url: Optional[str] = Field(default=None, max_length=512)
    location: Optional[str] = Field(default=None, max_length=120)
