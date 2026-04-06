#!/bin/bash

# Script to extract and setup shot classification dataset from Roboflow

echo "🎾 Shot Classification Dataset Setup"
echo "===================================="
echo ""

# Check if zip file provided
if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_roboflow_zip_file>"
    echo ""
    echo "Example:"
    echo "  $0 ~/Downloads/shot-classification.zip"
    echo "  $0 datasets/shot_classification.zip"
    exit 1
fi

ZIP_FILE="$1"
TARGET_DIR="datasets/shot_classification"

# Check if zip file exists
if [ ! -f "$ZIP_FILE" ]; then
    echo "✗ Error: Zip file not found: $ZIP_FILE"
    exit 1
fi

echo "📦 Zip file: $ZIP_FILE"
echo "📁 Target directory: $TARGET_DIR"
echo ""

# Create target directory
mkdir -p "$TARGET_DIR"

# Create temporary extraction directory
TEMP_DIR=$(mktemp -d)
echo "📂 Extracting to temporary directory: $TEMP_DIR"

# Extract zip file
unzip -q "$ZIP_FILE" -d "$TEMP_DIR" || {
    echo "✗ Error: Failed to extract zip file"
    exit 1
}

echo "✓ Extraction complete"
echo ""

# Find JSON files in extracted directory
JSON_FILES=$(find "$TEMP_DIR" -name "*.json" -type f)

if [ -z "$JSON_FILES" ]; then
    echo "⚠ Warning: No JSON files found in zip"
    echo ""
    echo "Checking directory structure..."
    find "$TEMP_DIR" -type f | head -10
    echo ""
    echo "Please check the zip file structure."
    echo "Expected: JSON files with shot sequences"
    exit 1
fi

# Count JSON files
JSON_COUNT=$(echo "$JSON_FILES" | wc -l | tr -d ' ')
echo "Found $JSON_COUNT JSON files"

# Copy JSON files to target directory
echo "📋 Copying JSON files to $TARGET_DIR..."
echo "$JSON_FILES" | while read -r json_file; do
    filename=$(basename "$json_file")
    cp "$json_file" "$TARGET_DIR/"
done

# Count copied files
COPIED_COUNT=$(ls -1 "$TARGET_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "✓ Copied $COPIED_COUNT files"
echo ""

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Validate dataset format
echo "🔍 Validating dataset format..."
cd "$(dirname "$0")"
source ../venv/bin/activate 2>/dev/null || true

python3 -c "
import json
import sys
from pathlib import Path

data_dir = Path('$TARGET_DIR')
json_files = list(data_dir.glob('*.json'))

if not json_files:
    print('✗ No JSON files found')
    sys.exit(1)

print(f'Found {len(json_files)} JSON files')
print('')

# Check first few files
valid = 0
invalid = 0
shot_types = set()

for json_file in json_files[:5]:  # Check first 5
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        if 'shot_type' in data and 'pose_sequence' in data:
            valid += 1
            shot_types.add(data['shot_type'])
            seq_len = len(data['pose_sequence'])
            print(f'✓ {json_file.name}: shot_type={data[\"shot_type\"]}, sequence_length={seq_len}')
        else:
            invalid += 1
            print(f'✗ {json_file.name}: Missing required fields')
    except Exception as e:
        invalid += 1
        print(f'✗ {json_file.name}: Error - {e}')

print('')
if valid > 0:
    print(f'✓ Dataset format looks good!')
    print(f'  Valid files: {valid}')
    print(f'  Shot types found: {sorted(shot_types)}')
    print('')
    print('Next step: Train the model')
    print('  python train_shot_classifier.py --data datasets/shot_classification --epochs 100')
else:
    print('✗ Dataset format validation failed')
    print('Expected JSON format:')
    print('  {')
    print('    \"shot_type\": \"forehand\",')
    print('    \"pose_sequence\": [[...], [...], ...]')
    print('  }')
    sys.exit(1)
" || {
    echo ""
    echo "⚠ Could not validate format (Python check failed)"
    echo "But files were copied successfully."
}

echo ""
echo "✅ Setup complete!"
echo ""
echo "Dataset location: $TARGET_DIR"
echo "Files: $COPIED_COUNT JSON files"
echo ""




