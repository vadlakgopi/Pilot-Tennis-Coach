"""
Enhanced Ball Tracking Module using YOLOv8 + Kalman Filter
Tracks tennis ball with >90% frame detection and smoothed trajectory
"""
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from app.utils.logger import log_info, log_warning, log_error

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    YOLO = None


@dataclass
class BallDetection:
    """Enhanced ball detection data"""
    timestamp: float
    position: Tuple[float, float]  # (x, y) in pixels (smoothed)
    raw_position: Tuple[float, float]  # Raw detected position
    confidence: float
    velocity: Optional[Tuple[float, float]] = None  # (vx, vy) in pixels/frame (smoothed)
    speed_mps: Optional[float] = None  # Speed in meters per second
    is_bounce: bool = False
    is_detected: bool = True  # True if actually detected, False if predicted


class KalmanFilter:
    """Kalman filter for ball trajectory smoothing"""
    def __init__(self):
        # State: [x, y, vx, vy]
        self.state = np.zeros((4, 1), dtype=np.float32)
        self.error_cov = np.eye(4, dtype=np.float32) * 1000
        
        # Process noise (ball movement uncertainty)
        self.process_noise = np.eye(4, dtype=np.float32) * 0.03
        
        # Measurement noise (detection uncertainty)
        self.measurement_noise = np.eye(2, dtype=np.float32) * 10
        
        # State transition matrix (constant velocity model)
        self.F = np.array([
            [1, 0, 1, 0],
            [0, 1, 0, 1],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ], dtype=np.float32)
        
        # Measurement matrix (we observe position)
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ], dtype=np.float32)
        
        # Identity matrix
        self.I = np.eye(4, dtype=np.float32)
    
    def predict(self) -> Tuple[float, float]:
        """Predict next state"""
        self.state = self.F @ self.state
        self.error_cov = self.F @ self.error_cov @ self.F.T + self.process_noise
        return (float(self.state[0, 0]), float(self.state[1, 0]))
    
    def update(self, measurement: Tuple[float, float]) -> Tuple[float, float]:
        """Update state with measurement"""
        z = np.array([[measurement[0]], [measurement[1]]], dtype=np.float32)
        
        # Innovation
        y = z - self.H @ self.state
        
        # Innovation covariance
        S = self.H @ self.error_cov @ self.H.T + self.measurement_noise
        
        # Kalman gain
        K = self.error_cov @ self.H.T @ np.linalg.inv(S)
        
        # Update state
        self.state = self.state + K @ y
        
        # Update error covariance
        self.error_cov = (self.I - K @ self.H) @ self.error_cov
        
        return (float(self.state[0, 0]), float(self.state[1, 0]))
    
    def get_velocity(self) -> Tuple[float, float]:
        """Get current velocity estimate"""
        return (float(self.state[2, 0]), float(self.state[3, 0]))


