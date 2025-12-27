"""
Video Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, Tuple
from app.core.database import get_db
from app.services.video_service import VideoService
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


def parse_range_header(range_header: Optional[str], file_size: int) -> Tuple[int, int]:
    """Parse HTTP Range header and return (start, end) bytes"""
    if not range_header or not range_header.startswith("bytes="):
        return (0, file_size - 1)
    
    range_str = range_header.replace("bytes=", "")
    ranges = range_str.split("-")
    
    if len(ranges) != 2:
        return (0, file_size - 1)
    
    start_str, end_str = ranges
    
    if start_str and end_str:
        start = int(start_str)
        end = int(end_str)
    elif start_str:
        start = int(start_str)
        end = file_size - 1
    elif end_str:
        # Suffix range: last N bytes
        suffix_length = int(end_str)
        start = max(0, file_size - suffix_length)
        end = file_size - 1
    else:
        return (0, file_size - 1)
    
    # Validate range
    start = max(0, start)
    end = min(file_size - 1, end)
    
    if start > end:
        return (0, file_size - 1)
    
    return (start, end)


@router.get("/matches/{match_id}/video")
async def stream_match_video(
    match_id: int,
    request: Request,
    range_header: Optional[str] = Header(None, alias="range"),
    token: Optional[str] = Query(None, description="Authentication token (for video tags)"),
    db: Session = Depends(get_db)
):
    """Stream match video with Range request support"""
    # Support token from query parameter (for video tags) or from Authorization header
    user_id = None
    auth_service = AuthService(db)
    
    # Try query parameter first (for video tags)
    if token:
        try:
            user = auth_service.get_current_user(token)
            user_id = user.id
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
    else:
        # Try Authorization header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            try:
                user = auth_service.get_current_user(token)
                user_id = user.id
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid authentication token")
    
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    video_service = VideoService(db)
    video_path = await video_service.get_video_path(match_id, user_id)
    if not video_path:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Get file size
    file_size = video_service.get_file_size(video_path)
    if file_size is None:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Parse range header if present
    if range_header:
        start, end = parse_range_header(range_header, file_size)
        content_length = end - start + 1
        
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": "video/mp4",
        }
        
        response = StreamingResponse(
            video_service.stream_video_range(video_path, start, end),
            status_code=206,  # Partial Content
            headers=headers,
            media_type="video/mp4"
        )
        # Add CORS headers explicitly for video streaming
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Accept-Ranges"
        return response
    else:
        # Full file stream
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": "video/mp4",
        }
        
        response = StreamingResponse(
            video_service.stream_video(video_path),
            headers=headers,
            media_type="video/mp4"
        )
        # Add CORS headers explicitly for video streaming
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Accept-Ranges"
        return response


@router.get("/matches/{match_id}/thumbnail")
async def get_match_thumbnail(
    match_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get match thumbnail"""
    video_service = VideoService(db)
    thumbnail_path = await video_service.get_thumbnail_path(match_id, user_id)
    if not thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    return StreamingResponse(
        video_service.stream_image(thumbnail_path),
        media_type="image/jpeg"
    )


@router.get("/matches/{match_id}/highlights-video")
async def stream_highlights_video(
    match_id: int,
    request: Request,
    range_header: Optional[str] = Header(None, alias="range"),
    token: Optional[str] = Query(None, description="Authentication token (for video tags)"),
    db: Session = Depends(get_db)
):
    """Stream highlights video with Range request support"""
    # Support token from query parameter (for video tags) or from Authorization header
    user_id = None
    auth_service = AuthService(db)
    
    # Try query parameter first (for video tags)
    if token:
        try:
            user = auth_service.get_current_user(token)
            user_id = user.id
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
    else:
        # Try Authorization header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            try:
                user = auth_service.get_current_user(token)
                user_id = user.id
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid authentication token")
    
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    video_service = VideoService(db)
    highlights_path = await video_service.get_highlights_path(match_id, user_id)
    if not highlights_path:
        raise HTTPException(status_code=404, detail="Highlights video not found")
    
    # Get file size
    file_size = video_service.get_file_size(highlights_path)
    if file_size is None:
        raise HTTPException(status_code=404, detail="Highlights video file not found")
    
    # Parse range header if present
    if range_header:
        start, end = parse_range_header(range_header, file_size)
        content_length = end - start + 1
        
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": "video/mp4",
        }
        
        response = StreamingResponse(
            video_service.stream_video_range(highlights_path, start, end),
            status_code=206,  # Partial Content
            headers=headers,
            media_type="video/mp4"
        )
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Accept-Ranges"
        return response
    else:
        # Full file stream
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": "video/mp4",
        }
        
        response = StreamingResponse(
            video_service.stream_video(highlights_path),
            headers=headers,
            media_type="video/mp4"
        )
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Accept-Ranges"
        return response


