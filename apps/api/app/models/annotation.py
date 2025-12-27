"""
Annotation Model for Coaching Features
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Annotation(Base):
    __tablename__ = "annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Annotation data
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    timestamp_start = Column(DateTime, nullable=False)
    timestamp_end = Column(DateTime, nullable=True)
    
    # Annotation type and tags
    annotation_type = Column(String, nullable=True)  # error, highlight, tip, etc.
    tags = Column(JSON, nullable=True)  # Array of tags
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    coach = relationship("User", back_populates="annotations")






