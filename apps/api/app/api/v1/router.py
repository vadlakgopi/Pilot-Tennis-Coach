"""
Main API Router - Aggregates all v1 endpoints
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, matches, analytics, videos, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(matches.router, prefix="/matches", tags=["matches"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])






