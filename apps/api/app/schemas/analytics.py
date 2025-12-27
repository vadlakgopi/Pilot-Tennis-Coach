"""
Analytics Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.models.analytics import ShotType, ShotOutcome


class ShotHeatmapResponse(BaseModel):
    match_id: int
    player_number: Optional[int]
    heatmap_data: List[Dict[str, Any]]  # Array of {x, y, intensity} points
    total_shots: int


class ServeAnalysisResponse(BaseModel):
    match_id: int
    player_number: Optional[int]
    first_serve_percentage: float
    second_serve_percentage: float
    ace_count: int
    double_fault_count: int
    average_speed: Optional[float]
    placement_distribution: Dict[str, int]  # wide, T, body
    points_won_on_serve: Dict[str, int]  # first_serve, second_serve


class PlayerStats(BaseModel):
    player_number: int
    total_points: int
    points_won: int
    winners: int
    errors: int
    unforced_errors: int
    forced_errors: int
    shot_distribution: Dict[str, int]  # shot_type -> count
    court_coverage: float  # percentage
    average_rally_length: float


class MatchStatsResponse(BaseModel):
    match_id: int
    player1_stats: PlayerStats
    player2_stats: PlayerStats
    total_rallies: int
    longest_rally: int
    match_duration_minutes: Optional[float]


class PlayerComparisonResponse(BaseModel):
    match_id: int
    player1_stats: PlayerStats
    player2_stats: PlayerStats
    comparison_metrics: Dict[str, Any]  # Additional comparison data


class Highlight(BaseModel):
    timestamp_start: float
    timestamp_end: float
    highlight_type: str  # winner, ace, rally, etc.
    description: str
    player_number: Optional[int]


class HighlightsResponse(BaseModel):
    match_id: int
    highlights: List[Highlight]






