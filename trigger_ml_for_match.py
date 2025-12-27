#!/usr/bin/env python3
"""
Script to trigger ML pipeline processing for a specific match.
"""
import os
import sys
import asyncio
import httpx

# Set up paths - add API directory to path
project_root = os.path.dirname(os.path.abspath(__file__))
api_path = os.path.join(project_root, 'apps', 'api')
sys.path.insert(0, api_path)

# Now import
from sqlalchemy.orm import Session, joinedload
from app.core.database import SessionLocal
from app.models.match import Match, MatchVideo
from app.core.config import settings

async def trigger_ml_pipeline(match_id: int):
    """Find match and trigger ML pipeline processing"""
    db: Session = SessionLocal()
    
    try:
        print(f"🔍 Finding match #{match_id}...")
        
        match = db.query(Match).options(joinedload(Match.videos)).filter(Match.id == match_id).first()
        
        if not match:
            print(f"❌ Match #{match_id} not found.")
            return False
        
        print(f"Match ID: {match.id}, Title: {match.title}")
        
        if not match.videos:
            print("❌ No videos uploaded.")
            return False
        
        video = match.videos[0]
        video_path = video.file_path
        
        if video_path.startswith('./data/'):
            abs_path = os.path.join(project_root, 'apps', 'api', video_path.lstrip('./'))
        else:
            abs_path = video_path
        
        if not os.path.exists(abs_path):
            print(f"❌ Video not found: {abs_path}")
            return False
        
        print(f"Video: {abs_path}")
        print("")
        
        # Check ML service
        ml_url = settings.ML_SERVICE_URL
        print(f"Checking ML Pipeline at {ml_url}...")
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                health = await client.get(f"{ml_url}/health")
                if health.status_code != 200:
                    print(f"⚠️  ML service health check failed")
                    return False
        except Exception as e:
            print(f"❌ ML Pipeline not accessible: {e}")
            print("Start it with: ./START_ML_PIPELINE.sh")
            return False
        
        print("✅ ML Pipeline is running")
        print("")
        print("🚀 Triggering analytics regeneration...")
        
        # Call ML pipeline
        async with httpx.AsyncClient(timeout=3600.0) as client:
            response = await client.post(
                f"{ml_url}/process",
                json={
                    "match_id": match.id,
                    "video_path": abs_path
                }
            )
            
            if response.status_code == 200:
                print("✅ Analytics regenerated successfully!")
                result = response.json()
                print(f"   Match ID: {result.get('match_id')}")
                print(f"   Status: {result.get('status')}")
                print("")
                print(f"View at: http://localhost:3000/matches/{match.id}/analytics")
                return True
            else:
                print(f"❌ Failed: {response.status_code}")
                print(response.text)
                return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    match_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
    if not match_id:
        print("Usage: python trigger_ml_for_match.py <match_id>")
        sys.exit(1)
    
    success = asyncio.run(trigger_ml_pipeline(match_id))
    sys.exit(0 if success else 1)





