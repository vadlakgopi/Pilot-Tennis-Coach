"""
FastAPI Main Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import SessionLocal
from app.api.v1.router import api_router
from app.models.user import User
from app.schemas.auth import UserCreate
from app.services.auth_service import AuthService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create test user on startup if it doesn't exist"""
    if SessionLocal:
        try:
            db = SessionLocal()
            try:
                if db.query(User).filter(User.username == "testuser").first() is None:
                    auth_service = AuthService(db)
                    auth_service.register_user(
                        UserCreate(email="test@example.com", username="testuser", password="testpassword123")
                    )
            finally:
                db.close()
        except Exception:
            pass
    yield


app = FastAPI(
    title="Tennis Buddy API",
    description="API for tennis match video analytics and insights",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Tennis Buddy API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



