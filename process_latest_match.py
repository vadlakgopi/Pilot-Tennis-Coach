#!/usr/bin/env python3
"""
Script to trigger ML pipeline processing for the latest match.
"""
import os
import sys
from pathlib import Path

# Add the API directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'api'))

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.core.database import SessionLocal
from app.models.match import Match, MatchVideo
from app.tasks.video_processing import _process_match_video_impl

def process_latest_match():
    """Find and process the latest match with video"""
    db: Session = SessionLocal()
    
    try:
        print("🔍 Finding latest match with video...")
        print("")
        
        # Get latest match with videos
        match = db.query(Match).options(joinedload(Match.videos)).order_by(desc(Match.id)).first()
        
        if not match:
            print("❌ No matches found in database.")
            return False
        
        print(f"Found match:")
        print(f"  ID: {match.id}")
        print(f"  Title: {match.title}")
        print(f"  Status: {match.status}")
        print(f"  Videos: {len(match.videos)}")
        print("")
        
        if not match.videos:
            print("❌ Match has no videos uploaded. Cannot process.")
            return False
        
        # Use the first video
        video = match.videos[0]
        video_path = video.file_path
        
        # Check if video file exists
        if video_path.startswith('./data/'):
            # Local path - make it absolute
            abs_path = os.path.join(os.path.dirname(__file__), 'apps', 'api', video_path.lstrip('./'))
        else:
            abs_path = video_path
        
        if not os.path.exists(abs_path):
            print(f"❌ Video file not found at: {abs_path}")
            return False
        
        print(f"Video path: {abs_path}")
        print(f"File exists: ✅")
        print("")
        
        # Process the video
        print("🚀 Starting ML pipeline processing...")
        print("This may take a while depending on video length...")
        print("")
        
        result = _process_match_video_impl(match.id, abs_path)
        
        if "error" in result:
            print(f"❌ Processing failed: {result['error']}")
            return False
        else:
            print(f"✅ Processing completed successfully!")
            print(f"   Status: {result.get('status', 'unknown')}")
            print(f"   Match ID: {result.get('match_id', match.id)}")
            return True
        
    except Exception as e:
        print(f"❌ Error processing match: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = process_latest_match()
    sys.exit(0 if success else 1)





