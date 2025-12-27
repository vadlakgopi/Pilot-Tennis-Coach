"""
Video Service - Handles video upload, storage, and streaming
"""
import os
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import UploadFile
from app.core.config import settings
try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

class VideoService:
    def __init__(self, db: Session):
        self.db = db
        self.s3_client = None
        if BOTO3_AVAILABLE and settings.AWS_ACCESS_KEY_ID:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION,
                    endpoint_url=settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL else None
                )
            except Exception:
                self.s3_client = None
    
    async def upload_video(self, file: UploadFile, match_id: int) -> Tuple[str, int]:
        """Upload video file to S3 or local storage. Returns (file_path, file_size_bytes)"""
        # Generate file path
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
        file_path = f"matches/{match_id}/video.{file_extension}"
        
        try:
            if self.s3_client:
                # Upload to S3 using streaming
                import io
                file_obj = io.BytesIO()
                file_size = 0
                
                # Stream file content in chunks
                while True:
                    chunk = await file.read(8192)  # Read 8KB chunks
                    if not chunk:
                        break
                    file_obj.write(chunk)
                    file_size += len(chunk)
                
                file_obj.seek(0)  # Reset to beginning
                self.s3_client.upload_fileobj(
                    file_obj,
                    settings.S3_BUCKET_NAME,
                    file_path
                )
                return (f"s3://{settings.S3_BUCKET_NAME}/{file_path}", file_size)
            else:
                # Local storage fallback - use streaming to avoid loading entire file into memory
                local_path = f"./data/{file_path}"
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                
                file_size = 0
                with open(local_path, "wb") as f:
                    # Stream file content in chunks
                    while True:
                        chunk = await file.read(8192)  # Read 8KB chunks
                        if not chunk:
                            break
                        f.write(chunk)
                        file_size += len(chunk)
                        # Flush periodically for large files
                        if file_size % (1024 * 1024) == 0:  # Every MB
                            f.flush()
                
                return (local_path, file_size)
        except Exception as e:
            # Clean up partial file if it exists
            local_path = f"./data/{file_path}"
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                except:
                    pass
            raise Exception(f"Failed to upload video: {str(e)}")
    
    async def get_video_path(self, match_id: int, user_id: int) -> Optional[str]:
        """Get video path for a match"""
        from app.models.match import Match, MatchVideo
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match:
            return None
        
        video = self.db.query(MatchVideo).filter(
            MatchVideo.match_id == match_id
        ).first()
        if not video:
            return None
        
        return video.file_path
    
    async def get_thumbnail_path(self, match_id: int, user_id: int) -> Optional[str]:
        """Get thumbnail path for a match"""
        from app.models.match import Match, MatchVideo
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match:
            return None
        
        video = self.db.query(MatchVideo).filter(
            MatchVideo.match_id == match_id
        ).first()
        if not video or not video.thumbnail_path:
            return None
        
        return video.thumbnail_path
    
    async def get_highlights_path(self, match_id: int, user_id: int) -> Optional[str]:
        """Get highlights video path for a match"""
        from app.models.match import Match
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match:
            return None
        
        # Highlights video is stored in the same directory as the match video
        # Path format: data/matches/{match_id}/highlights.mp4
        highlights_path = f"./data/matches/{match_id}/highlights.mp4"
        resolved_path = self._resolve_file_path(highlights_path)
        
        if os.path.exists(resolved_path):
            return highlights_path
        return None
    
    def _resolve_file_path(self, file_path: str) -> str:
        """Resolve relative file path to absolute path"""
        if file_path.startswith("s3://"):
            return file_path
        
        # Resolve relative paths relative to the API directory
        # video_service.py is at: apps/api/app/services/video_service.py
        # We need to go up 2 levels to get to apps/api/
        if file_path.startswith("./"):
            # Get the absolute path of the API directory
            api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            resolved_path = os.path.join(api_dir, file_path[2:])  # Remove "./" prefix
        elif not os.path.isabs(file_path):
            # Relative path without "./" prefix
            api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            resolved_path = os.path.join(api_dir, file_path)
        else:
            resolved_path = file_path
        
        return os.path.normpath(resolved_path)
    
    def stream_video(self, file_path: str):
        """Stream video file"""
        if file_path.startswith("s3://"):
            # Stream from S3
            bucket, key = file_path.replace("s3://", "").split("/", 1)
            obj = self.s3_client.get_object(Bucket=bucket, Key=key)
            return obj['Body'].iter_chunks(chunk_size=8192)
        else:
            # Resolve path and stream from local file
            resolved_path = self._resolve_file_path(file_path)
            if not os.path.exists(resolved_path):
                raise FileNotFoundError(f"Video file not found: {resolved_path}")
            
            def generate():
                with open(resolved_path, "rb") as f:
                    while True:
                        chunk = f.read(8192)
                        if not chunk:
                            break
                        yield chunk
            return generate()
    
    def get_file_size(self, file_path: str) -> Optional[int]:
        """Get file size in bytes"""
        if file_path.startswith("s3://"):
            bucket, key = file_path.replace("s3://", "").split("/", 1)
            try:
                obj = self.s3_client.head_object(Bucket=bucket, Key=key)
                return obj['ContentLength']
            except Exception:
                return None
        else:
            resolved_path = self._resolve_file_path(file_path)
            if os.path.exists(resolved_path):
                return os.path.getsize(resolved_path)
            return None
    
    def stream_video_range(self, file_path: str, start: int, end: Optional[int] = None):
        """Stream a range of bytes from video file (for HTTP Range requests)"""
        if file_path.startswith("s3://"):
            bucket, key = file_path.replace("s3://", "").split("/", 1)
            range_header = f"bytes={start}-{end if end else ''}"
            obj = self.s3_client.get_object(Bucket=bucket, Key=key, Range=range_header)
            return obj['Body'].iter_chunks(chunk_size=8192)
        else:
            resolved_path = self._resolve_file_path(file_path)
            if not os.path.exists(resolved_path):
                raise FileNotFoundError(f"Video file not found: {resolved_path}")
            
            file_size = os.path.getsize(resolved_path)
            if end is None:
                end = file_size - 1
            
            def generate():
                with open(resolved_path, "rb") as f:
                    f.seek(start)
                    remaining = end - start + 1
                    while remaining > 0:
                        chunk_size = min(8192, remaining)
                        chunk = f.read(chunk_size)
                        if not chunk:
                            break
                        yield chunk
                        remaining -= len(chunk)
            return generate()
    
    def stream_image(self, file_path: str):
        """Stream image file"""
        if file_path.startswith("s3://"):
            bucket, key = file_path.replace("s3://", "").split("/", 1)
            obj = self.s3_client.get_object(Bucket=bucket, Key=key)
            return obj['Body'].read()
        else:
            resolved_path = self._resolve_file_path(file_path)
            if not os.path.exists(resolved_path):
                raise FileNotFoundError(f"Image file not found: {resolved_path}")
            with open(resolved_path, "rb") as f:
                return f.read()

