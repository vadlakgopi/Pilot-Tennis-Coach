"""
Match Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.match import MatchStatus, MatchType


class MatchCreate(BaseModel):
    title: str
    match_type: MatchType = MatchType.SINGLES
    player1_name: Optional[str] = None
    player2_name: Optional[str] = None
    match_date: Optional[datetime] = None
    court_surface: Optional[str] = None
    event: Optional[str] = None
    event_date: Optional[datetime] = None
    bracket: Optional[str] = None
    uploader_notes: Optional[str] = None


class MatchUpdate(BaseModel):
    title: Optional[str] = None
    player1_name: Optional[str] = None
    player2_name: Optional[str] = None
    match_date: Optional[datetime] = None
    court_surface: Optional[str] = None
    event: Optional[str] = None
    event_date: Optional[datetime] = None
    bracket: Optional[str] = None
    uploader_notes: Optional[str] = None


class MatchVideoResponse(BaseModel):
    id: int
    original_filename: str
    file_size_bytes: int
    duration_seconds: Optional[float] = None
    resolution: Optional[str] = None
    fps: Optional[float] = None
    is_processed: bool = False
    thumbnail_path: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class MatchResponse(BaseModel):
    id: int
    title: str
    match_type: MatchType
    status: MatchStatus
    player1_name: Optional[str]
    player2_name: Optional[str]
    match_date: Optional[datetime]
    court_surface: Optional[str]
    duration_minutes: Optional[float]
    event: Optional[str]
    event_date: Optional[datetime]
    bracket: Optional[str]
    uploader_notes: Optional[str]
    processing_progress: float
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]
    videos: List[MatchVideoResponse] = []
    
    class Config:
        from_attributes = True


