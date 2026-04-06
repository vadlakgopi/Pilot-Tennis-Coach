#!/bin/bash

# Script to monitor ball detection training and automatically start stroke detection training when complete

BALL_TRAINING_LOG="training.log"
BALL_TRAINING_DIR="runs/detect/tennis_ball_detector"
STROKE_DATASET="datasets/tennis_stroke_detection"
CHECK_INTERVAL=30  # Check every 30 seconds

echo "🎾 Monitoring Ball Detection Training"
echo "====================================="
echo ""
echo "Waiting for ball detection training to complete..."
echo "Checking every $CHECK_INTERVAL seconds..."
echo ""

# Function to check if ball detection training is complete
check_ball_training_complete() {
    # Check if training process is still running
    if ps aux | grep -v grep | grep -q "train_ball_detector.*tennis_ball_detector"; then
        return 1  # Still running
    fi
    
    # Check if training log shows completion
    if [ -f "$BALL_TRAINING_LOG" ]; then
        if grep -q "Training completed\|Training finished\|All epochs completed" "$BALL_TRAINING_LOG" 2>/dev/null; then
            return 0  # Completed
        fi
    fi
    
    # Check if best model exists (indicates training completed)
    if [ -f "$BALL_TRAINING_DIR/weights/best.pt" ]; then
        # Check if training process is not running
        if ! ps aux | grep -v grep | grep -q "train_ball_detector.*tennis_ball_detector"; then
            return 0  # Completed
        fi
    fi
    
    return 1  # Still running or not started
}

# Function to get current epoch from log
get_current_epoch() {
    if [ -f "$BALL_TRAINING_LOG" ]; then
        # Try to extract epoch number from log
        tail -50 "$BALL_TRAINING_LOG" | grep -oE "Epoch \[[0-9]+/[0-9]+\]" | tail -1 | grep -oE "[0-9]+/[0-9]+" || echo "?"
    else
        echo "?"
    fi
}

# Monitor training
while true; do
    if check_ball_training_complete; then
        echo ""
        echo "✅ Ball detection training completed!"
        echo ""
        break
    fi
    
    # Show progress
    epoch=$(get_current_epoch)
    echo -ne "\r⏳ Ball detection training in progress... Epoch: $epoch (checking every ${CHECK_INTERVAL}s)"
    
    sleep $CHECK_INTERVAL
done

echo ""
echo "🔍 Verifying ball detection training completion..."
echo ""

# Verify training completed successfully
if [ -f "$BALL_TRAINING_DIR/weights/best.pt" ]; then
    echo "✓ Best model found: $BALL_TRAINING_DIR/weights/best.pt"
else
    echo "⚠ Warning: Best model not found. Training may have failed."
    echo "Check training log: $BALL_TRAINING_LOG"
    read -p "Continue with stroke detection training anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🚀 Starting Stroke Detection Training"
echo "======================================"
echo ""
echo "Dataset: $STROKE_DATASET"
echo "Model: YOLOv8n (nano)"
echo "Epochs: 100"
echo ""

cd "$(dirname "$0")"
source ../venv/bin/activate

# Start stroke detection training
python train_ball_detector.py \
    --data "$STROKE_DATASET" \
    --epochs 100 \
    --model n \
    --batch 16 \
    --name tennis_stroke_detector

TRAINING_EXIT_CODE=$?

echo ""
if [ $TRAINING_EXIT_CODE -eq 0 ]; then
    echo "✅ Stroke detection training completed successfully!"
    echo ""
    echo "Model saved to: runs/detect/tennis_stroke_detector/weights/best.pt"
else
    echo "❌ Stroke detection training failed with exit code: $TRAINING_EXIT_CODE"
    echo "Check the output above for errors."
    exit $TRAINING_EXIT_CODE
fi




