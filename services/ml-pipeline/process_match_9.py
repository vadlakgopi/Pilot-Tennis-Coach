#!/usr/bin/env python3
"""
Script to process match #9 with performance diagnostics
"""
import sys
import os
import asyncio
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.processors.video_processor import VideoProcessor


async def process_match_9():
    """Process match 9 with detailed timing diagnostics"""
    script_dir = Path(__file__).parent.resolve()
    project_root = script_dir.parent.parent.resolve()
    video_path = project_root / 'apps' / 'api' / 'data' / 'matches' / '9' / 'video.mp4'
    
    if not video_path.exists():
        print(f"❌ Error: Video file not found: {video_path}")
        return False
    
    print(f"\n{'='*70}")
    print(f"🎾 Processing Match 9 with Performance Diagnostics")
    print(f"{'='*70}")
    print(f"Video path: {video_path}")
    
    # Get video info
    import cv2
    cap = cv2.VideoCapture(str(video_path))
    if cap.isOpened():
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        
        print(f"\n📹 Video Info:")
        print(f"   • Resolution: {width}x{height}")
        print(f"   • FPS: {fps:.2f}")
        print(f"   • Total frames: {total_frames:,}")
        print(f"   • Duration: {duration:.1f} seconds ({duration/60:.1f} minutes)")
        print(f"   • File size: {video_path.stat().st_size / (1024*1024):.1f} MB")
    
    print(f"\n{'='*70}")
    print(f"Starting processing with timing diagnostics...")
    print(f"{'='*70}\n")
    
    start_time = time.time()
    
    try:
        # Step timing
        step_times = {}
        
        print(f"[{time.strftime('%H:%M:%S')}] Initializing ML pipeline...")
        step_start = time.time()
        processor = VideoProcessor(match_id=9, video_path=str(video_path))
        step_times['initialization'] = time.time() - step_start
        print(f"[{time.strftime('%H:%M:%S')}] ✓ Initialized in {step_times['initialization']:.2f}s")
        
        print(f"\n[{time.strftime('%H:%M:%S')}] Starting video processing...")
        process_start = time.time()
        result = await processor.process()
        step_times['total_processing'] = time.time() - process_start
        print(f"\n[{time.strftime('%H:%M:%S')}] ✓ Processing completed in {step_times['total_processing']:.2f}s")
        
        total_time = time.time() - start_time
        
        print(f"\n{'='*70}")
        print(f"✅ Match 9 processed successfully!")
        print(f"{'='*70}")
        print(f"\n⏱️  Performance Summary:")
        print(f"   • Total time: {total_time:.1f}s ({total_time/60:.1f} minutes)")
        print(f"   • Initialization: {step_times['initialization']:.2f}s")
        print(f"   • Video processing: {step_times['total_processing']:.1f}s ({step_times['total_processing']/60:.1f} minutes)")
        
        if total_frames > 0:
            frames_per_second = total_frames / step_times['total_processing'] if step_times['total_processing'] > 0 else 0
            print(f"   • Processing speed: {frames_per_second:.1f} frames/second")
            print(f"   • Real-time factor: {duration / step_times['total_processing']:.2f}x (video duration / processing time)")
        
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
        
        # Performance analysis
        print(f"\n🔍 Performance Analysis:")
        if total_frames > 0 and step_times['total_processing'] > 0:
            time_per_frame = step_times['total_processing'] / total_frames * 1000  # ms per frame
            print(f"   • Time per frame: {time_per_frame:.2f}ms")
            
            if time_per_frame > 100:  # More than 100ms per frame
                print(f"   ⚠️  WARNING: Processing is very slow (>100ms per frame)")
                print(f"      Expected: ~33ms per frame for real-time (30fps)")
                print(f"      Current: {time_per_frame:.2f}ms per frame ({time_per_frame/33:.1f}x slower than real-time)")
            
            # Estimate bottlenecks
            if frames_per_second < 10:
                print(f"   ⚠️  BOTTLENECK DETECTED: Processing <10 fps")
                print(f"      Possible causes:")
                print(f"      - YOLO model inference is slow (CPU mode)")
                print(f"      - Processing every frame instead of sampling")
                print(f"      - Large video resolution")
                print(f"      - Multiple models running per frame")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error processing match 9: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    asyncio.run(process_match_9())




