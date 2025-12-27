"""
Simple script to download tennis ball dataset from Roboflow
"""
import os
import sys
from pathlib import Path

def download_roboflow_tennis_ball(output_dir="./datasets/roboflow_tennis"):
    """
    Download a tennis ball detection dataset from Roboflow
    
    You need to:
    1. Go to https://universe.roboflow.com
    2. Search "tennis ball"
    3. Find a dataset you like
    4. Get the download command from Roboflow (they provide it)
    """
    
    print("=" * 60)
    print("Roboflow Dataset Download")
    print("=" * 60)
    print("\nTo download from Roboflow, you have two options:\n")
    
    print("OPTION 1: Use Roboflow Python Package (Recommended)")
    print("-" * 60)
    print("1. Go to: https://universe.roboflow.com")
    print("2. Search: 'tennis ball'")
    print("3. Click on a dataset")
    print("4. Click 'Download' button")
    print("5. Choose 'YOLOv8' format")
    print("6. Copy the Python code they provide")
    print("7. Run it in your terminal\n")
    
    print("Example code Roboflow provides:")
    print("-" * 60)
    print("from roboflow import Roboflow")
    print("rf = Roboflow(api_key='YOUR_API_KEY')")
    print("project = rf.workspace('WORKSPACE').project('PROJECT')")
    print("dataset = project.version(VERSION).download('yolov8')")
    print("-" * 60)
    print()
    
    print("OPTION 2: Manual Download")
    print("-" * 60)
    print("1. Go to: https://universe.roboflow.com")
    print("2. Search: 'tennis ball'")
    print("3. Click on a dataset")
    print("4. Click 'Download' → 'YOLOv8'")
    print("5. Download the ZIP file")
    print("6. Extract to:", output_dir)
    print("-" * 60)
    print()
    
    # Check if roboflow is installed
    try:
        from roboflow import Roboflow
        print("✓ Roboflow package is installed")
        print("\nTo download programmatically, you need:")
        print("  - Roboflow API key (get from roboflow.com/account)")
        print("  - Workspace name")
        print("  - Project name")
        print("  - Version number")
        print("\nThen run:")
        print("  python -c \"from roboflow import Roboflow; rf = Roboflow(api_key='YOUR_KEY'); project = rf.workspace('WORKSPACE').project('PROJECT'); dataset = project.version(1).download('yolov8')\"")
    except ImportError:
        print("⚠ Roboflow package not installed")
        print("Install with: pip install roboflow")
        print("\nOr use OPTION 2 (Manual Download) above")
    
    print("\n" + "=" * 60)
    print("Popular Tennis Ball Datasets on Roboflow:")
    print("=" * 60)
    print("Search these on universe.roboflow.com:")
    print("  - 'tennis ball detection'")
    print("  - 'tennis ball yolo'")
    print("  - 'sports ball detection'")
    print("\nLook for datasets with:")
    print("  - 200+ images (minimum)")
    print("  - Good annotation quality")
    print("  - YOLO format available")
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    print(f"\n✓ Output directory ready: {output_dir}")
    print("\nAfter downloading, extract dataset here and run:")
    print(f"  python train_ball_detector.py --data {output_dir} --validate-only")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Download Roboflow tennis ball dataset')
    parser.add_argument('--output', type=str, default='./datasets/roboflow_tennis',
                       help='Output directory for dataset')
    
    args = parser.parse_args()
    download_roboflow_tennis_ball(args.output)




