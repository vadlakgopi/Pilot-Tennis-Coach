"""
Helper script to download and prepare datasets for training
Supports: Roboflow, YouTube video extraction, Kaggle (manual)
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path
import cv2
import json
import shutil


def check_dependencies():
    """Check if required tools are installed"""
    missing = []
    
    # Check yt-dlp for YouTube downloads
    try:
        import yt_dlp
    except ImportError:
        missing.append("yt-dlp (pip install yt-dlp)")
    
    # Check cv2
    try:
        import cv2
    except ImportError:
        missing.append("opencv-python (pip install opencv-python)")
    
    if missing:
        print("Missing dependencies:")
        for dep in missing:
            print(f"  - {dep}")
        print("\nInstall with: pip install yt-dlp opencv-python")
        return False
    
    return True


def download_roboflow_dataset(workspace: str, project: str, version: int, api_key: str, output_dir: str):
    """
    Download dataset from Roboflow
    
    Args:
        workspace: Roboflow workspace name
        project: Project name
        version: Dataset version number
        api_key: Roboflow API key
        output_dir: Where to save dataset
    """
    print(f"Downloading Roboflow dataset: {workspace}/{project} v{version}")
    
    # Roboflow download command
    cmd = [
        "python", "-m", "roboflow",
        "download", f"{workspace}/{project}/{version}",
        "--api-key", api_key,
        "--format", "yolov8",
        "--location", output_dir
    ]
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"✓ Dataset downloaded to {output_dir}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Error downloading dataset: {e.stderr}")
        print("\nAlternative: Download manually from roboflow.com/universe")
        print("Then extract to the output directory")
        return False
    except FileNotFoundError:
        print("✗ Roboflow CLI not found")
        print("Install with: pip install roboflow")
        print("\nAlternative: Download manually from roboflow.com/universe")
        return False


def extract_frames_from_video(video_path: str, output_dir: str, interval: float = 1.0, max_frames: int = None):
    """
    Extract frames from video at specified intervals
    
    Args:
        video_path: Path to video file
        output_dir: Directory to save frames
        interval: Extract frame every N seconds
        max_frames: Maximum number of frames to extract (None = all)
    """
    print(f"Extracting frames from {video_path}")
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"✗ Could not open video: {video_path}")
        return 0
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_interval = int(fps * interval)
    
    print(f"  Video: {total_frames} frames @ {fps:.2f} fps")
    print(f"  Extracting every {interval}s ({frame_interval} frames)")
    
    frame_count = 0
    saved_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % frame_interval == 0:
            frame_path = Path(output_dir) / f"frame_{saved_count:06d}.jpg"
            cv2.imwrite(str(frame_path), frame)
            saved_count += 1
            
            if saved_count % 100 == 0:
                print(f"  Extracted {saved_count} frames...")
            
            if max_frames and saved_count >= max_frames:
                break
        
        frame_count += 1
    
    cap.release()
    print(f"✓ Extracted {saved_count} frames to {output_dir}")
    return saved_count


def download_youtube_video(url: str, output_path: str, quality: str = "best"):
    """
    Download video from YouTube
    
    Args:
        url: YouTube video URL
        output_path: Where to save video
        quality: Video quality ('best', 'worst', '720p', etc.)
    """
    print(f"Downloading YouTube video: {url}")
    
    try:
        import yt_dlp
    except ImportError:
        print("✗ yt-dlp not installed. Install with: pip install yt-dlp")
        return False
    
    ydl_opts = {
        'format': f'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]' if quality == "best" else quality,
        'outtmpl': str(output_path),
        'quiet': False,
        'no_warnings': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        print(f"✓ Video downloaded to {output_path}")
        return True
    except Exception as e:
        print(f"✗ Error downloading video: {e}")
        return False


def combine_datasets(dataset_dirs: list, output_dir: str):
    """
    Combine multiple datasets into one
    
    Args:
        dataset_dirs: List of dataset directories to combine
        output_dir: Output directory for combined dataset
    """
    print(f"Combining {len(dataset_dirs)} datasets into {output_dir}")
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create train/val structure
    for split in ['train', 'val']:
        (output_path / split / 'images').mkdir(parents=True, exist_ok=True)
        (output_path / split / 'labels').mkdir(parents=True, exist_ok=True)
    
    total_images = 0
    total_labels = 0
    
    for dataset_dir in dataset_dirs:
        dataset_path = Path(dataset_dir)
        if not dataset_path.exists():
            print(f"⚠ Skipping {dataset_dir} (not found)")
            continue
        
        print(f"  Processing {dataset_path.name}...")
        
        # Copy train images and labels
        train_images_src = dataset_path / 'train' / 'images'
        train_labels_src = dataset_path / 'train' / 'labels'
        
        if train_images_src.exists():
            for img_file in train_images_src.glob('*'):
                if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                    shutil.copy2(img_file, output_path / 'train' / 'images' / f"{dataset_path.name}_{img_file.name}")
                    total_images += 1
                    
                    # Copy corresponding label
                    label_file = train_labels_src / f"{img_file.stem}.txt"
                    if label_file.exists():
                        shutil.copy2(label_file, output_path / 'train' / 'labels' / f"{dataset_path.name}_{label_file.name}")
                        total_labels += 1
        
        # Copy val images and labels
        val_images_src = dataset_path / 'val' / 'images'
        val_labels_src = dataset_path / 'val' / 'labels'
        
        if val_images_src.exists():
            for img_file in val_images_src.glob('*'):
                if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                    shutil.copy2(img_file, output_path / 'val' / 'images' / f"{dataset_path.name}_{img_file.name}")
                    total_images += 1
                    
                    # Copy corresponding label
                    label_file = val_labels_src / f"{img_file.stem}.txt"
                    if label_file.exists():
                        shutil.copy2(label_file, output_path / 'val' / 'labels' / f"{dataset_path.name}_{label_file.name}")
                        total_labels += 1
    
    print(f"✓ Combined dataset created:")
    print(f"  Total images: {total_images}")
    print(f"  Total labels: {total_labels}")
    
    # Create dataset.yaml
    yaml_content = f"""# Combined Tennis Dataset
