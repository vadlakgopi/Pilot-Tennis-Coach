"""
Shot Classification Module
Classifies tennis shots based on player pose, ball trajectory, and court position
"""
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
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


class ShotClassifier:
    def __init__(self):
        # Shot classification rules and heuristics
        # In production, use trained ML model (LSTM/Transformer)
        pass
    
    async def classify_shots(
        self,
        player_tracks: List[PlayerDetection],
        ball_trajectories: List[BallDetection],
        court_calibration: CourtCalibration
    ) -> List[Shot]:
        """
        Classify shots from player and ball tracking data
        
        Args:
            player_tracks: List of player detections
            ball_trajectories: List of ball detections
            court_calibration: Court calibration data
            
        Returns:
            List of classified shots
        """
        shots = []
        shot_id = 1
        
        # Group player tracks and ball trajectories by time
        # Find moments when player contacts ball (based on proximity)
        for player_det in player_tracks:
            # Find nearest ball detection
            nearest_ball = self._find_nearest_ball(
                player_det.timestamp,
                ball_trajectories
            )
            
            if nearest_ball is None:
                continue
            
            # Check if ball is close enough to player (contact point)
            distance = self._calculate_distance(
                player_det.center,
                nearest_ball.position
            )
            
            if distance < 50:  # Threshold for ball contact
                # Classify shot type
                shot_type = self._classify_shot_type(
                    player_det,
                    nearest_ball,
                    court_calibration
                )
                
                # Determine shot direction
                direction = self._determine_direction(
                    nearest_ball,
                    court_calibration
                )
                
                # Get court position
                court_pos = court_calibration.pixel_to_court_coords(
                    player_det.center[0],
                    player_det.center[1]
                )
                
                shot = Shot(
                    shot_id=shot_id,
                    player_number=player_det.player_id,
                    timestamp=player_det.timestamp,
                    shot_type=shot_type,
                    direction=direction,
                    court_position=court_pos,
                    confidence=0.8
                )
                shots.append(shot)
                shot_id += 1
        
        return shots
    
    def _find_nearest_ball(
        self, timestamp: float, ball_trajectories: List[BallDetection]
    ) -> Optional[BallDetection]:
        """Find ball detection nearest to given timestamp"""
        if not ball_trajectories:
            return None
        
        nearest = min(
            ball_trajectories,
            key=lambda b: abs(b.timestamp - timestamp)
        )
        
        if abs(nearest.timestamp - timestamp) < 0.1:  # Within 100ms
            return nearest
        return None
    
    def _calculate_distance(
        self, pos1: Tuple[float, float], pos2: Tuple[float, float]
    ) -> float:
        """Calculate Euclidean distance between two points"""
        return np.sqrt((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)
    
    def _classify_shot_type(
        self,
        player_det: PlayerDetection,
        ball_det: BallDetection,
        court_calibration: CourtCalibration
    ) -> str:
        """
        Classify shot type based on player pose and ball position
        """
        # Simplified classification rules
        # In production, use pose keypoints and ML model
        
        # Check if player is at net (volley)
        court_y = court_calibration.pixel_to_court_coords(
            player_det.center[0],
            player_det.center[1]
        )[1]
        
        if court_y < 3.0:  # Near net
            return "volley"
        
        # Check ball height (overhead)
        if ball_det.position[1] < player_det.center[1] - 50:
            return "overhead"
        
        # Default: classify as forehand or backhand based on player position
        # This is simplified - real classification needs pose analysis
        return "forehand"  # Placeholder
    
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

