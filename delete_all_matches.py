#!/usr/bin/env python3
"""
Script to delete all matches and associated data from the database and local storage.
"""
import os
import sys
import shutil
from pathlib import Path

# Add the API directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'api'))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.match import Match, MatchVideo
from app.models.analytics import Shot, Rally, Point, Serve, MatchStats
from app import models  # Import all models to ensure they're registered

def delete_all_matches():
    """Delete all matches and associated data"""
    db: Session = SessionLocal()
    
    try:
        print("🗑️  Deleting all matches and associated data...")
        print("")
        
        # Get all matches first to get their IDs for file cleanup
        matches = db.query(Match).all()
        match_ids = [match.id for match in matches]
        match_count = len(match_ids)
        
        if match_count == 0:
            print("✅ No matches found in database.")
            return
        
        print(f"Found {match_count} match(es) to delete:")
        for match in matches:
            print(f"  - Match #{match.id}: {match.title}")
        print("")
        
        # Delete associated analytics data first (due to foreign key constraints)
        print("Deleting analytics data...")
        shot_count = db.query(Shot).filter(Shot.match_id.in_(match_ids)).delete(synchronize_session=False)
        rally_count = db.query(Rally).filter(Rally.match_id.in_(match_ids)).delete(synchronize_session=False)
        point_count = db.query(Point).filter(Point.match_id.in_(match_ids)).delete(synchronize_session=False)
        serve_count = db.query(Serve).filter(Serve.match_id.in_(match_ids)).delete(synchronize_session=False)
        stats_count = db.query(MatchStats).filter(MatchStats.match_id.in_(match_ids)).delete(synchronize_session=False)
        
        print(f"  ✅ Deleted {shot_count} shots")
        print(f"  ✅ Deleted {rally_count} rallies")
        print(f"  ✅ Deleted {point_count} points")
        print(f"  ✅ Deleted {serve_count} serves")
        print(f"  ✅ Deleted {stats_count} match stats")
        print("")
        
        # Delete video records (but not files yet)
        print("Deleting video records...")
        video_count = db.query(MatchVideo).filter(MatchVideo.match_id.in_(match_ids)).delete(synchronize_session=False)
        print(f"  ✅ Deleted {video_count} video records")
        print("")
        
        # Delete matches
        print("Deleting matches...")
        deleted_count = db.query(Match).delete()
        print(f"  ✅ Deleted {deleted_count} matches")
        print("")
        
        # Commit all deletions
        db.commit()
        print("✅ Database cleanup complete!")
        print("")
        
        # Clean up local video files
        print("Cleaning up local video files...")
        data_dir = Path("apps/api/data/matches")
        if data_dir.exists():
            deleted_folders = 0
            for match_id in match_ids:
                match_folder = data_dir / str(match_id)
                if match_folder.exists():
                    shutil.rmtree(match_folder)
                    deleted_folders += 1
                    print(f"  ✅ Deleted folder: {match_folder}")
            
            if deleted_folders == 0:
                print("  ℹ️  No video folders found to delete")
            else:
                print(f"  ✅ Deleted {deleted_folders} video folder(s)")
        else:
            print("  ℹ️  Data directory does not exist")
        
        print("")
        print(f"✅ Successfully deleted {match_count} match(es) and all associated data!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting matches: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    delete_all_matches()





