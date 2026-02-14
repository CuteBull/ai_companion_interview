from typing import List, Optional

from pydantic import BaseModel, Field


class MomentCreateRequest(BaseModel):
    content: str = Field(default="", max_length=2000)
    image_urls: Optional[List[str]] = None
    location: Optional[str] = Field(default=None, max_length=120)
    author_name: Optional[str] = Field(default="你", max_length=40)
    author_avatar_url: Optional[str] = Field(default=None, max_length=512)
    session_id: Optional[str] = None


class MomentLikeToggleRequest(BaseModel):
    user_name: Optional[str] = Field(default="你", max_length=40)


class MomentCommentCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[str] = None
    reply_to_name: Optional[str] = Field(default=None, max_length=40)
    user_name: Optional[str] = Field(default="你", max_length=40)


class MomentCommentResponse(BaseModel):
    id: str
    moment_id: str
    parent_id: Optional[str] = None
    user_name: str
    reply_to_name: Optional[str] = None
    content: str
    created_at: str


class MomentResponse(BaseModel):
    id: str
    author_name: str
    author_avatar_url: Optional[str] = None
    content: str
    image_urls: List[str]
    location: Optional[str] = None
    session_id: Optional[str] = None
    created_at: str
    like_count: int
    comment_count: int
    likes: List[str]
    liked_by_me: bool
    comments: List[MomentCommentResponse]


class MomentsListResponse(BaseModel):
    moments: List[MomentResponse]
    total: int
    page: int
    limit: int
    has_more: bool


class MomentLikeToggleResponse(BaseModel):
    moment_id: str
    liked: bool
    like_count: int
    likes: List[str]


class MomentDeleteResponse(BaseModel):
    moment_id: str
    deleted: bool
