#!/usr/bin/env python3
"""
Get analytics and highlights for a specific match
"""
import os
import sys

# Set up paths
project_root = os.path.dirname(os.path.abspath(__file__))
api_path = os.path.join(project_root, 'apps', 'api')
sys.path.insert(0, api_path)

from sqlalchemy.orm import Session, joinedload
from app.core.database import SessionLocal
from app.models.match import Match
from app.models.analytics import Shot, Rally, MatchStats, Serve
from sqlalchemy import desc
from datetime import timedelta

def format_time(seconds):
    """Format seconds to MM:SS"""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"

def get_match_analytics(match_id: int):
    """Get comprehensive analytics for a match"""
    db: Session = SessionLocal()
    
    try:
        print(f"🔍 Fetching analytics for Match #{match_id}...")
        print("")
        
        # Get match with relationships
        match = db.query(Match).filter(Match.id == match_id).first()
        
        if not match:
            print(f"❌ Match #{match_id} not found.")
            return
        
        print(f"📊 Match: {match.title}")
        print(f"   Status: {match.status}")
        print("")
        
        # Get stats
        stats = db.query(MatchStats).filter(MatchStats.match_id == match_id).first()
        
        if stats:
            print("=" * 70)
            print("📈 MATCH STATISTICS")
            print("=" * 70)
            print(f"Total Points: {stats.total_points or 'N/A'}")
            print(f"Total Rallies: {stats.total_rallies or 'N/A'}")
            print(f"Total Shots: {stats.total_shots or 'N/A'}")
            print("")
            
            if stats.player1_stats:
                print("Player 1 Stats:")
                for key, value in stats.player1_stats.items():
                    print(f"  {key}: {value}")
                print("")
            
            if stats.player2_stats:
                print("Player 2 Stats:")
                for key, value in stats.player2_stats.items():
                    print(f"  {key}: {value}")
                print("")
        
        # Get all shots
        shots = db.query(Shot).filter(Shot.match_id == match_id).order_by(Shot.timestamp_seconds).all()
        
        if shots:
            print("=" * 70)
            print(f"🎾 SHOTS DETECTED ({len(shots)} total)")
            print("=" * 70)
            print("")
            
            for i, shot in enumerate(shots, 1):
                print(f"Shot #{i}:")
                print(f"  Time: {format_time(shot.timestamp_seconds)} ({shot.timestamp_seconds:.2f}s)")
                print(f"  Player: {shot.player_number}")
                print(f"  Type: {shot.shot_type.value if hasattr(shot.shot_type, 'value') else shot.shot_type}")
                if shot.outcome:
                    print(f"  Outcome: {shot.outcome.value if hasattr(shot.outcome, 'value') else shot.outcome}")
                if shot.direction:
                    print(f"  Direction: {shot.direction}")
                if shot.confidence_score:
                    print(f"  Confidence: {shot.confidence_score:.2%}")
                print("")
        
        # Get rallies
        rallies = db.query(Rally).filter(Rally.match_id == match_id).order_by(Rally.start_time).all()
        
        if rallies:
            print("=" * 70)
            print(f"🏓 RALLIES IDENTIFIED ({len(rallies)} total)")
            print("=" * 70)
            print("")
            
            for i, rally in enumerate(rallies, 1):
                print(f"Rally #{i}:")
                print(f"  Start: {format_time(rally.start_time)}")
                if rally.end_time:
                    print(f"  End: {format_time(rally.end_time)}")
                    print(f"  Duration: {rally.duration:.2f}s")
                print(f"  Shots: {rally.shot_count}")
                print(f"  Player 1 Shots: {rally.player1_shots}")
                print(f"  Player 2 Shots: {rally.player2_shots}")
                if rally.winner_player:
                    print(f"  Winner: Player {rally.winner_player}")
                if rally.ended_by:
                    print(f"  Ended By: {rally.ended_by}")
                print("")
        
        # Get serves
        serves = db.query(Serve).filter(Serve.match_id == match_id).order_by(Serve.timestamp_seconds).all()
        
        if serves:
            print("=" * 70)
            print(f"🎯 SERVES DETECTED ({len(serves)} total)")
            print("=" * 70)
            print("")
            
            for i, serve in enumerate(serves, 1):
                print(f"Serve #{i}:")
                print(f"  Time: {format_time(serve.timestamp_seconds)}")
                print(f"  Player: {serve.player_number}")
                print(f"  Serve #: {serve.serve_number}")
                print(f"  Side: {serve.serve_side}")
                print(f"  Is Fault: {serve.is_fault}")
                if serve.is_ace:
                    print(f"  ⭐ ACE!")
                if serve.is_double_fault:
                    print(f"  ⚠️  Double Fault")
                print("")
        
        # Get highlights from stats
        if stats and stats.highlights:
            print("=" * 70)
            print(f"🌟 HIGHLIGHTS ({len(stats.highlights)} events)")
            print("=" * 70)
            print("")
            
            for i, highlight in enumerate(stats.highlights, 1):
                print(f"Highlight #{i}:")
                print(f"  Start Time: {format_time(highlight.get('start_time', 0))}")
                print(f"  End Time: {format_time(highlight.get('end_time', 0))}")
                print(f"  Duration: {highlight.get('duration', 0):.2f}s")
                if highlight.get('event_type'):
                    print(f"  Event Type: {highlight['event_type']}")
                if highlight.get('player_number'):
                    print(f"  Player: {highlight['player_number']}")
                if highlight.get('description'):
                    print(f"  Description: {highlight['description']}")
                print("")
        else:
            print("=" * 70)
            print("🌟 HIGHLIGHTS")
            print("=" * 70)
            print("No highlights found in match stats.")
            print("")
        
        # Summary
        print("=" * 70)
        print("📊 SUMMARY")
        print("=" * 70)
        print(f"Total Shots: {len(shots)}")
        print(f"Total Rallies: {len(rallies)}")
        print(f"Total Serves: {len(serves)}")
        if stats and stats.highlights:
            print(f"Total Highlights: {len(stats.highlights)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    match_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
    if not match_id:
        print("Usage: python get_match_analytics.py <match_id>")
        sys.exit(1)
    
    get_match_analytics(match_id)




