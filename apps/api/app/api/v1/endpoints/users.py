"""
User Management Endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import UserService
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


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    user_service = UserService(db)
    return await user_service.get_user(user_id)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    user_service = UserService(db)
    return await user_service.update_user(user_id, user_data)



