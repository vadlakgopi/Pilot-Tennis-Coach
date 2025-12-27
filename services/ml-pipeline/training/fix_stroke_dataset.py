"""
Script to fix stroke detection dataset issues
- Removes empty label files
- Validates class IDs are in range 0-10
- Ensures label format is correct
"""
import os
from pathlib import Path

def fix_stroke_dataset(dataset_dir: str):
    """Fix common issues in stroke detection dataset"""
    dataset_path = Path(dataset_dir)
    
    print(f"Fixing dataset: {dataset_dir}")
    print("=" * 60)
    
    # Fix train labels
    train_labels = dataset_path / 'train' / 'labels'
    train_images = dataset_path / 'train' / 'images'
    
    removed = 0
    fixed = 0
    total = 0
    
    if train_labels.exists():
        for label_file in train_labels.glob('*.txt'):
            total += 1
            label_path = label_file
            
            # Check if empty
            if label_path.stat().st_size == 0:
                # Remove corresponding image
                img_name = label_path.stem
                for ext in ['.jpg', '.png', '.jpeg']:
                    img_path = train_images / f"{img_name}{ext}"
                    if img_path.exists():
                        img_path.unlink()
                        break
                label_path.unlink()
                removed += 1
                continue
            
            # Read and validate labels
            try:
                with open(label_path, 'r') as f:
                    lines = f.readlines()
                
                valid_lines = []
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split()
                    if len(parts) < 5:
                        continue
                    
                    class_id = int(parts[0])
                    # Validate class ID is in range 0-10 (11 classes)
                    if 0 <= class_id <= 10:
                        valid_lines.append(line)
                    else:
                        print(f"Warning: Invalid class ID {class_id} in {label_path.name}")
                        fixed += 1
                
                # Rewrite file with valid lines only
                if valid_lines:
                    with open(label_path, 'w') as f:
                        f.write('\n'.join(valid_lines) + '\n')
                else:
                    # Remove if no valid labels
                    img_name = label_path.stem
                    for ext in ['.jpg', '.png', '.jpeg']:
                        img_path = train_images / f"{img_name}{ext}"
                        if img_path.exists():
                            img_path.unlink()
                            break
                    label_path.unlink()
                    removed += 1
                    
            except Exception as e:
                print(f"Error processing {label_path.name}: {e}")
                removed += 1
    
    print(f"\n✓ Dataset fixed:")
    print(f"  Total files checked: {total}")
    print(f"  Removed (empty/invalid): {removed}")
    print(f"  Fixed (invalid class IDs): {fixed}")
    print(f"  Remaining: {total - removed}")
    
    # Count remaining
    remaining_labels = len(list(train_labels.glob('*.txt')))
    remaining_images = len(list(train_images.glob('*.jpg'))) + len(list(train_images.glob('*.png')))
    
    print(f"\n  Remaining labels: {remaining_labels}")
    print(f"  Remaining images: {remaining_images}")
    
    if remaining_labels != remaining_images:
        print(f"  ⚠ Warning: Mismatch between labels and images")
    
    return remaining_labels


if __name__ == '__main__':
    import sys
    
    dataset_dir = sys.argv[1] if len(sys.argv) > 1 else 'datasets/tennis_stroke_detection'
    fix_stroke_dataset(dataset_dir)




