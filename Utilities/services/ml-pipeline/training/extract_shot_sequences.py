"""
Script to extract shot sequences from tennis videos for shot classification training
This script uses the trained ball detector to find shots and extracts pose keypoints
"""
import cv2
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional
import argparse

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("Warning: ultralytics not available. Install with: pip install ultralytics")

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    print("Warning: mediapipe not available. Install with: pip install mediapipe")


class ShotSequenceExtractor:
    """Extract shot sequences from tennis videos"""
    
    def __init__(self, ball_model_path: str):
        """
        Initialize extractor
        
        Args:
            ball_model_path: Path to trained ball detection model
        """
        # Load ball detection model
        if YOLO_AVAILABLE:
            self.ball_model = YOLO(ball_model_path)
        else:
            self.ball_model = None
            print("Warning: Ball model not loaded. Ball detection will be skipped.")
        
        # Initialize MediaPipe Pose
        if MEDIAPIPE_AVAILABLE:
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                static_image_mode=False,
                model_complexity=2,
                enable_segmentation=False,
                min_detection_confidence=0.5
            )
        else:
            self.pose = None
            print("Warning: MediaPipe not available. Pose extraction will be skipped.")
    
    def extract_pose_keypoints(self, frame: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract pose keypoints from frame
        
        Returns:
            Array of 33 keypoints × 4 values (x, y, z, visibility) = 132 features
            Or None if pose not detected
        """
        if self.pose is None:
            return None
        
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process frame
        results = self.pose.process(rgb_frame)
        
        if results.pose_landmarks is None:
            return None
        
        # Extract keypoints
        keypoints = []
        for landmark in results.pose_landmarks.landmark:
            keypoints.extend([
                landmark.x,      # Normalized x
                landmark.y,      # Normalized y
                landmark.z,       # Depth
                landmark.visibility  # Visibility score
            ])
        
        return np.array(keypoints)
    
    def find_shot_events(self, video_path: str, threshold: float = 50.0) -> List[Dict]:
        """
        Find shot events in video using ball detection
        
        Args:
            video_path: Path to video file
            threshold: Distance threshold for ball-player contact (pixels)
        
        Returns:
            List of shot events with timestamps
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        shot_events = []
        frame_number = 0
        prev_ball_pos = None
        
        print(f"Processing video: {video_path}")
        print(f"Total frames: {total_frames}, FPS: {fps}")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            timestamp = frame_number / fps
            
            # Detect ball
            ball_pos = None
            if self.ball_model:
                results = self.ball_model(frame, verbose=False, conf=0.25)
                for result in results:
                    boxes = result.boxes
                    if boxes is not None and len(boxes) > 0:
                        # Get first detection (assuming one ball)
                        box = boxes[0]
                        bbox = box.xyxy[0].cpu().numpy()
                        center_x = (bbox[0] + bbox[2]) / 2
                        center_y = (bbox[1] + bbox[3]) / 2
                        ball_pos = (center_x, center_y)
            
            # Detect players (simplified - using person detection)
            # In production, use player tracker
            player_positions = []
            if self.ball_model:
                # Use YOLOv8 person detection (class 0)
                results = self.ball_model(frame, verbose=False, classes=[0], conf=0.25)
                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        for box in boxes:
                            bbox = box.xyxy[0].cpu().numpy()
                            center_x = (bbox[0] + bbox[2]) / 2
                            center_y = (bbox[1] + bbox[3]) / 2
                            player_positions.append((center_x, center_y))
            
            # Check for ball-player contact (shot event)
            if ball_pos and player_positions:
                for player_pos in player_positions:
                    distance = np.sqrt(
                        (ball_pos[0] - player_pos[0])**2 + 
                        (ball_pos[1] - player_pos[1])**2
                    )
                    
                    if distance < threshold:
                        # Potential shot event
                        shot_events.append({
                            'timestamp': timestamp,
                            'frame_number': frame_number,
                            'ball_position': ball_pos,
                            'player_position': player_pos
                        })
            
            prev_ball_pos = ball_pos
            frame_number += 1
            
            if frame_number % 100 == 0:
                print(f"Processed {frame_number}/{total_frames} frames, found {len(shot_events)} shots")
        
        cap.release()
        print(f"Found {len(shot_events)} potential shot events")
        return shot_events
    
    def extract_shot_sequence(
        self, 
        video_path: str, 
        shot_timestamp: float, 
        window_size: int = 5
    ) -> Optional[Dict]:
        """
        Extract pose sequence around shot timestamp
        
        Args:
            video_path: Path to video
            shot_timestamp: Timestamp of shot (seconds)
            window_size: Number of frames before/after (total: 2*window_size + 1)
        
        Returns:
            Dictionary with pose sequence and metadata
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        shot_frame = int(shot_timestamp * fps)
        
        # Extract frames around shot
        pose_sequence = []
        frame_numbers = []
        
        start_frame = max(0, shot_frame - window_size)
        end_frame = shot_frame + window_size + 1
        
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        
        for frame_num in range(start_frame, end_frame):
            ret, frame = cap.read()
            if not ret:
                break
            
            keypoints = self.extract_pose_keypoints(frame)
            if keypoints is not None:
                pose_sequence.append(keypoints.tolist())
                frame_numbers.append(frame_num)
            else:
                # Use zeros if pose not detected
                pose_sequence.append([0.0] * 132)
                frame_numbers.append(frame_num)
        
        cap.release()
        
        if len(pose_sequence) < 5:  # Need at least some frames
            return None
        
        return {
            'timestamp': shot_timestamp,
            'frame_numbers': frame_numbers,
            'pose_sequence': pose_sequence,
            'sequence_length': len(pose_sequence)
        }
    
    def process_video(
        self, 
        video_path: str, 
        output_dir: str,
        window_size: int = 5
    ) -> int:
        """
        Process video and extract all shot sequences
        
        Args:
            video_path: Path to input video
            output_dir: Directory to save shot sequences
            window_size: Frames before/after shot
        
        Returns:
            Number of shot sequences extracted
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Find shot events
        shot_events = self.find_shot_events(video_path)
        
        if not shot_events:
            print("No shot events found in video")
            return 0
        
        # Extract sequences
        extracted = 0
        for i, event in enumerate(shot_events):
            sequence = self.extract_shot_sequence(
                video_path, 
                event['timestamp'], 
                window_size
            )
            
            if sequence:
                # Save as JSON (will need manual labeling later)
                output_file = output_path / f"shot_{i:04d}.json"
                with open(output_file, 'w') as f:
                    json.dump({
                        'shot_id': i,
                        'timestamp': event['timestamp'],
                        'frame_number': event['frame_number'],
                        'ball_position': event['ball_position'],
                        'player_position': event['player_position'],
                        'pose_sequence': sequence['pose_sequence'],
                        'sequence_length': sequence['sequence_length'],
                        'shot_type': None  # To be labeled manually
                    }, f, indent=2)
                
                extracted += 1
                print(f"Extracted shot {i+1}/{len(shot_events)}")
        
        print(f"\nExtracted {extracted} shot sequences to {output_dir}")
        print(f"\nNext step: Manually label shot types in JSON files")
        print(f"  - Open each JSON file")
        print(f"  - Set 'shot_type' field to: forehand, backhand, volley, serve, smash, or overhead")
        
        return extracted


def main():
    parser = argparse.ArgumentParser(description='Extract shot sequences from tennis videos')
    parser.add_argument('--video', type=str, required=True,
                       help='Path to input video file')
    parser.add_argument('--ball-model', type=str, required=True,
                       help='Path to trained ball detection model (.pt file)')
    parser.add_argument('--output', type=str, default='./shot_sequences',
                       help='Output directory for shot sequences')
    parser.add_argument('--window-size', type=int, default=5,
                       help='Number of frames before/after shot (default: 5)')
    
    args = parser.parse_args()
    
    # Check if ball model exists
    if not Path(args.ball_model).exists():
        print(f"Error: Ball model not found: {args.ball_model}")
        print("Train ball detector first using train_ball_detector.py")
        return 1
    
    # Initialize extractor
    extractor = ShotSequenceExtractor(args.ball_model)
    
    # Process video
    try:
        count = extractor.process_video(args.video, args.output, args.window_size)
        print(f"\n✓ Successfully extracted {count} shot sequences")
        print(f"✓ Saved to: {args.output}")
        print(f"\nNext: Label shot types in JSON files, then train with train_shot_classifier.py")
        return 0
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())




