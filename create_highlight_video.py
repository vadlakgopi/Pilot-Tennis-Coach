#!/usr/bin/env python3
"""
Create highlight video from shots for a match
Uses ffmpeg to extract segments around each shot and concatenate them
"""
import os
import sys
import subprocess
from pathlib import Path

# Add API path to sys.path
project_root = Path(__file__).parent
api_path = project_root / 'apps' / 'api'
sys.path.insert(0, str(api_path))

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import asc
from app.core.database import SessionLocal
from app.models.match import Match, MatchVideo
from app.models.analytics import Shot


def check_ffmpeg():
    """Check if ffmpeg is available"""
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def create_highlight_video(match_id: int, clip_before: float = 2.0, clip_after: float = 3.0):
    """
    Create highlight video from all shots in a match
    
    Args:
        match_id: Match ID
        clip_before: Seconds before each shot to include
        clip_after: Seconds after each shot to include
    """
    db: Session = SessionLocal()
    
    try:
        # Get match and video info
        match = db.query(Match).options(joinedload(Match.videos)).filter(Match.id == match_id).first()
        if not match:
            print(f"❌ Match #{match_id} not found")
            return False
        
        if not match.videos:
            print(f"❌ No video uploaded for match #{match_id}")
            return False
        
        video = match.videos[0]
        video_path = video.file_path
        
        # Resolve absolute path
        if video_path.startswith('./'):
            abs_video_path = api_path / video_path.lstrip('./')
        else:
            abs_video_path = Path(video_path)
        
        if not abs_video_path.exists():
            print(f"❌ Video file not found: {abs_video_path}")
            return False
        
        print(f"📹 Processing Match #{match_id}: {match.title}")
        print(f"   Video: {abs_video_path}")
        
        # Get all shots
        shots = db.query(Shot).filter(Shot.match_id == match_id).order_by(asc(Shot.timestamp_seconds)).all()
        
        if not shots:
            print(f"❌ No shots found for match #{match_id}")
            return False
        
        print(f"   Found {len(shots)} shots")
        
        # Check ffmpeg
        if not check_ffmpeg():
            print("❌ ffmpeg not found. Please install ffmpeg first.")
            print("   Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)")
            return False
        
        # Create output directory
        output_dir = api_path / 'data' / 'matches' / str(match_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        highlight_path = output_dir / 'highlights.mp4'
        
        # Create temporary directory for segments
        temp_dir = output_dir / 'temp_segments'
        temp_dir.mkdir(exist_ok=True)
        
        # Generate video segments for each shot
        print(f"\n✂️  Extracting video segments...")
        segments_file = temp_dir / 'segments.txt'
        segments_list = []
        
        for i, shot in enumerate(shots, 1):
            start_time = max(0, shot.timestamp_seconds - clip_before)
            duration = clip_before + clip_after
            
            segment_path = temp_dir / f'segment_{i:03d}.mp4'
            
            # Extract segment using ffmpeg
            cmd = [
                'ffmpeg',
                '-i', str(abs_video_path),
                '-ss', str(start_time),
                '-t', str(duration),
                '-c', 'copy',  # Copy codec to avoid re-encoding (faster)
                '-avoid_negative_ts', 'make_zero',
                '-y',  # Overwrite output
                str(segment_path)
            ]
            
            print(f"   Extracting segment {i}/{len(shots)}: {start_time:.2f}s - {start_time + duration:.2f}s ({shot.shot_type})")
            
            try:
                subprocess.run(cmd, capture_output=True, check=True)
                
                # Add to segments list for concatenation
                segments_list.append(f"file '{segment_path.absolute()}'")
            except subprocess.CalledProcessError as e:
                print(f"   ⚠️  Failed to extract segment {i}: {e}")
                continue
        
        if not segments_list:
            print("❌ No segments were successfully extracted")
            return False
        
        # Write segments list file for ffmpeg concat
        with open(segments_file, 'w') as f:
            f.write('\n'.join(segments_list))
        
        # Concatenate all segments
        print(f"\n🎬 Concatenating segments into highlight video...")
        concat_cmd = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(segments_file),
            '-c', 'copy',  # Copy codec
            '-y',
            str(highlight_path)
        ]
        
        try:
            subprocess.run(concat_cmd, capture_output=True, check=True)
            print(f"✅ Highlight video created successfully!")
            print(f"   Output: {highlight_path}")
            
            # Get file size
            file_size_mb = highlight_path.stat().st_size / (1024 * 1024)
            print(f"   Size: {file_size_mb:.2f} MB")
            
            # Clean up temp segments
            print(f"\n🧹 Cleaning up temporary files...")
            for segment_file in temp_dir.glob('segment_*.mp4'):
                segment_file.unlink()
            segments_file.unlink()
            temp_dir.rmdir()
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to concatenate segments: {e}")
            if e.stderr:
                print(f"   Error: {e.stderr.decode()}")
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_highlight_video.py <match_id> [clip_before] [clip_after]")
        print("Example: python create_highlight_video.py 14 2.0 3.0")
        sys.exit(1)
    
    match_id = int(sys.argv[1])
    clip_before = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
    clip_after = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
    
    success = create_highlight_video(match_id, clip_before, clip_after)
    sys.exit(0 if success else 1)