path: {output_path.absolute()}
train: train/images
val: val/images

# Classes
nc: 1
names: ['tennis_ball']
"""
    yaml_path = output_path / 'dataset.yaml'
    with open(yaml_path, 'w') as f:
        f.write(yaml_content)
    
    print(f"✓ Created dataset.yaml at {yaml_path}")
    return True


def validate_dataset_structure(dataset_dir: str):
    """Validate that dataset has correct YOLO structure"""
    dataset_path = Path(dataset_dir)
    
    required = [
        'train/images',
        'train/labels',
        'val/images',
        'val/labels'
    ]
    
    missing = []
    for req in required:
        if not (dataset_path / req).exists():
            missing.append(req)
    
    if missing:
        print("✗ Missing directories:")
        for m in missing:
            print(f"  - {m}")
        return False
    
    # Count files
    train_images = len(list((dataset_path / 'train/images').glob('*.jpg'))) + \
                   len(list((dataset_path / 'train/images').glob('*.png')))
    train_labels = len(list((dataset_path / 'train/labels').glob('*.txt')))
    val_images = len(list((dataset_path / 'val/images').glob('*.jpg'))) + \
                 len(list((dataset_path / 'val/images').glob('*.png')))
    val_labels = len(list((dataset_path / 'val/labels').glob('*.txt')))
    
    print("✓ Dataset structure valid")
    print(f"  Train: {train_images} images, {train_labels} labels")
    print(f"  Val: {val_images} images, {val_labels} labels")
    
    if train_images != train_labels:
        print(f"⚠ Warning: Mismatch between train images ({train_images}) and labels ({train_labels})")
    
    if val_images != val_labels:
        print(f"⚠ Warning: Mismatch between val images ({val_images}) and labels ({val_labels})")
    
    return True


def main():
    parser = argparse.ArgumentParser(description='Download and prepare datasets for training')
    parser.add_argument('--check-deps', action='store_true',
                       help='Check if dependencies are installed')
    parser.add_argument('--roboflow', action='store_true',
                       help='Download from Roboflow')
    parser.add_argument('--workspace', type=str,
                       help='Roboflow workspace name')
    parser.add_argument('--project', type=str,
                       help='Roboflow project name')
    parser.add_argument('--version', type=int,
                       help='Roboflow dataset version')
    parser.add_argument('--api-key', type=str,
                       help='Roboflow API key')
    parser.add_argument('--youtube', type=str,
                       help='Download video from YouTube URL')
    parser.add_argument('--extract-frames', type=str,
                       help='Extract frames from video file')
    parser.add_argument('--frame-interval', type=float, default=1.0,
                       help='Extract frame every N seconds (default: 1.0)')
    parser.add_argument('--max-frames', type=int,
                       help='Maximum frames to extract')
    parser.add_argument('--combine', nargs='+',
                       help='Combine multiple datasets (list of directories)')
    parser.add_argument('--output', type=str, default='./datasets',
                       help='Output directory (default: ./datasets)')
    parser.add_argument('--validate', type=str,
                       help='Validate dataset structure')
    
    args = parser.parse_args()
    
    if args.check_deps:
        if check_dependencies():
            print("✓ All dependencies installed")
        else:
            sys.exit(1)
        return
    
    if args.validate:
        if validate_dataset_structure(args.validate):
            print("\n✓ Dataset is ready for training!")
        else:
            print("\n✗ Dataset structure is invalid")
            sys.exit(1)
        return
    
    if args.roboflow:
        if not all([args.workspace, args.project, args.version, args.api_key]):
            print("✗ Roboflow download requires: --workspace, --project, --version, --api-key")
            sys.exit(1)
        
        output_dir = Path(args.output) / f"{args.workspace}_{args.project}_v{args.version}"
        download_roboflow_dataset(
            args.workspace, args.project, args.version,
            args.api_key, str(output_dir)
        )
    
    if args.youtube:
        output_path = Path(args.output) / "youtube_videos" / "video.mp4"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        download_youtube_video(args.youtube, str(output_path))
    
    if args.extract_frames:
        output_dir = Path(args.output) / "extracted_frames"
        extract_frames_from_video(
            args.extract_frames, str(output_dir),
            args.frame_interval, args.max_frames
        )
    
    if args.combine:
        output_dir = Path(args.output) / "combined_dataset"
        combine_datasets(args.combine, str(output_dir))


if __name__ == '__main__':
    main()




