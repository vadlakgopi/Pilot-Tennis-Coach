#!/usr/bin/env python3
"""
Script to create mock analytics for the latest match.
This simulates what the ML pipeline would generate.
"""
import os
import sys
from pathlib import Path
import random
from datetime import datetime, timezone

# Add the API directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'api'))

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.core.database import SessionLocal
from app.models.match import Match, MatchVideo, MatchStatus
from app.services.analytics_service import AnalyticsService

def create_mock_analytics_for_latest_match():
    """Create mock analytics for the latest match"""
    db: Session = SessionLocal()
    analytics_service = AnalyticsService(db)
    
    try:
        print("🔍 Finding latest match...")
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
            print("❌ Match has no videos uploaded. Cannot create analytics.")
            return False
        
        # Generate mock analytics data
        print("📊 Generating mock analytics data...")
        print("")
        
        # Generate shots data
        shots_data = []
        shot_types = ["forehand", "backhand", "serve", "volley", "smash"]
        outcomes = ["in", "out", "net", "ace", "winner"]
        
        for i in range(random.randint(50, 150)):  # 50-150 shots
            shots_data.append({
                "player_number": random.randint(1, 2),
                "timestamp": round(random.uniform(0, 1800), 2),  # 0-30 minutes
                "shot_type": random.choice(shot_types),
                "outcome": random.choice(outcomes),
                "court_position": [random.uniform(-10, 10), random.uniform(-20, 20)],
                "direction": random.choice(["cross", "down_the_line", "center"]),
                "confidence": round(random.uniform(0.7, 0.95), 2)
            })
        
        # Generate rallies data
        rallies_data = []
        num_rallies = random.randint(20, 50)
        for i in range(num_rallies):
            start_time = random.uniform(0, 1500)
            duration = random.uniform(5, 45)
            end_time = start_time + duration
            rally_shots = [s for s in shots_data if start_time <= s["timestamp"] <= end_time]
            
            rallies_data.append({
                "start_time": round(start_time, 2),
                "end_time": round(end_time, 2),
                "duration": round(duration, 2),
                "shot_count": len(rally_shots),
                "winner_player": random.choice([1, 2, None]),
                "ended_by": random.choice(["error", "winner", "timeout"])
            })
        
        # Generate player stats
        player1_shots = [s for s in shots_data if s["player_number"] == 1]
        player2_shots = [s for s in shots_data if s["player_number"] == 2]
        
        player1_stats = {
            "total_shots": len(player1_shots),
            "shot_distribution": {
                "forehand": len([s for s in player1_shots if s["shot_type"] == "forehand"]),
                "backhand": len([s for s in player1_shots if s["shot_type"] == "backhand"]),
                "serve": len([s for s in player1_shots if s["shot_type"] == "serve"]),
                "volley": len([s for s in player1_shots if s["shot_type"] == "volley"]),
            }
        }
        
        player2_stats = {
            "total_shots": len(player2_shots),
            "shot_distribution": {
                "forehand": len([s for s in player2_shots if s["shot_type"] == "forehand"]),
                "backhand": len([s for s in player2_shots if s["shot_type"] == "backhand"]),
                "serve": len([s for s in player2_shots if s["shot_type"] == "serve"]),
                "volley": len([s for s in player2_shots if s["shot_type"] == "volley"]),
            }
        }
        
        # Generate rally stats
        rally_stats = {
            "total_rallies": len(rallies_data),
            "longest_rally": round(max([r["duration"] for r in rallies_data], default=0), 2)
        }
        
        # Create analytics data structure
        analytics_data = {
            "shots": shots_data,
            "rallies": rallies_data,
            "player1_stats": player1_stats,
            "player2_stats": player2_stats,
            "rally_stats": rally_stats
        }
        
        print(f"Generated:")
        print(f"  - {len(shots_data)} shots")
        print(f"  - {len(rallies_data)} rallies")
        print(f"  - Player 1: {player1_stats['total_shots']} shots")
        print(f"  - Player 2: {player2_stats['total_shots']} shots")
        print("")
        
        # Save analytics to database
        print("💾 Saving analytics to database...")
        import asyncio
        success = asyncio.run(analytics_service.save_ml_pipeline_results(match.id, analytics_data))
        
        if success:
            print("✅ Analytics saved successfully!")
            print(f"   Match ID: {match.id}")
            print(f"   Status: Updated to COMPLETED")
            print("")
            print("You can now view the analytics at:")
            print(f"   http://localhost:3000/matches/{match.id}/analytics")
            return True
        else:
            print("❌ Failed to save analytics.")
            return False
        
    except Exception as e:
        print(f"❌ Error creating analytics: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_mock_analytics_for_latest_match()
    sys.exit(0 if success else 1)

