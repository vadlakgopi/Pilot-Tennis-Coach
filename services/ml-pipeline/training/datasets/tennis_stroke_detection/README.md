# Tennis Stroke Detection Dataset

## 📊 Dataset Information

**Source:** Roboflow - Tennis Annotations v3
**Format:** YOLOv8 (object detection)
**Classes:** 11 stroke/pose classes

## 🎯 Classes

1. **backhand-finish** - Backhand follow-through
2. **backhand-ready** - Backhand preparation
3. **backhand-stroke** - Backhand contact
4. **forehand-finish** - Forehand follow-through
5. **forehand-ready** - Forehand preparation
6. **forehand-stroke** - Forehand contact
7. **ready-position** - Ready stance
8. **serve_followthrough** - Serve follow-through
9. **serve_hit** - Serve contact
10. **serve_ready** - Serve preparation
11. **serve_toss** - Serve toss

## 📁 Dataset Structure

```
tennis_stroke_detection/
├── train/
│   ├── images/
│   └── labels/
├── valid/
│   ├── images/
│   └── labels/
├── test/
│   ├── images/
│   └── labels/
└── data.yaml
```

## 🚀 Training

This dataset can be used to train a YOLOv8 model to detect different tennis stroke phases:

```bash
cd services/ml-pipeline/training
source ../venv/bin/activate
python train_ball_detector.py \
  --data datasets/tennis_stroke_detection \
  --epochs 100 \
  --model n \
  --name tennis_stroke_detector
```

## 💡 Use Cases

This model can be used to:
- Detect stroke phases in real-time
- Classify shot types based on detected phases
- Analyze stroke mechanics
- Track player movements

## ⚠️ Note

This is **different from shot classification**:
- **This dataset**: Detects stroke phases in single frames (object detection)
- **Shot classification**: Classifies complete shots using pose sequences over time (LSTM)

Both can be useful for different purposes!




