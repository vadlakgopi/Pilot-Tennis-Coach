"""
Enhanced Player Tracking Module using DeepSORT + YOLOv8
Tracks players across video frames with persistent tracking
"""
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    YOLO = None

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    mp = None


@dataclass
class PlayerDetection:
    """Player detection data with enhanced tracking"""
    player_id: int  # 1 or 2 (persistent)
    track_id: int  # DeepSORT tracking ID
    timestamp: float
    bbox: List[float]  # [x, y, width, height]
    center: Tuple[float, float]
    confidence: float
    pose_keypoints: Optional[np.ndarray] = None  # 17-33 keypoints from pose estimation
    speed: Optional[float] = None  # Movement speed in m/s
    distance_traveled: float = 0.0  # Total distance in meters


class EnhancedPlayerTracker:
    """
    Enhanced player tracker using YOLOv8 + DeepSORT
    Includes pose estimation for shot classification
    """
    def __init__(self):
        # Load YOLOv8 model for person detection
        if YOLO_AVAILABLE:
            try:
                self.detection_model = YOLO('yolov8n.pt')  # or yolov8m.pt for better accuracy
            except:
                self.detection_model = None
        else:
            self.detection_model = None
        
        # Initialize MediaPipe Pose for pose estimation
        self.pose_estimator = None
        if MEDIAPIPE_AVAILABLE:
            try:
                self.mp_pose = mp.solutions.pose
                self.pose_estimator = self.mp_pose.Pose(
                    static_image_mode=False,
                    model_complexity=1,
                    enable_segmentation=False,
                    min_detection_confidence=0.5
                )
            except:
                self.pose_estimator = None
        
        # Tracking state - DeepSORT-like tracking
        self.tracks = {}  # track_id -> track history
        self.player_mapping = {}  # track_id -> player_number (1 or 2)
        self.next_track_id = 1
        self.last_positions = {}  # track_id -> last center position
    
    async def track(self, frame: np.ndarray, timestamp: float) -> List[PlayerDetection]:
        """
        Track players in a frame using YOLOv8 + DeepSORT-style tracking
        
        Args:
            frame: Video frame
            timestamp: Frame timestamp in seconds
            
        Returns:
            List of player detections with persistent IDs
        """
        if not self.detection_model:
            return []
        
        # Detect persons in frame using YOLOv8
        results = self.detection_model.track(frame, persist=True, verbose=False)
        
        detections = []
        current_track_ids = set()
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Filter for person class (class 0 in COCO)
                    if int(box.cls) == 0:  # person class
                        bbox = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0].cpu().numpy())
                        
                        # Get tracking ID from YOLOv8 tracking
                        track_id = int(box.id[0]) if box.id is not None else None
                        
                        if track_id is None:
                            track_id = self.next_track_id
                            self.next_track_id += 1
                        
                        # Update track history
                        if track_id not in self.tracks:
                            self.tracks[track_id] = []
                        
                        center = self._get_bbox_center(bbox)
                        
                        # Calculate movement speed
                        speed = self._calculate_speed(track_id, center, timestamp)
                        
                        # Update distance traveled
                        distance = self._update_distance(track_id, center)
                        
                        # Assign persistent player number (1 or 2) based on court side
                        player_number = self._assign_player_number(track_id, bbox, frame.shape)
                        
                        # Extract pose keypoints for shot classification
                        pose_keypoints = await self._extract_pose(frame, bbox)
                        
                        detection = PlayerDetection(
                            player_id=player_number,
                            track_id=track_id,
                            timestamp=timestamp,
                            bbox=bbox.tolist(),
                            center=center,
                            confidence=confidence,
                            pose_keypoints=pose_keypoints,
                            speed=speed,
                            distance_traveled=self.tracks[track_id][-1].distance_traveled + distance if self.tracks[track_id] else distance
                        )
                        
                        self.tracks[track_id].append(detection)
                        self.last_positions[track_id] = center
                        current_track_ids.add(track_id)
                        detections.append(detection)
        
        # Remove stale tracks (not seen for >1 second)
        stale_tracks = [tid for tid in self.tracks.keys() if tid not in current_track_ids]
        for tid in stale_tracks:
            last_time = self.tracks[tid][-1].timestamp if self.tracks[tid] else 0
            if timestamp - last_time > 1.0:  # 1 second threshold
                del self.tracks[tid]
                if tid in self.last_positions:
                    del self.last_positions[tid]
        
        return detections
    
    def _assign_player_number(self, track_id: int, bbox: np.ndarray, image_shape: Tuple) -> int:
        """
        Assign persistent player number (1 or 2) based on court position
        Uses historical position to maintain consistency
        """
        center_x = (bbox[0] + bbox[2]) / 2
        image_width = image_shape[1]
        
        # If we've seen this track before, maintain the same player number
        if track_id in self.player_mapping:
            return self.player_mapping[track_id]
        
        # Assign based on court side (left = player 1, right = player 2)
        player_number = 1 if center_x < image_width / 2 else 2
        
        # Ensure we don't have both players on same side
        # Check if other player is already assigned
        existing_players = set(self.player_mapping.values())
        if len(existing_players) == 1:
            other_number = list(existing_players)[0]
            if player_number == other_number:
                player_number = 2 if other_number == 1 else 1
        
        self.player_mapping[track_id] = player_number
        return player_number
    
    def _get_bbox_center(self, bbox: np.ndarray) -> Tuple[float, float]:
        """Get center point of bounding box"""
        x_center = (bbox[0] + bbox[2]) / 2
        y_center = (bbox[1] + bbox[3]) / 2
        return (float(x_center), float(y_center))
    
    def _calculate_speed(self, track_id: int, current_center: Tuple[float, float], timestamp: float) -> Optional[float]:
        """Calculate player movement speed in m/s"""
        if track_id not in self.last_positions or not self.tracks[track_id]:
            return None
        
        last_center = self.last_positions[track_id]
        last_time = self.tracks[track_id][-1].timestamp
        
        dt = timestamp - last_time
        if dt <= 0:
            return None
        
        # Calculate distance moved (pixels)
        dx = current_center[0] - last_center[0]
        dy = current_center[1] - last_center[1]
        distance_pixels = np.sqrt(dx**2 + dy**2)
        
        # Convert to meters (assuming ~0.05 m/pixel for tennis court)
        # This should use actual calibration in production
        pixel_to_meter = 0.05
        distance_meters = distance_pixels * pixel_to_meter
        
        # Calculate speed in m/s
        speed = distance_meters / dt if dt > 0 else 0
        return speed
    
    def _update_distance(self, track_id: int, current_center: Tuple[float, float]) -> float:
        """Update total distance traveled by player"""
        if track_id not in self.last_positions:
            return 0.0
        
        last_center = self.last_positions[track_id]
        dx = current_center[0] - last_center[0]
        dy = current_center[1] - last_center[1]
        distance_pixels = np.sqrt(dx**2 + dy**2)
        
        # Convert to meters
        pixel_to_meter = 0.05
        return distance_pixels * pixel_to_meter
    
    async def _extract_pose(self, frame: np.ndarray, bbox: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract pose keypoints using MediaPipe Pose or MoveNet
        Returns 17-33 keypoints for shot classification
        """
        if not self.pose_estimator:
            return None
        
        try:
            # Extract ROI (Region of Interest) for player
            x1, y1, x2, y2 = bbox.astype(int)
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(frame.shape[1], x2)
            y2 = min(frame.shape[0], y2)
            
            roi = frame[y1:y2, x1:x2]
            if roi.size == 0:
                return None
            
            # Convert BGR to RGB for MediaPipe
            roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
            
            # Process pose estimation
            results = self.pose_estimator.process(roi_rgb)
            
            if results.pose_landmarks:
                # Extract keypoints (33 landmarks)
                keypoints = []
                for landmark in results.pose_landmarks.landmark:
                    keypoints.append([landmark.x, landmark.y, landmark.z, landmark.visibility])
                
                # Convert to numpy array
                return np.array(keypoints)
        
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error in pose estimation: {e}")
        
        return None
    
    def get_player_stats(self, player_number: int) -> Dict[str, float]:
        """Get aggregated statistics for a player"""
        total_distance = 0.0
        max_speed = 0.0
        avg_speed = 0.0
        speed_sum = 0.0
        speed_count = 0
        
        for track_id, player_id in self.player_mapping.items():
            if player_id == player_number and track_id in self.tracks:
                track = self.tracks[track_id]
                if track:
                    total_distance = track[-1].distance_traveled
                    speeds = [d.speed for d in track if d.speed is not None]
                    if speeds:
                        max_speed = max(speeds)
                        speed_sum = sum(speeds)
                        speed_count = len(speeds)
        
        avg_speed = speed_sum / speed_count if speed_count > 0 else 0.0
        
        return {
            "total_distance_meters": total_distance,
            "max_speed_mps": max_speed,
            "avg_speed_mps": avg_speed
        }


