"""
ML Pipeline Service - FastAPI service for video processing
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.utils.logger import log_info, log_warning, log_error
# Try to import full processor, fallback to simplified version
try:
    import cv2
    from app.processors.video_processor import VideoProcessor
    HAS_OPENCV = True
except ImportError:
    log_warning("OpenCV not available, using simplified video processor")
    from app.processors.video_processor_simple import VideoProcessor
    HAS_OPENCV = False

app = FastAPI(
    title="Tennis ML Pipeline",
    description="ML service for tennis video analysis",
    version="1.0.0"
)


class ProcessRequest(BaseModel):
    match_id: int
    video_path: str


class ProcessResponse(BaseModel):
    match_id: int
    status: str
    progress: float
    message: Optional[str] = None


@app.post("/process", response_model=ProcessResponse)
async def process_video(request: ProcessRequest):
    """
    Process a tennis match video through the ML pipeline
    """
    try:
        log_info(f"Starting video processing for match {request.match_id}")
        processor = VideoProcessor(
            match_id=request.match_id,
            video_path=request.video_path
        )
        
        result = await processor.process()
        log_info(f"Successfully completed video processing for match {request.match_id}")
        return ProcessResponse(
            match_id=request.match_id,
            status="completed",
            progress=1.0,
            message="Video processed successfully"
        )
    except Exception as e:
        log_error(f"Error processing video for match {request.match_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-pipeline"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)


