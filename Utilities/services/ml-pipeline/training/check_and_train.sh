#!/bin/bash

# Script to check if ultralytics is installed and start training

echo "Checking ultralytics installation..."

cd /Users/sireeshanaroju/Desktop/Pilot-Tennis-Coach/Pilot-Tennis-Coach/services/ml-pipeline
source venv/bin/activate

# Check if ultralytics is installed
python -c "from ultralytics import YOLO" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Ultralytics is installed!"
    echo ""
    echo "Starting training..."
    echo ""
    
    cd training
    
    # Validate dataset first
    echo "Validating dataset..."
    python train_ball_detector.py --data datasets/roboflow_tennis --validate-only
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "Dataset validated! Starting training..."
        echo ""
        echo "Training with:"
        echo "  - Model: YOLOv8n (nano - fastest)"
        echo "  - Epochs: 50"
        echo "  - Batch size: 16"
        echo ""
        echo "This will take approximately 30-60 minutes..."
        echo ""
        
        python train_ball_detector.py \
            --data datasets/roboflow_tennis \
            --epochs 50 \
            --model n \
            --batch 16 \
            --name tennis_ball_detector
        
        echo ""
        echo "✓ Training completed!"
        echo "Model saved to: runs/detect/tennis_ball_detector/weights/best.pt"
    else
        echo "✗ Dataset validation failed. Please check the dataset structure."
    fi
else
    echo "✗ Ultralytics is not installed yet."
    echo ""
    echo "Installation is still in progress. Please wait..."
    echo ""
    echo "To check installation status, run:"
    echo "  cd services/ml-pipeline"
    echo "  source venv/bin/activate"
    echo "  pip list | grep ultralytics"
    echo ""
    echo "Or wait a few more minutes and run this script again:"
    echo "  bash training/check_and_train.sh"
fi




