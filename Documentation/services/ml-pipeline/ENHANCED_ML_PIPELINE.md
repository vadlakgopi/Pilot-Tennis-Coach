# Enhanced ML Pipeline Implementation Guide

This document outlines the enhanced ML pipeline components based on the user stories requirements.

## Implemented Components

### 1. Enhanced Court Detector (`enhanced_court_detector.py`)
- **Model**: YOLOv8 for court line detection
- **Features**:
  - Court line detection with YOLOv8
  - Homography matrix generation for perspective transformation
  - Pixel-to-meter ratio calculation
  - Court corner detection

### 2. Enhanced Player Tracker (`enhanced_player_tracker.py`)
- **Model**: DeepSORT + YOLOv8 + MediaPipe Pose
- **Features**:
  - Persistent player identification (Player 1 vs Player 2)
  - Movement speed calculation
  - Distance traveled tracking
  - Pose keypoint extraction (33 points) for shot classification
  - Unique tracking IDs maintained across frames

### 3. Enhanced Ball Tracker (`enhanced_ball_tracker.py`)
- **Model**: YOLOv8 + Kalman Filter
- **Features**:
  - >90% frame detection target
  - Trajectory smoothing with Kalman filter
  - Speed calculation in m/s
  - Bounce detection
  - Interpolation for missed detections

### 4. Enhanced Shot Classifier (TODO)
- **Model**: Pose Estimation (MediaPipe/MoveNet) + LSTM
- **Target Accuracy**: >80%
- **Features**:
  - Shot type classification (forehand, backhand, volley, serve, smash)
  - Shot outcome detection (winner, error, in_play)
  - Shot direction (cross-court, down-the-line)
  - Court position mapping

### 5. Serve Type Classifier (TODO)
- **Model**: Pose Estimation + Speed Model + LSTM
- **Features**:
  - Serve type classification (flat, slice, kick)
  - Serve speed estimation
  - Serve placement analysis

## Integration Steps

### Step 1: Update Video Processor

Update `app/processors/video_processor.py` to use enhanced components:

```python
from app.processors.enhanced_court_detector import EnhancedCourtDetector
from app.processors.enhanced_player_tracker import EnhancedPlayerTracker
from app.processors.enhanced_ball_tracker import EnhancedBallTracker

class VideoProcessor:
    def __init__(self, match_id: int, video_path: str):
        self.court_detector = EnhancedCourtDetector()
        self.player_tracker = EnhancedPlayerTracker()
        self.ball_tracker = EnhancedBallTracker()
        # ...
```

### Step 2: Install Dependencies

```bash
cd services/ml-pipeline
source venv/bin/activate
pip install -r requirements.txt
```

Required packages (already in requirements.txt):
- `ultralytics` - YOLOv8
- `mediapipe` - Pose estimation
- `opencv-python` - Computer vision
- `numpy`, `scipy` - Numerical operations

### Step 3: Enhanced Analytics Features

#### Player Movement Heatmap
- Generated from player tracking data
- Uses court coordinates from homography
- Zone-based visualization

#### Shot Placement Analysis
- Maps ball landing spots using homography
- Clustering analysis for pattern detection
- Court coordinate transformation

#### Serve Speed Estimation
- Calculated from ball trajectory
- Uses Kalman filter velocity
- Converted to m/s using pixel-to-meter ratio

#### Player Fitness Indicators
- Distance per rally
- Match total distance
- Average and max speed
- Movement efficiency metrics

#### Stroke-Level Summary
- Each stroke labeled with outcome
- Shot type and direction
- Error detection (unforced vs forced)
- Statistics aggregation

## Usage

### Basic Usage

The enhanced components can be used by updating the video processor:

```python
processor = VideoProcessor(match_id=1, video_path="video.mp4")
result = await processor.process()
```

### Configuration

Set pixel-to-meter ratio for accurate measurements:

```python
# Get from court calibration
pixel_to_meter = court_calibration.pixel_to_meter_ratio
ball_tracker = EnhancedBallTracker(pixel_to_meter_ratio=pixel_to_meter)
```

## Model Training Notes

For production, custom-trained models are recommended:

1. **Court Detection Model**: Train YOLOv8 on tennis court images
2. **Ball Detection Model**: Train YOLOv8 on tennis ball images
3. **Shot Classification Model**: Train LSTM on pose sequences + ball trajectory
4. **Serve Classification Model**: Train LSTM on serve-specific features

## Performance Targets

- **Ball Detection**: >90% frame detection rate
- **Shot Classification**: >80% accuracy
- **Player Tracking**: Persistent IDs across entire video
- **Rally Detection**: Continuous ball exchanges identified

## Next Steps

1. Implement enhanced shot classifier with LSTM
2. Implement serve type classifier
3. Enhance analytics engine with all new features
4. Add heatmap generation
5. Add shot placement clustering
6. Integrate all components into main video processor





