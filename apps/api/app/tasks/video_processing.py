"""
Video Processing Tasks
"""
try:
    from app.core.celery_app import celery_app
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    # Create a dummy celery_app for when Celery is not installed
    celery_app = None

from app.core.config import settings
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    requests = None

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.match import Match, MatchStatus

def _process_match_video_impl(match_id: int, video_path: str):
    """
    Process match video through ML pipeline (internal implementation)
    """
    db: Session = SessionLocal()
    try:
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            return {"error": "Match not found"}
        
        # Update status to analyzing
        match.status = MatchStatus.ANALYZING
        match.processing_progress = 0.1
        db.commit()
        
        # Call ML service to process video
        if not REQUESTS_AVAILABLE:
            raise ImportError("requests module is required for ML service integration")
        
        ml_service_url = f"{settings.ML_SERVICE_URL}/process"
        response = requests.post(
            ml_service_url,
            json={
                "match_id": match_id,
                "video_path": video_path
            },
            timeout=3600  # 1 hour timeout
        )
        
        if response.status_code == 200:
            # Update match status
            match.status = MatchStatus.COMPLETED
            match.processing_progress = 1.0
            db.commit()
            return {"status": "completed", "match_id": match_id}
        else:
            match.status = MatchStatus.FAILED
            match.error_message = f"ML service error: {response.text}"
            db.commit()
            return {"error": "Processing failed"}
    
    except Exception as e:
        db.rollback()
        match = db.query(Match).filter(Match.id == match_id).first()
        if match:
            match.status = MatchStatus.FAILED
            match.error_message = str(e)
            db.commit()
        return {"error": str(e)}
    finally:
        db.close()


# Conditionally decorate with Celery task decorator if available
if CELERY_AVAILABLE and celery_app:
    process_match_video = celery_app.task(bind=True, name="process_match_video")(_process_match_video_impl)
else:
    # If Celery is not available, use the function directly
    process_match_video = _process_match_video_impl
