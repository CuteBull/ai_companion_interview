from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
import uuid
from app.core.database import Base

class File(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    public_id = Column(String, nullable=False)  # Cloudinary public_id
    url = Column(String, nullable=False)
    format = Column(String, nullable=False)  # "jpg", "png", "mp3", "wav"
    size = Column(Integer, nullable=False)  # bytes
    uploaded_at = Column(DateTime, default=datetime.utcnow)