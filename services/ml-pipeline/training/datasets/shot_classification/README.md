# Shot Classification Dataset

## 📁 Location

Copy your shot classification dataset JSON files to this directory:
```
services/ml-pipeline/training/datasets/shot_classification/
```

## 📋 Expected Format

Each JSON file should contain a shot sequence with the following structure:

```json
{
  "shot_id": 1,
  "shot_type": "forehand",
  "pose_sequence": [
    [x1, y1, z1, v1, x2, y2, z2, v2, ...],  // Frame 1: 33 keypoints × 4 = 132 values
    [x2, y2, z2, v2, x2, y2, z2, v2, ...],  // Frame 2
    ...  // 11 frames total (5 before + contact + 5 after)
  ],
  "ball_trajectory": [...],  // Optional
  "court_position": [x, y],  // Optional
  "timestamp": 12.5  // Optional
}
```

### Required Fields:
- **shot_type**: One of: `forehand`, `backhand`, `volley`, `serve`, `smash`, `overhead`
- **pose_sequence**: Array of arrays, each with 132 values (33 keypoints × 4)

### Pose Sequence Details:
- **Length**: Should be 11 frames (will be padded/truncated if different)
- **Features per frame**: 132 (33 keypoints × 4 values)
  - Each keypoint has: x, y, z, visibility
- **Keypoints**: MediaPipe pose landmarks (33 points)

## 📊 Dataset Structure

```
datasets/shot_classification/
├── shot_0001.json
├── shot_0002.json
├── shot_0003.json
├── ...
└── shot_1000.json
```

## ✅ Validation

After copying your files, validate the dataset:

```bash
cd services/ml-pipeline/training
source ../venv/bin/activate
python -c "
from train_shot_classifier import load_shot_data
import sys
try:
    sequences, labels, classes = load_shot_data('datasets/shot_classification')
    print(f'✓ Dataset valid!')
    print(f'  Total shots: {len(sequences)}')
    print(f'  Classes: {classes}')
    print(f'  Sequence shape: {sequences.shape}')
except Exception as e:
    print(f'✗ Error: {e}')
    sys.exit(1)
"
```

## 🚀 Training

Once your dataset is in place, train the model:

```bash
cd services/ml-pipeline/training
source ../venv/bin/activate
python train_shot_classifier.py \
  --data datasets/shot_classification \
  --epochs 100 \
  --batch-size 32
```

## 📝 Notes

- **File naming**: Can be any name ending in `.json`
- **Minimum dataset**: 100+ shots recommended (50+ for quick test)
- **Class balance**: Try to have similar numbers of each shot type
- **Sequence length**: Will be automatically padded/truncated to 11 frames
- **Feature size**: Will be automatically padded/truncated to 132 features




