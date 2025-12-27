"""
Match Service
"""
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.models.match import Match, MatchVideo, MatchStatus
from app.schemas.match import MatchCreate, MatchUpdate, MatchResponse
from app.services.video_service import VideoService
from app.tasks.video_processing import process_match_video

class MatchService:
    def __init__(self, db: Session):
        self.db = db
        self.video_service = VideoService(db)
    
    def compute_match_status(self, match: Match) -> MatchStatus:
        """
        Compute match status based on video and analytics availability:
        - UPLOADING: No videos uploaded yet
        - ANALYZING: Videos uploaded but no analytics
        - COMPLETED (Ready): Videos uploaded and analytics available
        """
        # Check if videos exist
        has_videos = match.videos and len(match.videos) > 0
        
        # Check if analytics exist
        has_analytics = match.stats is not None
        
        if has_analytics:
            return MatchStatus.COMPLETED  # Ready - upload complete and analytics available
        elif has_videos:
            return MatchStatus.ANALYZING  # Analyzing - uploaded, analytics pending
        else:
            return MatchStatus.UPLOADING  # Uploading - video upload in progress
    
    def create_match(self, match_data: MatchCreate, user_id: int) -> MatchResponse:
        db_match = Match(
            user_id=user_id,
            title=match_data.title,
            match_type=match_data.match_type,
            player1_name=match_data.player1_name,
            player2_name=match_data.player2_name,
            match_date=match_data.match_date,
            court_surface=match_data.court_surface,
            event=match_data.event,
            event_date=match_data.event_date,
            bracket=match_data.bracket,
            uploader_notes=match_data.uploader_notes,
            status=MatchStatus.UPLOADING
        )
        self.db.add(db_match)
        self.db.commit()
        self.db.refresh(db_match)
        return MatchResponse.model_validate(db_match)
    
    def get_match(self, match_id: int, user_id: int) -> Optional[MatchResponse]:
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match:
            return None
        
        # Update status based on current state
        computed_status = self.compute_match_status(match)
        if match.status != computed_status:
            match.status = computed_status
            self.db.commit()
        
        return MatchResponse.model_validate(match)
    
    def list_matches(
        self, user_id: int, skip: int = 0, limit: int = 20, 
        sort_by: Optional[str] = None, sort_order: str = "desc"
    ) -> List[MatchResponse]:
        query = self.db.query(Match).filter(Match.user_id == user_id)
        
        # Apply sorting
        if sort_by == "event_date":
            if sort_order == "asc":
                query = query.order_by(Match.event_date.asc().nullslast())
            else:
                query = query.order_by(Match.event_date.desc().nullslast())
        elif sort_by == "created_at" or sort_by is None:
            if sort_order == "asc":
                query = query.order_by(Match.created_at.asc())
            else:
                query = query.order_by(Match.created_at.desc())
        else:
            # Default to created_at desc
            query = query.order_by(Match.created_at.desc())
        
        matches = query.offset(skip).limit(limit).all()
        
        # Update status for each match based on current state
        for match in matches:
            computed_status = self.compute_match_status(match)
            if match.status != computed_status:
                match.status = computed_status
        self.db.commit()
        
        return [MatchResponse.model_validate(m) for m in matches]
    
    def update_match(
        self, match_id: int, match_data: MatchUpdate, user_id: int
    ) -> Optional[MatchResponse]:
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match:
            return None
        
        update_data = match_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(match, field, value)
        
        self.db.commit()
        self.db.refresh(match)
        return MatchResponse.model_validate(match)
    
    def delete_match(self, match_id: int, user_id: int) -> bool:
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match:
            return False
        
        self.db.delete(match)
        self.db.commit()
        return True
    
    async def upload_video(self, match_id: int, file, user_id: int) -> MatchResponse:
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match:
            raise ValueError("Match not found")
        
        # Upload video file (async) - this will read and save the file
        video_path, file_size = await self.video_service.upload_video(file, match_id)
        
        # Create MatchVideo record
        db_video = MatchVideo(
            match_id=match_id,
            original_filename=file.filename,
            file_path=video_path,
            file_size_bytes=file_size
        )
        self.db.add(db_video)
        
        # Update match status to ANALYZING after video upload
        match.status = MatchStatus.ANALYZING
        self.db.commit()
        
        # Refresh match and eagerly load videos relationship
        self.db.refresh(match)
        # Eagerly load videos relationship to ensure it's available for serialization
        match = self.db.query(Match).options(joinedload(Match.videos)).filter(Match.id == match_id).first()
        
        # Trigger async video processing via Celery
        try:
            # Check if Celery is available and task is callable
            if hasattr(process_match_video, 'delay'):
                process_match_video.delay(match_id, video_path)
            else:
                # Fallback: call synchronously if Celery is not available
                print("Warning: Celery not available, skipping async video processing.")
                print("Video uploaded but processing will not start automatically.")
                print("Make sure Celery worker and Redis are running.")
        except Exception as e:
            # If Celery is not available, log error but don't fail the upload
            print(f"Warning: Could not queue video processing task: {str(e)}")
            print("Video uploaded but processing will not start automatically.")
            print("Make sure Celery worker and Redis are running.")
        
        # Use from_orm for SQLAlchemy models with relationships
        return MatchResponse.model_validate(match)

