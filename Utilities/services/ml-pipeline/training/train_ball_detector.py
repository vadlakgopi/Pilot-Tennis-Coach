"""
Training script for tennis ball detection using YOLOv8
"""
import os
from pathlib import Path
from ultralytics import YOLO


def train_ball_detector(
    data_dir: str,
    model_size: str = 'n',  # 'n' (nano), 's' (small), 'm' (medium), 'l' (large), 'x' (xlarge)
    epochs: int = 100,
    imgsz: int = 640,
    batch: int = 16,
    project_name: str = 'tennis_ball_detector'
):
    """
    Train YOLOv8 model for tennis ball detection
    
    Args:
        data_dir: Path to dataset directory (should contain train/val/test subdirectories)
        model_size: Model size ('n', 's', 'm', 'l', 'x')
        epochs: Number of training epochs
        imgsz: Image size for training
        batch: Batch size
        project_name: Name for the training project
    """
    # Check if dataset exists
    data_path = Path(data_dir)
    if not data_path.exists():
        raise ValueError(f"Dataset directory not found: {data_dir}")
    
    # Look for dataset config file (check both data.yaml and dataset.yaml)
    dataset_yaml = data_path / 'data.yaml'
    if not dataset_yaml.exists():
        dataset_yaml = data_path / 'dataset.yaml'
        if not dataset_yaml.exists():
            print(f"Creating dataset.yaml at {dataset_yaml}")
            create_dataset_yaml(dataset_yaml, data_path)
        else:
            print(f"Using existing dataset.yaml at {dataset_yaml}")
    else:
        print(f"Using existing data.yaml at {dataset_yaml}")
    
    # Load pre-trained YOLOv8 model
    model_name = f'yolov8{model_size}.pt'
    print(f"Loading pre-trained model: {model_name}")
    model = YOLO(model_name)
    
    # Train the model
    print(f"Starting training with {epochs} epochs...")
    print(f"Dataset: {data_dir}")
    print(f"Image size: {imgsz}")
    print(f"Batch size: {batch}")
    
    # Training parameters - adjusted to avoid IndexError
    train_params = {
        'data': str(dataset_yaml),
        'epochs': epochs,
        'imgsz': imgsz,
        'batch': batch,
        'name': project_name,
        'patience': 20,
        'save': True,
        'plots': True,
        'val': True,
        'device': 'cpu',
        'amp': False,  # Disable mixed precision
        'workers': 0,  # Use 0 workers
        'task': 'detect',  # Explicitly set task
        'mode': 'train',  # Explicitly set mode
    }
    
    # For multi-class datasets, try with smaller batch if error occurs
    try:
        results = model.train(**train_params)
    except IndexError as e:
        if "index 1 is out of bounds" in str(e):
            print("\n⚠ IndexError detected. Trying with adjusted parameters...")
            # Reduce batch size and try again
            train_params['batch'] = max(4, batch // 2)
            print(f"Retrying with batch size: {train_params['batch']}")
            results = model.train(**train_params)
        else:
            raise
    
    print(f"\nTraining completed!")
    
    # Get save directory (handle case where results might be None)
    if results and hasattr(results, 'save_dir'):
        save_dir = Path(results.save_dir)
    else:
        # Fallback: construct path from project name
        save_dir = Path('runs') / 'detect' / project_name
    
    best_model_path = save_dir / 'weights' / 'best.pt'
    last_model_path = save_dir / 'weights' / 'last.pt'
    
    if best_model_path.exists():
        print(f"✓ Best model saved at: {best_model_path}")
    if last_model_path.exists():
        print(f"✓ Last model saved at: {last_model_path}")
    
    return results


def create_dataset_yaml(yaml_path: Path, data_path: Path):
    """Create YOLO dataset configuration file"""
    yaml_content = f"""# Tennis Ball Detection Dataset
path: {data_path.absolute()}
train: train/images
val: val/images
test: test/images  # optional

# Classes
nc: 1  # number of classes
names: ['tennis_ball']  # class names
"""
    with open(yaml_path, 'w') as f:
        f.write(yaml_content)
    print(f"Created dataset.yaml at {yaml_path}")


def validate_dataset_structure(data_dir: str):
    """Validate that dataset has correct structure"""
    data_path = Path(data_dir)
    
    required_dirs = ['train/images', 'train/labels', 'val/images', 'val/labels']
    missing = []
    
    for dir_path in required_dirs:
        full_path = data_path / dir_path
        if not full_path.exists():
            missing.append(str(full_path))
    
    if missing:
        print("ERROR: Missing required directories:")
        for path in missing:
            print(f"  - {path}")
        print("\nExpected structure:")
        print("  dataset/")
        print("    train/")
        print("      images/")
        print("      labels/")
        print("    val/")
        print("      images/")
        print("      labels/")
        return False
    
    # Check for images and labels
    train_images = list((data_path / 'train/images').glob('*.jpg')) + \
                   list((data_path / 'train/images').glob('*.png'))
    train_labels = list((data_path / 'train/labels').glob('*.txt'))
    
    if len(train_images) == 0:
        print("ERROR: No training images found in train/images/")
        return False
    
    if len(train_labels) == 0:
        print("ERROR: No training labels found in train/labels/")
        return False
    
    if len(train_images) != len(train_labels):
        print(f"WARNING: Mismatch between images ({len(train_images)}) and labels ({len(train_labels)})")
    
    print(f"✓ Dataset structure valid")
    print(f"  Training images: {len(train_images)}")
    print(f"  Training labels: {len(train_labels)}")
    
    val_images = list((data_path / 'val/images').glob('*.jpg')) + \
                 list((data_path / 'val/images').glob('*.png'))
    val_labels = list((data_path / 'val/labels').glob('*.txt'))
    
    print(f"  Validation images: {len(val_images)}")
    print(f"  Validation labels: {len(val_labels)}")
    
    return True


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Train YOLOv8 for tennis ball detection')
    parser.add_argument('--data', type=str, required=True,
                       help='Path to dataset directory')
    parser.add_argument('--model', type=str, default='n',
                       choices=['n', 's', 'm', 'l', 'x'],
                       help='Model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    parser.add_argument('--epochs', type=int, default=100,
                       help='Number of training epochs')
    parser.add_argument('--imgsz', type=int, default=640,
                       help='Image size for training')
    parser.add_argument('--batch', type=int, default=16,
                       help='Batch size')
    parser.add_argument('--name', type=str, default='tennis_ball_detector',
                       help='Project name')
    parser.add_argument('--validate-only', action='store_true',
                       help='Only validate dataset structure, do not train')
    
    args = parser.parse_args()
    
    # Validate dataset structure
    if not validate_dataset_structure(args.data):
        print("\nPlease fix dataset structure before training.")
        exit(1)
    
    if args.validate_only:
        print("\nDataset validation passed. Ready for training.")
        exit(0)
    
    # Train model
    try:
        results = train_ball_detector(
            data_dir=args.data,
            model_size=args.model,
            epochs=args.epochs,
            imgsz=args.imgsz,
            batch=args.batch,
            project_name=args.name
        )
        print("\n✓ Training completed successfully!")
    except Exception as e:
        print(f"\n✗ Training failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

