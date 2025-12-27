"""
User Service
"""
from sqlalchemy.orm import Session
from typing import Optional
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

class UserService:
    def __init__(self, db: Session):
        self.db = db
    
    async def get_user(self, user_id: int) -> UserResponse:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        return UserResponse.model_validate(user)
    
    async def update_user(self, user_id: int, user_data: UserUpdate) -> UserResponse:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        self.db.commit()
        self.db.refresh(user)
        return UserResponse.model_validate(user)

