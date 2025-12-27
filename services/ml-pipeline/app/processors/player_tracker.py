"""
Player Tracking Module
Tracks players across video frames using object detection and tracking
"""
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None  # Will fail gracefully if not installed


@dataclass
class PlayerDetection:
    """Player detection data"""
    player_id: int  # 1 or 2
    timestamp: float
    bbox: List[float]  # [x, y, width, height]
    center: Tuple[float, float]
    confidence: float
    pose_keypoints: Optional[np.ndarray] = None  # 17-33 keypoints


class PlayerTracker:
    def __init__(self):
        # Load YOLOv8 model for person detection
        if YOLO:
            self.detection_model = YOLO('yolov8n.pt')  # or yolov8m.pt for better accuracy
        else:
            self.detection_model = None
        
        # Tracking state
        self.tracks = {}  # player_id -> track history
        self.next_player_id = 1
    
    async def track(self, frame: np.ndarray, timestamp: float) -> List[PlayerDetection]:
        """
        Track players in a frame
        
        Args:
            frame: Video frame
            timestamp: Frame timestamp in seconds
            
        Returns:
            List of player detections
        """
        if not self.detection_model:
            return []  # Return empty if model not available
        
        # Detect persons in frame
        results = self.detection_model.track(frame, persist=True, verbose=False)
        
        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Filter for person class (class 0 in COCO)
                    if int(box.cls) == 0:  # person class
                        bbox = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0].cpu().numpy())
                        
                        # Get tracking ID if available
                        track_id = int(box.id[0]) if box.id is not None else None
                        
                        # Assign player number (1 or 2) based on court side
                        player_number = self._assign_player_number(bbox, frame.shape)
                        
                        # Extract pose keypoints (if using pose estimation model)
                        pose_keypoints = await self._extract_pose(frame, bbox)
                        
                        detection = PlayerDetection(
                            player_id=player_number,
                            timestamp=timestamp,
                            bbox=bbox.tolist(),
                            center=self._get_bbox_center(bbox),
                            confidence=confidence,
                            pose_keypoints=pose_keypoints
                        )
                        detections.append(detection)
        
        return detections
    
    def _assign_player_number(self, bbox: np.ndarray, image_shape: Tuple) -> int:
        """
        Assign player number (1 or 2) based on court position
        """
        # Simplified: assign based on x-coordinate
        # In production, use court calibration to determine which side
        center_x = (bbox[0] + bbox[2]) / 2
        image_width = image_shape[1]
        
        return 1 if center_x < image_width / 2 else 2
    
    def _get_bbox_center(self, bbox: np.ndarray) -> Tuple[float, float]:
        """Get center point of bounding box"""
        x_center = (bbox[0] + bbox[2]) / 2
        y_center = (bbox[1] + bbox[3]) / 2
        return (float(x_center), float(y_center))
    
    async def _extract_pose(self, frame: np.ndarray, bbox: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract pose keypoints using MediaPipe or MoveNet
        """
        # TODO: Integrate MediaPipe Pose or MoveNet
        # For now, return None
        return None

