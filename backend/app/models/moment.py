from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Moment(Base):
    __tablename__ = "moments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    author_name = Column(String, nullable=False, default="你")
    author_avatar_url = Column(String, nullable=True)
    content = Column(Text, nullable=False, default="")
    image_urls = Column(JSON, nullable=True)
    location = Column(String, nullable=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    likes = relationship("MomentLike", back_populates="moment", cascade="all, delete-orphan")
    comments = relationship("MomentComment", back_populates="moment", cascade="all, delete-orphan")


class MomentLike(Base):
    __tablename__ = "moment_likes"
    __table_args__ = (
        UniqueConstraint("moment_id", "user_name", name="uq_moment_like_user"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    moment_id = Column(String, ForeignKey("moments.id", ondelete="CASCADE"), nullable=False)
    user_name = Column(String, nullable=False, default="你")
    created_at = Column(DateTime, default=datetime.utcnow)

    moment = relationship("Moment", back_populates="likes")


class MomentComment(Base):
    __tablename__ = "moment_comments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    moment_id = Column(String, ForeignKey("moments.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(String, ForeignKey("moment_comments.id", ondelete="CASCADE"), nullable=True)
    user_name = Column(String, nullable=False, default="你")
    reply_to_name = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    moment = relationship("Moment", back_populates="comments")
    parent = relationship("MomentComment", remote_side=[id], backref="replies")
