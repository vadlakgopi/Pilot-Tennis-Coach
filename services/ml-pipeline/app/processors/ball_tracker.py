"""
Ball Tracking Module
Tracks tennis ball across video frames
"""
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass


@dataclass
class BallDetection:
    """Ball detection data"""
    timestamp: float
    position: Tuple[float, float]  # (x, y) in pixels
    confidence: float
    velocity: Optional[Tuple[float, float]] = None  # (vx, vy) in pixels/frame
    is_bounce: bool = False


class BallTracker:
    def __init__(self):
        # Ball tracking parameters
        self.ball_color_range = {
            'yellow': ([20, 100, 100], [30, 255, 255]),  # HSV range for yellow
            'white': ([0, 0, 200], [180, 30, 255])  # HSV range for white
        }
        self.min_ball_radius = 3
        self.max_ball_radius = 15
        self.trajectory_history = []  # For interpolation
    
    async def track(self, frame: np.ndarray, timestamp: float) -> Optional[BallDetection]:
        """
        Track ball in a frame
        
        Args:
            frame: Video frame
            timestamp: Frame timestamp in seconds
            
        Returns:
            BallDetection if ball found, None otherwise
        """
        # Convert to HSV for color-based detection
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Create mask for ball color (yellow or white)
        mask_yellow = cv2.inRange(
            hsv,
            np.array(self.ball_color_range['yellow'][0]),
            np.array(self.ball_color_range['yellow'][1])
        )
        mask_white = cv2.inRange(
            hsv,
            np.array(self.ball_color_range['white'][0]),
            np.array(self.ball_color_range['white'][1])
        )
        mask = cv2.bitwise_or(mask_yellow, mask_white)
        
        # Apply morphological operations to reduce noise
        kernel = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by size (ball should be small and circular)
        ball_contour = None
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 10 or area > 500:  # Filter by area
                continue
            
            # Check circularity
            perimeter = cv2.arcLength(contour, True)
            if perimeter == 0:
                continue
            circularity = 4 * np.pi * area / (perimeter * perimeter)
            
            if circularity > 0.5:  # Ball should be somewhat circular
                ball_contour = contour
                break
        
        if ball_contour is None:
            # Try to interpolate from trajectory history
            return self._interpolate_ball_position(timestamp)
        
        # Get ball center
        (x, y), radius = cv2.minEnclosingCircle(ball_contour)
        center = (float(x), float(y))
        
        # Calculate velocity from previous detections
        velocity = self._calculate_velocity(center, timestamp)
        
        # Detect bounce (sudden change in y-velocity)
        is_bounce = self._detect_bounce(velocity)
        
        detection = BallDetection(
            timestamp=timestamp,
            position=center,
            confidence=0.8,  # Could be improved with better detection
            velocity=velocity,
            is_bounce=is_bounce
        )
        
        # Update trajectory history
        self.trajectory_history.append(detection)
        if len(self.trajectory_history) > 30:  # Keep last 30 frames
            self.trajectory_history.pop(0)
        
        return detection
    
    def _calculate_velocity(
        self, position: Tuple[float, float], timestamp: float
    ) -> Optional[Tuple[float, float]]:
        """Calculate ball velocity from trajectory history"""
        if len(self.trajectory_history) < 2:
            return None
        
        prev_detection = self.trajectory_history[-1]
        dt = timestamp - prev_detection.timestamp
        
        if dt == 0:
            return None
        
        vx = (position[0] - prev_detection.position[0]) / dt
        vy = (position[1] - prev_detection.position[1]) / dt
        
        return (vx, vy)
    
    def _detect_bounce(self, velocity: Optional[Tuple[float, float]]) -> bool:
        """Detect if ball bounced (sudden change in y-velocity)"""
        if velocity is None or len(self.trajectory_history) < 2:
            return False
        
        prev_velocity = self.trajectory_history[-1].velocity
        if prev_velocity is None:
            return False
        
        # Check for significant change in y-velocity direction
        vy_change = abs(velocity[1] - prev_velocity[1])
        return vy_change > 50  # Threshold for bounce detection
    
    def _interpolate_ball_position(self, timestamp: float) -> Optional[BallDetection]:
        """Interpolate ball position from trajectory history"""
        if len(self.trajectory_history) < 2:
            return None
        
        # Simple linear interpolation
        # In production, use more sophisticated trajectory prediction
        prev = self.trajectory_history[-1]
        if prev.velocity is None:
            return None
        
        dt = timestamp - prev.timestamp
        predicted_x = prev.position[0] + prev.velocity[0] * dt
        predicted_y = prev.position[1] + prev.velocity[1] * dt
        
        return BallDetection(
            timestamp=timestamp,
            position=(predicted_x, predicted_y),
            confidence=0.5,  # Lower confidence for interpolated
            velocity=prev.velocity,
            is_bounce=False
        )