class EnhancedBallTracker:
    """
    Enhanced ball tracker using YOLOv8 for detection + Kalman filter for smoothing
    Targets >90% frame detection rate
    """
    def __init__(self, pixel_to_meter_ratio: float = 0.05):
        self.pixel_to_meter_ratio = pixel_to_meter_ratio
        self.kalman_filter = KalmanFilter()
        
        # Load YOLOv8 model (use custom-trained ball detection model)
        if YOLO_AVAILABLE:
            try:
                # Try to load trained tennis ball detection model
                import os
                from pathlib import Path
                
                # Path to trained ball detection model
                # __file__ is at: services/ml-pipeline/app/processors/enhanced_ball_tracker.py
                # Structure: project_root/services/ml-pipeline/app/processors/enhanced_ball_tracker.py
                # We need to go up 4 levels: processors/ -> app/ -> ml-pipeline/ -> services/ -> project_root
                current_file = Path(__file__).resolve()
                project_root = current_file.parent.parent.parent.parent.parent
                trained_model_path = project_root / 'runs' / 'detect' / 'tennis_ball_detector' / 'weights' / 'best.pt'
                
                # Also try alternative paths in case we're running from a different location
                if not trained_model_path.exists():
                    # Try relative to current working directory
                    alt_path = Path('runs/detect/tennis_ball_detector/weights/best.pt')
                    if alt_path.exists():
                        trained_model_path = alt_path.resolve()
                    else:
                        # Try from services/ml-pipeline directory
                        alt_path2 = Path(__file__).parent.parent.parent / 'runs' / 'detect' / 'tennis_ball_detector' / 'weights' / 'best.pt'
                        if alt_path2.exists():
                            trained_model_path = alt_path2.resolve()
                
                if trained_model_path.exists():
                    log_info(f"Loading trained ball detection model: {trained_model_path}")
                    self.detection_model = YOLO(str(trained_model_path))
                    log_info("✓ Trained ball detection model loaded successfully")
                else:
                    # Fallback to generic YOLOv8n
                    log_warning(f"Trained model not found at {trained_model_path}, using generic YOLOv8n")
                    self.detection_model = YOLO('yolov8n.pt')
            except Exception as e:
                log_warning(f"Could not load YOLOv8 model: {e}")
                self.detection_model = None
        else:
            self.detection_model = None
        
        # Color-based detection as fallback
        self.ball_color_range = {
            'yellow': ([20, 100, 100], [30, 255, 255]),  # HSV range for yellow
            'white': ([0, 0, 200], [180, 30, 255])  # HSV range for white
        }
        self.min_ball_radius = 3
        self.max_ball_radius = 15
        
        # Trajectory history for interpolation and analysis
        self.trajectory_history = []
        self.detection_count = 0
        self.total_frames = 0
    
    async def track(self, frame: np.ndarray, timestamp: float, court_calibration=None) -> Optional[BallDetection]:
        """
        Track ball in a frame using YOLOv8 + Kalman filter
        
        Args:
            frame: Video frame
            timestamp: Frame timestamp in seconds
            court_calibration: Optional court calibration for coordinate conversion
            
        Returns:
            BallDetection if ball found/predicted, None otherwise
        """
        self.total_frames += 1
        detected_position = None
        confidence = 0.0
        is_detected = False
        
        # Method 1: Try YOLOv8 detection
        if self.detection_model:
            detected_position, confidence = await self._detect_with_yolo(frame)
            if detected_position:
                is_detected = True
                self.detection_count += 1
        
        # Method 2: Fallback to color-based detection
        if not detected_position:
            detected_position, confidence = await self._detect_with_color(frame)
            if detected_position:
                is_detected = True
                self.detection_count += 1
        
        # Use Kalman filter to smooth trajectory
        if detected_position:
            # Update Kalman filter with detection
            smoothed_position = self.kalman_filter.update(detected_position)
            raw_position = detected_position
        else:
            # Predict position using Kalman filter
            smoothed_position = self.kalman_filter.predict()
            raw_position = smoothed_position  # Use predicted position as raw
            confidence = 0.5  # Lower confidence for predicted positions
        
        # Get smoothed velocity
        velocity = self.kalman_filter.get_velocity()
        
        # Calculate speed in m/s
        speed_mps = self._calculate_speed_mps(velocity) if velocity else None
        
        # Detect bounce
        is_bounce = self._detect_bounce(velocity)
        
        detection = BallDetection(
            timestamp=timestamp,
            position=smoothed_position,
            raw_position=raw_position,
            confidence=confidence,
            velocity=velocity,
            speed_mps=speed_mps,
            is_bounce=is_bounce,
            is_detected=is_detected
        )
        
        # Update trajectory history
        self.trajectory_history.append(detection)
        if len(self.trajectory_history) > 60:  # Keep last 60 frames (~2 seconds at 30fps)
            self.trajectory_history.pop(0)
        
        return detection
    
    async def _detect_with_yolo(self, frame: np.ndarray) -> Tuple[Optional[Tuple[float, float]], float]:
        """Detect ball using YOLOv8 (trained model or generic)"""
        try:
            # Run YOLOv8 detection with lower confidence for ball detection
            results = self.detection_model(frame, verbose=False, conf=0.15)
            
            # Look for ball detections
            best_detection = None
            best_confidence = 0.0
            
            for result in results:
                boxes = result.boxes
                if boxes is not None and len(boxes) > 0:
                    for box in boxes:
                        conf = float(box.conf[0])
                        
                        # For trained ball detector, class 0 is tennis_ball
                        # For generic YOLOv8, check if it's a sports ball (class 32) or filter by size
                        cls_id = int(box.cls[0]) if hasattr(box, 'cls') and len(box.cls) > 0 else None
                        
                        bbox = box.xyxy[0].cpu().numpy()
                        width = bbox[2] - bbox[0]
                        height = bbox[3] - bbox[1]
                        
                        # Check if this is a ball detection:
                        # 1. If using trained model, cls_id should be 0 (tennis_ball)
                        # 2. If using generic model, check for sports ball class or small circular object
                        is_ball = False
                        if cls_id == 0:  # Trained model: class 0 is tennis_ball
                            is_ball = True
                        elif cls_id == 32:  # Generic YOLOv8: class 32 is sports ball
                            # Additional size check for generic model
                            if 3 < width < 50 and 3 < height < 50:
                                is_ball = True
                        else:
                            # Fallback: check by size for any small object
                            if 3 < width < 30 and 3 < height < 30:
                                is_ball = True
                        
                        if is_ball and conf > best_confidence:
                            center_x = (bbox[0] + bbox[2]) / 2
                            center_y = (bbox[1] + bbox[3]) / 2
                            best_detection = (float(center_x), float(center_y))
                            best_confidence = conf
            
            return best_detection, best_confidence
        
        except Exception as e:
            log_error(f"Error in YOLO detection: {e}")
            return None, 0.0
    
    async def _detect_with_color(self, frame: np.ndarray) -> Tuple[Optional[Tuple[float, float]], float]:
        """Fallback color-based detection"""
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
        
        # Filter contours by size and circularity
        best_contour = None
        best_circularity = 0.0
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 10 or area > 500:
                continue
            
            perimeter = cv2.arcLength(contour, True)
            if perimeter == 0:
                continue
            
            circularity = 4 * np.pi * area / (perimeter * perimeter)
            
            if circularity > 0.5 and circularity > best_circularity:
                best_contour = contour
                best_circularity = circularity
        
        if best_contour is not None:
            (x, y), radius = cv2.minEnclosingCircle(best_contour)
            return (float(x), float(y)), float(best_circularity)
        
        return None, 0.0
    
    def _calculate_speed_mps(self, velocity: Tuple[float, float]) -> float:
        """Calculate ball speed in meters per second"""
        vx, vy = velocity
        speed_pixels_per_frame = np.sqrt(vx**2 + vy**2)
        
        # Convert to m/s
        # Assuming 30 fps: pixels/frame * fps = pixels/second
        fps = 30
        speed_pixels_per_sec = speed_pixels_per_frame * fps
        speed_mps = speed_pixels_per_sec * self.pixel_to_meter_ratio
        
        return speed_mps
    
    def _detect_bounce(self, velocity: Optional[Tuple[float, float]]) -> bool:
        """Detect if ball bounced (sudden change in y-velocity)"""
        if velocity is None or len(self.trajectory_history) < 2:
            return False
        
        prev_detection = self.trajectory_history[-2]
        if prev_detection.velocity is None:
            return False
        
        prev_vy = prev_detection.velocity[1]
        current_vy = velocity[1]
        
        # Detect sudden change in y-velocity direction (bounce)
        # Ball should reverse vertical direction or slow down significantly
        vy_change = abs(current_vy - prev_vy)
        vy_reversal = (prev_vy > 0 and current_vy < 0) or (prev_vy < 0 and current_vy > 0)
        
        return vy_reversal and vy_change > 30  # Threshold for bounce detection
    
    def get_detection_rate(self) -> float:
        """Get ball detection rate"""
        if self.total_frames == 0:
            return 0.0
        return self.detection_count / self.total_frames
    
    def get_trajectory(self) -> List[BallDetection]:
        """Get full trajectory history"""
        return self.trajectory_history.copy()


