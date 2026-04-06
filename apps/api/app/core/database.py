"""
Database Configuration and Session Management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Create engine with connection pooling
try:
    connect_args = {}
    if "postgresql" in settings.DATABASE_URL:
        connect_args = {"connect_timeout": 5}
    elif "sqlite" in settings.DATABASE_URL:
        connect_args = {"check_same_thread": False}
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10 if "postgresql" in settings.DATABASE_URL else 1,
        max_overflow=20 if "postgresql" in settings.DATABASE_URL else 0,
        connect_args=connect_args,
    )
except Exception as e:
    print(f"Warning: Could not create database engine: {e}")
    engine = None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None

Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    if not SessionLocal:
        raise Exception("Database not configured. Please check your DATABASE_URL.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

