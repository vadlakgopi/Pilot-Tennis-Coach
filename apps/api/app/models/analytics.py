"""
Analytics Models - Shots, Rallies, Points, Serves, etc.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Float, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from typing import Tuple
import enum
from app.core.database import Base


class ShotType(str, enum.Enum):
    FOREHAND = "forehand"
    BACKHAND = "backhand"
    VOLLEY = "volley"
    SLICE = "slice"
    DROP_SHOT = "drop_shot"
    OVERHEAD = "overhead"
    SERVE = "serve"
    RETURN = "return"


class ShotOutcome(str, enum.Enum):
    WINNER = "winner"
    ERROR = "error"
    UNFORCED_ERROR = "unforced_error"
    FORCED_ERROR = "forced_error"
    IN_PLAY = "in_play"
    LET = "let"
    FAULT = "fault"
    ACE = "ace"


class Shot(Base):
    __tablename__ = "shots"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    rally_id = Column(Integer, ForeignKey("rallies.id"), nullable=True)
    
    # Player identification
    player_number = Column(Integer, nullable=False)  # 1 or 2
    shot_type = Column(Enum(ShotType), nullable=False)
    outcome = Column(Enum(ShotOutcome), nullable=True)
    
    # Timing
    timestamp_seconds = Column(Float, nullable=False)
    frame_number = Column(Integer, nullable=True)
    
    # Court position
    court_x = Column(Float, nullable=True)  # Normalized court coordinates
    court_y = Column(Float, nullable=True)
    
    # Shot characteristics
    direction = Column(String, nullable=True)  # cross-court, down-the-line, etc.
    spin_type = Column(String, nullable=True)  # flat, topspin, slice
    speed_estimate = Column(Float, nullable=True)  # mph or km/h
    
    # Pose/mechanics data (stored as JSON)
    pose_keypoints = Column(JSON, nullable=True)
    swing_phase = Column(String, nullable=True)  # preparation, contact, follow_through
    
    # Ball trajectory (stored as JSON array of points)
    ball_trajectory = Column(JSON, nullable=True)
    
    # Metadata
    confidence_score = Column(Float, nullable=True)  # ML model confidence
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    match = relationship("Match", back_populates="shots")
    rally = relationship("Rally", back_populates="shots")


class Rally(Base):
    __tablename__ = "rallies"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    point_id = Column(Integer, ForeignKey("points.id"), nullable=True)
    
    # Rally characteristics
    start_time = Column(Float, nullable=False)  # seconds from match start
    end_time = Column(Float, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    shot_count = Column(Integer, nullable=False)
    
    # Outcome
    winner_player = Column(Integer, nullable=True)  # 1 or 2
    ended_by = Column(String, nullable=True)  # winner, error, etc.
    
    # Relationships
    match = relationship("Match", back_populates="rallies")
    point = relationship("Point", back_populates="rallies")
    shots = relationship("Shot", back_populates="rally")


class Point(Base):
    __tablename__ = "points"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    
    # Point identification
    set_number = Column(Integer, nullable=True)
    game_number = Column(Integer, nullable=True)
    point_number = Column(Integer, nullable=True)
    
    # Point outcome
    winner_player = Column(Integer, nullable=True)  # 1 or 2
    point_type = Column(String, nullable=True)  # serve, rally, etc.
    
    # Timing
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    
    # Score at point end (stored as JSON)
    score = Column(JSON, nullable=True)
    
    # Relationships
    match = relationship("Match", back_populates="points")
    rallies = relationship("Rally", back_populates="point")
    serves = relationship("Serve", back_populates="point")


class Serve(Base):
    __tablename__ = "serves"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    point_id = Column(Integer, ForeignKey("points.id"), nullable=True)
    shot_id = Column(Integer, ForeignKey("shots.id"), nullable=True)
    
    # Serve identification
    player_number = Column(Integer, nullable=False)
    serve_number = Column(Integer, nullable=False)  # 1st or 2nd serve
    
    # Serve characteristics
    serve_type = Column(String, nullable=True)  # flat, slice, kick
    placement = Column(String, nullable=True)  # wide, T, body
    speed_estimate = Column(Float, nullable=True)  # mph
    
    # Outcome
    is_fault = Column(Boolean, default=False)
    is_ace = Column(Boolean, default=False)
    is_double_fault = Column(Boolean, default=False)
    is_winner = Column(Boolean, default=False)
    
    # Court position
    serve_box = Column(String, nullable=True)  # deuce, ad
    landing_x = Column(Float, nullable=True)
    landing_y = Column(Float, nullable=True)
    
    # Timing
    timestamp_seconds = Column(Float, nullable=False)
    
    # Relationships
    match = relationship("Match", back_populates="serves")
    point = relationship("Point", back_populates="serves")


class PlayerMovement(Base):
    __tablename__ = "player_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    
    # Player identification
    player_number = Column(Integer, nullable=False)
    
    # Movement data
    timestamp_seconds = Column(Float, nullable=False)
    court_x = Column(Float, nullable=True)
    court_y = Column(Float, nullable=True)
    
    # Movement metrics
    speed = Column(Float, nullable=True)  # m/s
    acceleration = Column(Float, nullable=True)  # m/s²
    distance_from_center = Column(Float, nullable=True)
    
    # Pose keypoints (stored as JSON)
    pose_keypoints = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MatchStats(Base):
    __tablename__ = "match_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, unique=True)
    
    # Overall match stats (stored as JSON for flexibility)
    player1_stats = Column(JSON, nullable=False)
    player2_stats = Column(JSON, nullable=False)
    
    # Aggregated metrics
    total_points = Column(Integer, nullable=True)
    total_rallies = Column(Integer, nullable=True)
    total_shots = Column(Integer, nullable=True)
    
    # Heatmap data (stored as JSON)
    player1_heatmap = Column(JSON, nullable=True)
    player2_heatmap = Column(JSON, nullable=True)
    
    # Generated highlights (array of video clip timestamps)
    highlights = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    match = relationship("Match", back_populates="stats")

