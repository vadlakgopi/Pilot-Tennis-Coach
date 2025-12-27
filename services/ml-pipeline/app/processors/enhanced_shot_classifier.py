"""
Enhanced Shot Classifier using trained stroke detection model
Uses YOLOv8 stroke detector to classify tennis shots from player bounding boxes
"""
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
from app.utils.logger import log_info, log_warning, log_error

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    YOLO = None

from app.processors.player_tracker import PlayerDetection
from app.processors.ball_tracker import BallDetection
from app.processors.court_detector import CourtCalibration


@dataclass
class Shot:
    """Classified shot data"""
    shot_id: int
    player_number: int
    timestamp: float
    shot_type: str  # forehand, backhand, volley, serve, etc.
    direction: Optional[str] = None  # cross-court, down-the-line, etc.
    outcome: Optional[str] = None  # winner, error, in_play
    court_position: Optional[Tuple[float, float]] = None
    confidence: float = 0.0
    stroke_phase: Optional[str] = None  # ready, stroke, finish


# Stroke class mapping from dataset
STROKE_CLASSES = {
    0: 'backhand-finish',
    1: 'backhand-ready',
    2: 'backhand-stroke',
    3: 'forehand-finish',
    4: 'forehand-ready',
    5: 'forehand-stroke',
    6: 'ready-position',
    7: 'serve_followthrough',
    8: 'serve_hit',
    9: 'serve_ready',
    10: 'serve_toss'
}

# Map stroke classes to shot types
STROKE_TO_SHOT_TYPE = {
    'backhand-finish': 'backhand',
    'backhand-ready': 'backhand',
    'backhand-stroke': 'backhand',
    'forehand-finish': 'forehand',
    'forehand-ready': 'forehand',
    'forehand-stroke': 'forehand',
    'ready-position': 'ready',
    'serve_followthrough': 'serve',
    'serve_hit': 'serve',
    'serve_ready': 'serve',
    'serve_toss': 'serve'
}

# Map stroke classes to phases
STROKE_TO_PHASE = {
    'backhand-ready': 'ready',
    'backhand-stroke': 'stroke',
    'backhand-finish': 'finish',
    'forehand-ready': 'ready',
    'forehand-stroke': 'stroke',
    'forehand-finish': 'finish',
    'ready-position': 'ready',
    'serve_ready': 'ready',
    'serve_toss': 'ready',
    'serve_hit': 'stroke',
    'serve_followthrough': 'finish'
}


