# ML Pipeline Training Scripts

This directory contains training scripts for the ML pipeline components.

## Scripts

### 1. `train_ball_detector.py`

Trains YOLOv8 model for tennis ball detection.

**Usage:**
```bash
# Validate dataset structure
python train_ball_detector.py --data /path/to/dataset --validate-only

# Train model
python train_ball_detector.py --data /path/to/dataset --epochs 100 --batch 16
```

**Dataset structure:**
```
dataset/
├── train/
│   ├── images/
│   │   ├── frame_001.jpg
│   │   ├── frame_002.jpg
│   │   └── ...
│   └── labels/
│       ├── frame_001.txt
│       ├── frame_002.txt
│       └── ...
├── val/
│   ├── images/
│   └── labels/
└── test/  # optional
    ├── images/
    └── labels/
```

**Label format (YOLO):**
```
0 0.523 0.456 0.012 0.012
```
- `0`: class ID (tennis ball)
- `0.523 0.456`: center x, center y (normalized 0-1)
- `0.012 0.012`: width, height (normalized 0-1)

**Options:**
- `--data`: Path to dataset directory (required)
- `--model`: Model size ('n', 's', 'm', 'l', 'x') - default: 'n'
- `--epochs`: Number of epochs - default: 100
- `--imgsz`: Image size - default: 640
- `--batch`: Batch size - default: 16
- `--name`: Project name - default: 'tennis_ball_detector'
- `--validate-only`: Only validate dataset, don't train

---

### 2. `train_shot_classifier.py`

Trains LSTM model for shot classification.

**Usage:**
```bash
python train_shot_classifier.py --data /path/to/annotations --epochs 100 --batch-size 32
```

**Data format:**

Each shot should be in a JSON file with the following structure:
```json
{
  "shot_id": 1,
  "shot_type": "forehand",
  "pose_sequence": [
    [x1, y1, z1, v1, x2, y2, z2, v2, ...],  // Frame 1: 33 keypoints × 4 = 132 values
    [x1, y1, z1, v1, x2, y2, z2, v2, ...],  // Frame 2
    ...  // 11 frames total (5 before + contact + 5 after)
  ],
  "ball_trajectory": [...],
  "court_position": [x, y],
  "timestamp": 12.5
}
```

**Options:**
- `--data`: Path to directory containing JSON files (required)
- `--epochs`: Number of epochs - default: 100
- `--batch-size`: Batch size - default: 32
- `--lr`: Learning rate - default: 0.001
- `--hidden-size`: LSTM hidden size - default: 128
- `--num-layers`: Number of LSTM layers - default: 2
- `--save`: Path to save model - default: 'shot_classifier_lstm.pt'

---

## Quick Start Guide

### Step 1: Prepare Ball Detection Dataset

1. Extract frames from tennis videos
2. Annotate balls using LabelImg or CVAT
3. Organize into train/val/test directories
4. Validate structure:
   ```bash
   python train_ball_detector.py --data /path/to/dataset --validate-only
   ```

### Step 2: Train Ball Detector

```bash
python train_ball_detector.py \
  --data /path/to/dataset \
  --model s \
  --epochs 100 \
  --batch 16
```

### Step 3: Use Trained Model

Update `enhanced_ball_tracker.py`:
```python
self.detection_model = YOLO('path/to/runs/detect/tennis_ball_detector/weights/best.pt')
```

### Step 4: Prepare Shot Classification Data

1. Extract shot sequences from videos
2. Extract pose keypoints using MediaPipe
3. Save as JSON files
4. Train model:
   ```bash
   python train_shot_classifier.py --data /path/to/annotations
   ```

---

## Annotation Tools

### For Ball Detection:
- **LabelImg**: https://github.com/tzutalin/labelImg
- **CVAT**: https://cvat.org/
- **Roboflow**: https://roboflow.com/

### For Shot Classification:
- Extract pose using MediaPipe
- Label shot types manually
- Use provided JSON format

---

## Tips

1. **Start small**: Begin with 200-500 images for ball detection
2. **Iterate**: Train, test, identify failures, collect more data
3. **Balance classes**: Ensure equal distribution of shot types
4. **Validate early**: Check dataset structure before training
5. **Monitor training**: Watch for overfitting, adjust learning rate

---

## Troubleshooting

### "No training images found"
- Check that images are in `train/images/` directory
- Ensure images are `.jpg` or `.png` format

### "Mismatch between images and labels"
- Each image should have a corresponding label file
- Label file name should match image name (e.g., `frame_001.jpg` → `frame_001.txt`)

### "CUDA out of memory"
- Reduce batch size: `--batch 8` or `--batch 4`
- Use smaller model: `--model n` instead of `--model s`

### "Low accuracy"
- Collect more training data
- Ensure annotations are accurate
- Check for class imbalance
- Try different model sizes




