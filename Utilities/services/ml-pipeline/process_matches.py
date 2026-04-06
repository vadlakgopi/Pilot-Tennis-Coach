#!/usr/bin/env python3
"""
Script to process specific matches with the new ball detection model
"""
import sys
import os
import asyncio
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.processors.video_processor import VideoProcessor


async def process_match(match_id: int, video_path: str):
    """Process a single match"""
    print(f"\n{'='*60}")
    print(f"Processing Match {match_id}")
    print(f"{'='*60}")
    print(f"Video path: {video_path}")
    
    if not os.path.exists(video_path):
        print(f"❌ Error: Video file not found: {video_path}")
        return False
    
    try:
        processor = VideoProcessor(match_id=match_id, video_path=video_path)
        result = await processor.process()
        
        print(f"\n✅ Match {match_id} processed successfully!")
        print(f"   Shots detected: {len(result.get('shots', []))}")
        print(f"   Rallies identified: {len(result.get('rallies', []))}")
        
        # Print ball detection rate if available
        if hasattr(processor.ball_tracker, 'get_detection_rate'):
            detection_rate = processor.ball_tracker.get_detection_rate()
            print(f"   Ball detection rate: {detection_rate*100:.1f}%")
        
        return True
    except Exception as e:
        print(f"\n❌ Error processing match {match_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Process matches 9, 10, and 14"""
    # Match video paths - use absolute path from project root
    # Script is in services/ml-pipeline/, so go up 2 levels to project root
    script_dir = Path(__file__).parent.resolve()
    project_root = script_dir.parent.parent.resolve()
    base_path = project_root / 'apps' / 'api' / 'data' / 'matches'
    
    print(f"Debug: Script dir: {script_dir}")
    print(f"Debug: Project root: {project_root}")
    print(f"Debug: Base path: {base_path}")
    print(f"Debug: Base path exists: {base_path.exists()}")
    
    matches = [
        (9, base_path / '9' / 'video.mp4'),
        (10, base_path / '10' / 'video.mp4'),
        (14, base_path / '14' / 'video.mp4'),
    ]
    
    # Convert to absolute paths and verify
    verified_matches = []
    for match_id, video_path in matches:
        abs_path = video_path.resolve()
        if abs_path.exists():
            verified_matches.append((match_id, str(abs_path)))
        else:
            print(f"⚠️  Warning: Video not found for match {match_id}: {abs_path}")
    
    matches = verified_matches
    
    print("🎾 Processing Matches with New Ball Detection Model")
    print("=" * 60)
    print(f"Matches to process: {[m[0] for m in matches]}")
    print()
    
    results = {}
    for match_id, video_path in matches:
        success = await process_match(match_id, str(video_path))
        results[match_id] = success
    
    # Summary
    print(f"\n{'='*60}")
    print("Processing Summary")
    print(f"{'='*60}")
    for match_id, success in results.items():
        status = "✅ Success" if success else "❌ Failed"
        print(f"Match {match_id}: {status}")
    
    successful = sum(1 for s in results.values() if s)
    print(f"\nTotal: {successful}/{len(results)} matches processed successfully")


if __name__ == '__main__':
    asyncio.run(main())