class EnhancedShotClassifier:
    """
    Enhanced shot classifier using trained stroke detection model
    """
    def __init__(self):
        self.stroke_model = None
        self.stroke_classes = STROKE_CLASSES
        
        # Load trained stroke detection model
        if YOLO_AVAILABLE:
            try:
                # Calculate project root (go up from services/ml-pipeline/app/processors/)
                # __file__ is at: services/ml-pipeline/app/processors/enhanced_shot_classifier.py
                # Project root is: services/ml-pipeline/app/processors/ -> ../../../
                script_path = Path(__file__).resolve()
                project_root = script_path.parent.parent.parent.parent.parent  # Go up 5 levels to project root
                
                # Try to find the trained stroke detector model
                model_paths = [
                    # Check for latest training runs
                    project_root / 'runs' / 'detect' / 'tennis_stroke_detector6' / 'weights' / 'best.pt',
                    project_root / 'runs' / 'detect' / 'tennis_stroke_detector5' / 'weights' / 'best.pt',
                    project_root / 'runs' / 'detect' / 'tennis_stroke_detector' / 'weights' / 'best.pt',
                ]
                
                for model_path in model_paths:
                    if model_path.exists():
                        log_info(f"Loading trained stroke detector: {model_path}")
                        self.stroke_model = YOLO(str(model_path))
                        log_info("✓ Stroke detection model loaded successfully")
                        break
                
                if self.stroke_model is None:
                    log_warning("Trained stroke detector not found, using heuristic classification")
            except Exception as e:
                log_warning(f"Could not load stroke detector: {e}")
                self.stroke_model = None
        else:
            log_warning("YOLO not available, using heuristic classification")
    
    async def classify_shots(
        self,
        player_tracks: List[PlayerDetection],
        ball_trajectories: List[BallDetection],
        court_calibration: CourtCalibration,
        frames: Optional[List[np.ndarray]] = None,
        frame_timestamps: Optional[List[float]] = None
    ) -> List[Shot]:
        """
        Classify shots using trained stroke detection model
        
        Args:
            player_tracks: List of player detections
            ball_trajectories: List of ball detections
            court_calibration: Court calibration data
            frames: Optional list of video frames (for stroke detection)
            frame_timestamps: Optional list of frame timestamps
            
        Returns:
            List of classified shots
        """
        shots = []
        shot_id = 1
        
        if not self.stroke_model:
            # Fallback to heuristic classification
            return await self._classify_heuristic(player_tracks, ball_trajectories, court_calibration)
        
        # Use stroke detection model if frames are available
        if frames and frame_timestamps and len(frames) == len(frame_timestamps):
            shots = await self._classify_with_stroke_model(
                frames, frame_timestamps, player_tracks, ball_trajectories, court_calibration
            )
        else:
            # Use player tracks and ball trajectories to find shot moments
            shots = await self._classify_from_tracks(
                player_tracks, ball_trajectories, court_calibration
            )
        
        return shots
    
    async def _classify_with_stroke_model(
        self,
        frames: List[np.ndarray],
        frame_timestamps: List[float],
        player_tracks: List[PlayerDetection],
        ball_trajectories: List[BallDetection],
        court_calibration: CourtCalibration
    ) -> List[Shot]:
        """Classify shots using stroke detection model on video frames"""
        shots = []
        shot_id = 1
        
        # Process frames in batches for efficiency
        batch_size = 8
        for i in range(0, len(frames), batch_size):
            batch_frames = frames[i:i+batch_size]
            batch_timestamps = frame_timestamps[i:i+batch_size]
            
            # Run stroke detection on batch
            try:
                results = self.stroke_model(batch_frames, verbose=False, conf=0.25)
                
                for idx, result in enumerate(results):
                    frame_idx = i + idx
                    timestamp = batch_timestamps[idx]
                    
                    # Find player detection at this timestamp
                    player_det = self._find_player_at_timestamp(player_tracks, timestamp)
                    if not player_det:
                        continue
                    
                    # Find ball at this timestamp
                    ball_det = self._find_ball_at_timestamp(ball_trajectories, timestamp)
                    
                    # Process detections from stroke model
                    boxes = result.boxes
                    if boxes is not None and len(boxes) > 0:
                        # Get best detection (highest confidence)
                        best_box = None
                        best_conf = 0.0
                        
                        for box in boxes:
                            conf = float(box.conf[0])
                            if conf > best_conf:
                                best_conf = conf
                                best_box = box
                        
                        if best_box:
                            cls_id = int(best_box.cls[0])
                            stroke_class = self.stroke_classes.get(cls_id, 'unknown')
                            shot_type = STROKE_TO_SHOT_TYPE.get(stroke_class, 'unknown')
                            stroke_phase = STROKE_TO_PHASE.get(stroke_class, None)
                            
                            # Only create shot for actual stroke phases (not ready positions)
                            if stroke_phase in ['stroke', 'finish']:
                                # Get court position
                                court_pos = None
                                if court_calibration and player_det:
                                    try:
                                        court_pos = court_calibration.pixel_to_court_coords(
                                            player_det.center[0],
                                            player_det.center[1]
                                        )
                                    except:
                                        pass
                                
                                # Determine direction
                                direction = None
                                if ball_det and ball_det.velocity:
                                    direction = self._determine_direction(ball_det, court_calibration)
                                
                                shot = Shot(
                                    shot_id=shot_id,
                                    player_number=player_det.player_id,
                                    timestamp=timestamp,
                                    shot_type=shot_type,
                                    direction=direction,
                                    court_position=court_pos,
                                    confidence=best_conf,
                                    stroke_phase=stroke_phase
                                )
                                shots.append(shot)
                                shot_id += 1
            except Exception as e:
                log_error(f"Error processing frame batch: {e}")
                continue
        
        return shots
    
    async def _classify_from_tracks(
        self,
        player_tracks: List[PlayerDetection],
        ball_trajectories: List[BallDetection],
        court_calibration: CourtCalibration
    ) -> List[Shot]:
        """Classify shots from player and ball tracks (fallback method)"""
        shots = []
        shot_id = 1
        
        # Group player tracks and ball trajectories by time
        for player_det in player_tracks:
            nearest_ball = self._find_nearest_ball(player_det.timestamp, ball_trajectories)
            
            if nearest_ball is None:
                continue
            
            # Check if ball is close enough to player (contact point)
            distance = self._calculate_distance(player_det.center, nearest_ball.position)
            
            if distance < 50:  # Threshold for ball contact
                shot_type = self._classify_shot_type_heuristic(
                    player_det, nearest_ball, court_calibration
                )
                
                direction = self._determine_direction(nearest_ball, court_calibration)
                
                court_pos = None
                if court_calibration:
                    try:
                        court_pos = court_calibration.pixel_to_court_coords(
                            player_det.center[0],
                            player_det.center[1]
                        )
                    except:
                        pass
                
                shot = Shot(
                    shot_id=shot_id,
                    player_number=player_det.player_id,
                    timestamp=player_det.timestamp,
                    shot_type=shot_type,
                    direction=direction,
                    court_position=court_pos,
                    confidence=0.7  # Lower confidence for heuristic method
                )
                shots.append(shot)
                shot_id += 1
        
        return shots
    
    async def _classify_heuristic(
        self,
        player_tracks: List[PlayerDetection],
        ball_trajectories: List[BallDetection],
        court_calibration: CourtCalibration
    ) -> List[Shot]:
        """Heuristic classification fallback"""
        return await self._classify_from_tracks(player_tracks, ball_trajectories, court_calibration)
    
    def _find_player_at_timestamp(
        self, player_tracks: List[PlayerDetection], timestamp: float
    ) -> Optional[PlayerDetection]:
        """Find player detection nearest to timestamp"""
        if not player_tracks:
            return None
        
        nearest = min(player_tracks, key=lambda p: abs(p.timestamp - timestamp))
        if abs(nearest.timestamp - timestamp) < 0.1:  # Within 100ms
            return nearest
        return None
    
    def _find_ball_at_timestamp(
        self, ball_trajectories: List[BallDetection], timestamp: float
    ) -> Optional[BallDetection]:
        """Find ball detection nearest to timestamp"""
        if not ball_trajectories:
            return None
        
        nearest = min(ball_trajectories, key=lambda b: abs(b.timestamp - timestamp))
        if abs(nearest.timestamp - timestamp) < 0.1:  # Within 100ms
            return nearest
        return None
    
    def _find_nearest_ball(
        self, timestamp: float, ball_trajectories: List[BallDetection]
    ) -> Optional[BallDetection]:
        """Find ball detection nearest to given timestamp"""
        return self._find_ball_at_timestamp(ball_trajectories, timestamp)
    
    def _calculate_distance(
        self, pos1: Tuple[float, float], pos2: Tuple[float, float]
    ) -> float:
        """Calculate Euclidean distance between two points"""
        return np.sqrt((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)
    
    def _classify_shot_type_heuristic(
        self,
        player_det: PlayerDetection,
        ball_det: BallDetection,
        court_calibration: CourtCalibration
    ) -> str:
        """Heuristic shot type classification"""
        if not court_calibration:
            return "forehand"  # Default
        
        try:
            court_y = court_calibration.pixel_to_court_coords(
                player_det.center[0],
                player_det.center[1]
            )[1]
            
            if court_y < 3.0:  # Near net
                return "volley"
            
            if ball_det.position[1] < player_det.center[1] - 50:
                return "overhead"
        except:
            pass
        
        return "forehand"  # Default
    
    def _determine_direction(
        self,
        ball_det: BallDetection,
        court_calibration: CourtCalibration
    ) -> Optional[str]:
        """Determine shot direction (cross-court, down-the-line)"""
        if ball_det.velocity is None:
            return None
        
        vx, vy = ball_det.velocity
        
        # Simplified direction detection
        if abs(vx) > abs(vy):
            return "cross-court" if vx > 0 else "down-the-line"
        return None
