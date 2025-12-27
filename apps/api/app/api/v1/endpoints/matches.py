"""
Match Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.match import MatchCreate, MatchResponse, MatchUpdate
from app.services.match_service import MatchService
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


@router.post("/", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
async def create_match(
    match_data: MatchCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new match"""
    match_service = MatchService(db)
    return match_service.create_match(match_data, user_id)


@router.get("/", response_model=List[MatchResponse])
async def list_matches(
    skip: int = 0,
    limit: int = 20,
    sort_by: Optional[str] = Query(None, description="Sort by field: 'created_at' or 'event_date'"),
    sort_order: str = Query("desc", description="Sort order: 'asc' or 'desc'"),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """List all matches for the current user"""
    match_service = MatchService(db)
    return match_service.list_matches(user_id, skip=skip, limit=limit, sort_by=sort_by, sort_order=sort_order)


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get a specific match by ID"""
    match_service = MatchService(db)
    match = match_service.get_match(match_id, user_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.put("/{match_id}", response_model=MatchResponse)
async def update_match(
    match_id: int,
    match_data: MatchUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update a match"""
    match_service = MatchService(db)
    match = match_service.update_match(match_id, match_data, user_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_match(
    match_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a match"""
    match_service = MatchService(db)
    success = match_service.delete_match(match_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Match not found")


@router.post("/{match_id}/upload", response_model=MatchResponse)
async def upload_match_video(
    match_id: int,
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Upload video for a match"""
    try:
        match_service = MatchService(db)
        return await match_service.upload_video(match_id, file, user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video upload failed: {str(e)}"
        )

