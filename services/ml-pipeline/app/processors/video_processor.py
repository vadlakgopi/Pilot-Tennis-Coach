"""
Main Video Processor - Orchestrates the entire ML pipeline
"""
import cv2
import httpx
from typing import Dict, List, Any, Optional
from app.processors.court_detector import CourtDetector
from app.processors.player_tracker import PlayerTracker
from app.processors.enhanced_ball_tracker import EnhancedBallTracker
from app.processors.enhanced_shot_classifier import EnhancedShotClassifier
from app.processors.analytics_engine import AnalyticsEngine
from app.services.highlights_generator import HighlightsGenerator
from app.config import settings
from app.utils.logger import log_info, log_warning, log_error
from pathlib import Path


class VideoProcessor:
    def __init__(self, match_id: int, video_path: str):
        self.match_id = match_id
        self.video_path = video_path
        self.cap = None
        
        # Initialize processors (using EnhancedBallTracker and EnhancedShotClassifier with trained models)
        self.court_detector = CourtDetector()
        self.player_tracker = PlayerTracker()
        self.ball_tracker = EnhancedBallTracker()
        self.shot_classifier = EnhancedShotClassifier()  # Using enhanced classifier with stroke detector
        self.analytics_engine = AnalyticsEngine()
        
        # Processing state
        self.court_calibration = None
        self.player_tracks = []
        self.ball_trajectories = []
        self.shots = []
        self.rallies = []
        self.frames = []  # Store frames for stroke detection
        self.frame_timestamps = []  # Store frame timestamps
    
    async def process(self) -> Dict[str, Any]:
        """
        Main processing pipeline
        """
        # Open video
        self.cap = cv2.VideoCapture(self.video_path)
        if not self.cap.isOpened():
            raise ValueError(f"Could not open video: {self.video_path}")
        
        fps = self.cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Step 1: Detect and calibrate court
        log_info(f"Match {self.match_id}: Step 1: Detecting court...")
        frame = self._read_frame(0)
        self.court_calibration = await self.court_detector.detect_and_calibrate(frame)
        
        # Step 2: Track players and ball throughout video
        log_info(f"Match {self.match_id}: Step 2: Tracking players and ball...")
        frame_number = 0
        
        # Sample frames for stroke detection (every Nth frame to balance accuracy and performance)
        frame_sample_rate = 5  # Process every 5th frame for stroke detection
        
        # Performance tracking
        import time
        tracking_start = time.time()
        last_log_time = tracking_start
        frames_processed = 0
        
        while True:
            ret, frame = self.cap.read()
            if not ret:
                break
            
            timestamp = frame_number / fps
            
            # Track players
            player_detections = await self.player_tracker.track(frame, timestamp)
            self.player_tracks.extend(player_detections)
            
            # Track ball (pass court calibration if available)
            ball_detection = await self.ball_tracker.track(frame, timestamp, self.court_calibration)
            if ball_detection:
                self.ball_trajectories.append(ball_detection)
            
            # Store frames for stroke detection (sample to reduce memory usage)
            if frame_number % frame_sample_rate == 0:
                self.frames.append(frame.copy())
                self.frame_timestamps.append(timestamp)
            
            frame_number += 1
            frames_processed += 1
            
            # Log progress every 100 frames or every 10 seconds
            current_time = time.time()
            if frame_number % 100 == 0 or (current_time - last_log_time) >= 10:
                elapsed = current_time - tracking_start
                fps_actual = frames_processed / elapsed if elapsed > 0 else 0
                progress_pct = (frame_number / total_frames * 100) if total_frames > 0 else 0
                eta_seconds = (total_frames - frame_number) / fps_actual if fps_actual > 0 else 0
                eta_minutes = eta_seconds / 60
                log_info(f"Match {self.match_id}: Processed {frame_number}/{total_frames} frames ({progress_pct:.1f}%) | Speed: {fps_actual:.1f} fps | ETA: {eta_minutes:.1f} min")
                last_log_time = current_time
        
        log_info(f"Match {self.match_id}: Collected {len(self.frames)} frames for stroke detection")
        
        # Step 3: Classify shots using trained stroke detector
        log_info(f"Match {self.match_id}: Step 3: Classifying shots with trained stroke detector...")
        self.shots = await self.shot_classifier.classify_shots(
            self.player_tracks,
            self.ball_trajectories,
            self.court_calibration,
            frames=self.frames,
            frame_timestamps=self.frame_timestamps
        )
        
        log_info(f"Match {self.match_id}: Detected {len(self.shots)} shots")
        
        # Step 4: Identify rallies and points
        log_info(f"Match {self.match_id}: Step 4: Identifying rallies and points...")
        self.rallies = await self.analytics_engine.identify_rallies(
            self.shots,
            self.ball_trajectories
        )
        
        # Step 5: Generate analytics
        log_info(f"Match {self.match_id}: Step 5: Generating analytics...")
        analytics = await self.analytics_engine.generate_analytics(
            self.shots,
            self.rallies,
            self.player_tracks
        )
        
        # Set match_id in analytics
        analytics["match_id"] = self.match_id
        
        # Step 6: Generate highlights video
        log_info(f"Match {self.match_id}: Step 6: Generating highlights video...")
        highlights_path = await self._generate_highlights(analytics)
        if highlights_path:
            analytics['highlights_video_path'] = highlights_path
            log_info(f"Match {self.match_id}: ✓ Highlights video generated: {highlights_path}")
        
        # Step 7: Save results to database (via API)
        log_info(f"Match {self.match_id}: Step 7: Saving results...")
        await self._save_results(analytics)
        
        self.cap.release()
        return analytics
    
    def _read_frame(self, frame_number: int):
        """Read a specific frame from video"""
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = self.cap.read()
        return frame if ret else None
    
    async def _generate_highlights(self, analytics: Dict[str, Any]) -> Optional[str]:
        """Generate highlights video from analytics"""
        try:
            from pathlib import Path
            
            # Determine output path (save in same directory as source video)
            video_path_obj = Path(self.video_path)
            output_dir = video_path_obj.parent
            highlights_path = output_dir / 'highlights.mp4'
            
            generator = HighlightsGenerator(
                video_path=self.video_path,
                output_path=str(highlights_path)
            )
            
            success = generator.generate_from_analytics(analytics)
            if success and highlights_path.exists():
                return str(highlights_path)
            return None
        except Exception as e:
            log_error(f"Match {self.match_id}: Error generating highlights: {str(e)}")
            return None
    
    async def _save_results(self, analytics: Dict[str, Any]):
        """Save processing results to database via API"""
        match_id = analytics.get("match_id")
        if not match_id:
            log_warning(f"Match {self.match_id}: match_id not found in analytics, cannot save results")
            return
        
        api_url = f"{settings.API_URL}/api/{settings.API_VERSION}/analytics/matches/{match_id}/save-from-ml"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    api_url,
                    json=analytics,
                    headers={
                        "X-Service-Token": settings.ML_SERVICE_TOKEN,
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    log_info(f"Match {match_id}: Successfully saved analytics")
                else:
                    log_error(f"Match {match_id}: Failed to save analytics: {response.status_code} - {response.text}")
                    raise Exception(f"API returned status {response.status_code}: {response.text}")
                    
        except Exception as e:
            log_error(f"Match {match_id}: Error saving analytics to API: {str(e)}")
            raise Exception(f"Failed to save analytics: {str(e)}")


