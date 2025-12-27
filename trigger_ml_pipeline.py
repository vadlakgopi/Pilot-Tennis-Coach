#!/usr/bin/env python3
"""
Script to trigger ML pipeline processing for the latest match.
This will call the ML pipeline service to regenerate analytics.
"""
import os
import sys
import asyncio
import httpx

# Add the API directory to the path
api_path = os.path.join(os.path.dirname(__file__), 'apps', 'api')
sys.path.insert(0, api_path)

# Change to API directory to use its venv
os.chdir(api_path)

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.core.database import SessionLocal
from app.models.match import Match, MatchVideo
from app.core.config import settings

# Change back to project root
os.chdir(os.path.dirname(__file__))

async def trigger_ml_pipeline():
    """Find latest match and trigger ML pipeline processing"""
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
        
        # Resolve absolute path
        if video_path.startswith('./data/'):
            abs_path = os.path.join(os.path.dirname(__file__), 'apps', 'api', video_path.lstrip('./'))
        else:
            abs_path = video_path
        
        if not os.path.exists(abs_path):
            print(f"❌ Video file not found at: {abs_path}")
            return False
        
        print(f"Video path: {abs_path}")
        print(f"File exists: ✅")
        print("")
        
        # Check if ML pipeline service is running
        ml_service_url = settings.ML_SERVICE_URL
        print(f"ML Service URL: {ml_service_url}")
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                health_response = await client.get(f"{ml_service_url}/health")
                if health_response.status_code == 200:
                    print("✅ ML Pipeline service is running")
                else:
                    print(f"⚠️  ML Pipeline service returned status {health_response.status_code}")
        except Exception as e:
            print(f"❌ ML Pipeline service not accessible: {str(e)}")
            print("")
            print("Please start the ML Pipeline service:")
            print("  ./START_ML_PIPELINE.sh")
            print("")
            print("Or use the comprehensive startup script:")
            print("  ./START_ALL_SERVICES.sh")
            return False
        
        print("")
        print("🚀 Triggering ML pipeline processing...")
        print("This may take a while depending on video length...")
        print("")
        
        # Call ML pipeline service
        async with httpx.AsyncClient(timeout=3600.0) as client:  # 1 hour timeout
            response = await client.post(
                f"{ml_service_url}/process",
                json={
                    "match_id": match.id,
                    "video_path": abs_path
                },
                headers={
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                print("✅ ML Pipeline processing completed successfully!")
                result = response.json()
                print(f"   Match ID: {result.get('match_id', match.id)}")
                print(f"   Status: {result.get('status', 'completed')}")
                print(f"   Progress: {result.get('progress', 1.0) * 100}%")
                print("")
                print("Analytics have been saved to the database.")
                print(f"View at: http://localhost:3000/matches/{match.id}/analytics")
                return True
            else:
                print(f"❌ ML Pipeline processing failed:")
                print(f"   Status Code: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        
    except Exception as e:
        print(f"❌ Error triggering ML pipeline: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = asyncio.run(trigger_ml_pipeline())
    sys.exit(0 if success else 1)

