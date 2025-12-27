"""
Match and Video Models
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Float, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class MatchStatus(str, enum.Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class MatchType(str, enum.Enum):
    SINGLES = "singles"
    DOUBLES = "doubles"
    PRACTICE = "practice"


class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    match_type = Column(Enum(MatchType), default=MatchType.SINGLES)
    status = Column(Enum(MatchStatus), default=MatchStatus.UPLOADING)
    
    # Player information
    player1_name = Column(String, nullable=True)
    player2_name = Column(String, nullable=True)
    
    # Match metadata
    match_date = Column(DateTime(timezone=True), nullable=True)
    court_surface = Column(String, nullable=True)  # hard, clay, grass
    duration_minutes = Column(Float, nullable=True)
    
    # Event information
    event = Column(String, nullable=True)  # Tournament Name / Practice
    event_date = Column(DateTime(timezone=True), nullable=True)
    bracket = Column(String, nullable=True)  # Round Robin, Quarter Final, Semi Final, etc.
    uploader_notes = Column(String, nullable=True)
    
    # Processing metadata
    processing_progress = Column(Float, default=0.0)  # 0.0 to 1.0
    error_message = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="matches")
    videos = relationship("MatchVideo", back_populates="match", cascade="all, delete-orphan")
    shots = relationship("Shot", back_populates="match", cascade="all, delete-orphan")
    rallies = relationship("Rally", back_populates="match", cascade="all, delete-orphan")
    points = relationship("Point", back_populates="match", cascade="all, delete-orphan")
    serves = relationship("Serve", back_populates="match", cascade="all, delete-orphan")
    stats = relationship("MatchStats", back_populates="match", uselist=False)


class MatchVideo(Base):
    __tablename__ = "match_videos"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    
    # Video file information
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # S3 path or local path
    file_size_bytes = Column(Integer, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    resolution = Column(String, nullable=True)  # e.g., "1920x1080"
    fps = Column(Float, nullable=True)
    
    # Processing status
    is_processed = Column(Boolean, default=False)
    thumbnail_path = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    match = relationship("Match", back_populates="videos")

