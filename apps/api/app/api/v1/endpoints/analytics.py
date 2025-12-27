"""
Analytics Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.core.database import get_db
from app.core.config import settings
from app.schemas.analytics import (
    MatchStatsResponse,
    ShotHeatmapResponse,
    ServeAnalysisResponse,
    PlayerComparisonResponse
)
from app.services.analytics_service import AnalyticsService
from app.api.v1.endpoints.auth import oauth2_scheme
from app.services.auth_service import AuthService

router = APIRouter()


async def get_current_user_id(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> int:
    """Dependency to get current user ID"""
    auth_service = AuthService(db)
    user = auth_service.get_current_user(token)
    return user.id


@router.get("/matches/{match_id}/stats", response_model=MatchStatsResponse)
async def get_match_stats(
    match_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get comprehensive stats for a match"""
    analytics_service = AnalyticsService(db)
    stats = await analytics_service.get_match_stats(match_id, user_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Match stats not found")
    return stats


@router.post("/matches/{match_id}/mock", response_model=MatchStatsResponse)
async def generate_mock_match_stats(
    match_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Generate mock analytics for a match.

    This is a dev-only helper to populate stats before ML pipeline is ready.
    """
    analytics_service = AnalyticsService(db)
    stats = await analytics_service.generate_mock_stats(match_id, user_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Match not found")
    return stats


@router.get("/matches/{match_id}/heatmap", response_model=ShotHeatmapResponse)
async def get_shot_heatmap(
    match_id: int,
    player_number: int = None,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get shot placement heatmap for a match"""
    analytics_service = AnalyticsService(db)
    heatmap = await analytics_service.get_shot_heatmap(match_id, player_number, user_id)
    if not heatmap:
        raise HTTPException(status_code=404, detail="Heatmap data not found")
    return heatmap


@router.get("/matches/{match_id}/serves", response_model=ServeAnalysisResponse)
async def get_serve_analysis(
    match_id: int,
    player_number: int = None,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get serve analysis for a match"""
    analytics_service = AnalyticsService(db)
    analysis = await analytics_service.get_serve_analysis(match_id, player_number, user_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Serve analysis not found")
    return analysis


@router.get("/matches/{match_id}/comparison", response_model=PlayerComparisonResponse)
async def get_player_comparison(
    match_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get side-by-side player comparison"""
    analytics_service = AnalyticsService(db)
    comparison = await analytics_service.get_player_comparison(match_id, user_id)
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison data not found")
    return comparison


@router.get("/matches/{match_id}/highlights")
async def get_highlights(
    match_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get automated highlight reel timestamps"""
    analytics_service = AnalyticsService(db)
    highlights = await analytics_service.get_highlights(match_id, user_id)
    if not highlights:
        raise HTTPException(status_code=404, detail="Highlights not found")
    return highlights


async def verify_ml_service_token(x_service_token: str = Header(None, alias="X-Service-Token")):
    """Verify ML service authentication token"""
    if not x_service_token or x_service_token != settings.ML_SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid service token")
    return True


@router.post("/matches/{match_id}/save-from-ml")
async def save_ml_pipeline_results(
    match_id: int,
    analytics_data: Dict[str, Any],
    db: Session = Depends(get_db),
    _: bool = Depends(verify_ml_service_token)
):
    """
    Save analytics results from ML pipeline.
    
    This endpoint is called by the ML pipeline service after processing a video.
    Requires service token authentication via X-Service-Token header.
    """
    analytics_service = AnalyticsService(db)
    success = await analytics_service.save_ml_pipeline_results(match_id, analytics_data)
    
    if not success:
        raise HTTPException(
            status_code=500, 
            detail="Failed to save analytics results"
        )
    
    return {
        "status": "success",
        "match_id": match_id,
        "message": "Analytics results saved successfully"
    }

