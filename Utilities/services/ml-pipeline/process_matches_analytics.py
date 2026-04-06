#!/usr/bin/env python3
"""
Script to process specific matches with integrated ML models (ball detection + stroke detection)
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
    import sys
    sys.stdout.flush()  # Ensure output is flushed immediately
    
    print(f"\n{'='*70}")
    print(f"🎾 Processing Match {match_id}")
    print(f"{'='*70}")
    print(f"Video path: {video_path}")
    sys.stdout.flush()
    
    if not os.path.exists(video_path):
        print(f"❌ Error: Video file not found: {video_path}")
        return False
    
    try:
        print(f"\nInitializing ML pipeline with trained models...")
        processor = VideoProcessor(match_id=match_id, video_path=video_path)
        
        print(f"Starting video processing...")
        result = await processor.process()
        
        print(f"\n✅ Match {match_id} processed successfully!")
        print(f"\n📊 Analytics Summary:")
        print(f"   • Shots detected: {len(result.get('shots', []))}")
        print(f"   • Rallies identified: {len(result.get('rallies', []))}")
        
        # Print shot type distribution
        shots = result.get('shots', [])
        if shots:
            shot_types = {}
            for shot in shots:
                shot_type = shot.get('shot_type', 'unknown')
                shot_types[shot_type] = shot_types.get(shot_type, 0) + 1
            print(f"   • Shot types: {shot_types}")
        
        # Print ball detection rate if available
        if hasattr(processor.ball_tracker, 'get_detection_rate'):
            detection_rate = processor.ball_tracker.get_detection_rate()
            print(f"   • Ball detection rate: {detection_rate*100:.1f}%")
        
        # Print player stats if available
        player1_stats = result.get('player1_stats', {})
        player2_stats = result.get('player2_stats', {})
        if player1_stats:
            print(f"   • Player 1 total shots: {player1_stats.get('total_shots', 0)}")
        if player2_stats:
            print(f"   • Player 2 total shots: {player2_stats.get('total_shots', 0)}")
        
        return True
    except Exception as e:
        print(f"\n❌ Error processing match {match_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Process matches 9, 10, 11, and 14"""
    # Calculate project root and video paths
    script_dir = Path(__file__).parent.resolve()
    project_root = script_dir.parent.parent.resolve()
    base_path = project_root / 'apps' / 'api' / 'data' / 'matches'
    
    matches = [
        (9, base_path / '9' / 'video.mp4'),
        (10, base_path / '10' / 'video.mp4'),
        (11, base_path / '11' / 'video.mp4'),
        (14, base_path / '14' / 'video.mp4'),
    ]
    
    print("🎾 Tennis Match Analytics Processing")
    print("=" * 70)
    print("Using integrated ML models:")
    print("  • Trained Ball Detection Model")
    print("  • Trained Stroke Detection Model")
    print("=" * 70)
    print(f"\nMatches to process: {[m[0] for m in matches]}")
    
    # Verify paths exist
    verified_matches = []
    for match_id, video_path in matches:
        abs_path = video_path.resolve()
        if abs_path.exists():
            verified_matches.append((match_id, str(abs_path)))
            print(f"  ✓ Match {match_id}: {abs_path}")
        else:
            print(f"  ✗ Match {match_id}: Video not found at {abs_path}")
    
    if not verified_matches:
        print("\n❌ No valid video files found. Exiting.")
        return
    
    print(f"\n{'='*70}")
    print(f"Processing {len(verified_matches)} match(es)...")
    print(f"{'='*70}")
    
    results = {}
    for match_id, video_path in verified_matches:
        success = await process_match(match_id, video_path)
        results[match_id] = success
    
    # Summary
    print(f"\n{'='*70}")
    print("📊 Processing Summary")
    print(f"{'='*70}")
    for match_id, success in sorted(results.items()):
        status = "✅ Success" if success else "❌ Failed"
        print(f"Match {match_id}: {status}")
    
    successful = sum(1 for s in results.values() if s)
    print(f"\nTotal: {successful}/{len(results)} matches processed successfully")
    
    if successful == len(results):
        print("\n🎉 All matches processed successfully!")
    else:
        print(f"\n⚠️  {len(results) - successful} match(es) failed to process")


if __name__ == '__main__':
    asyncio.run(main())

