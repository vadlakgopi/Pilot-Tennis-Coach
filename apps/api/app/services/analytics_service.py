"""
Analytics Service
"""
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import random

from app.models.match import Match, MatchStatus
from app.models.analytics import MatchStats, Shot, Serve, Rally as RallyModel
from app.schemas.analytics import (
    MatchStatsResponse,
    ShotHeatmapResponse,
    ServeAnalysisResponse,
    PlayerComparisonResponse,
    PlayerStats,
    Highlight,
    HighlightsResponse,
)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
    
    def _calculate_longest_rally(self, match_id: int) -> int:
        """Calculate longest rally from Rally records"""
        from app.models.analytics import Rally
        longest_rally_obj = (
            self.db.query(Rally)
            .filter(Rally.match_id == match_id)
            .order_by(Rally.shot_count.desc())
            .first()
        )
        return longest_rally_obj.shot_count if longest_rally_obj else 0

    async def generate_mock_stats(
        self, match_id: int, user_id: int
    ) -> Optional[MatchStatsResponse]:
        """
        Generate mock analytics for a match.

        This is used during early development before the full ML pipeline is ready.
        """
        match = (
            self.db.query(Match)
            .filter(Match.id == match_id, Match.user_id == user_id)
            .first()
        )
        if not match:
            return None

        # Basic mock numbers
        total_points = random.randint(80, 150)
        total_rallies = random.randint(40, 80)
        longest_rally = random.randint(10, 25)

        def mock_player_stats(player_number: int) -> Dict[str, Any]:
            points_won = random.randint(int(total_points * 0.4), int(total_points * 0.6))
            winners = random.randint(10, 40)
            unforced_errors = random.randint(5, 30)
            forced_errors = random.randint(5, 25)
            errors = unforced_errors + forced_errors
            shot_distribution = {
                "forehand": random.randint(30, 80),
                "backhand": random.randint(20, 60),
                "volley": random.randint(5, 20),
                "serve": random.randint(30, 60),
            }
            return {
                "player_number": player_number,
                "total_points": total_points,
                "points_won": points_won,
                "winners": winners,
                "errors": errors,
                "unforced_errors": unforced_errors,
                "forced_errors": forced_errors,
                "shot_distribution": shot_distribution,
                "court_coverage": round(random.uniform(40, 80), 1),
                "average_rally_length": round(total_rallies and total_points / total_rallies or 3.5, 1),
            }

        player1_stats_dict = mock_player_stats(1)
        player2_stats_dict = mock_player_stats(2)

        # Create or update MatchStats row
        stats = (
            self.db.query(MatchStats)
            .filter(MatchStats.match_id == match_id)
            .first()
        )
        if not stats:
            stats = MatchStats(match_id=match_id, player1_stats={}, player2_stats={})
            self.db.add(stats)

        stats.player1_stats = player1_stats_dict
        stats.player2_stats = player2_stats_dict
        stats.total_points = total_points
        stats.total_rallies = total_rallies
        stats.total_shots = (
            player1_stats_dict["shot_distribution"]["forehand"]
            + player1_stats_dict["shot_distribution"]["backhand"]
            + player2_stats_dict["shot_distribution"]["forehand"]
            + player2_stats_dict["shot_distribution"]["backhand"]
        )
        
        # Update match status to COMPLETED (Ready) since analytics are now available
        match.status = MatchStatus.COMPLETED
        if not match.completed_at:
            from datetime import datetime, timezone
            match.completed_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(stats)

        return MatchStatsResponse(
            match_id=match_id,
            player1_stats=PlayerStats(**player1_stats_dict),
            player2_stats=PlayerStats(**player2_stats_dict),
            total_rallies=stats.total_rallies or 0,
            longest_rally=longest_rally,
            match_duration_minutes=match.duration_minutes,
        )

    async def get_match_stats(
        self, match_id: int, user_id: int
    ) -> Optional[MatchStatsResponse]:
        match = (
            self.db.query(Match)
            .filter(Match.id == match_id, Match.user_id == user_id)
            .first()
        )
        if not match or not match.stats:
            return None

        return MatchStatsResponse(
            match_id=match_id,
            player1_stats=PlayerStats(**match.stats.player1_stats),
            player2_stats=PlayerStats(**match.stats.player2_stats),
            total_rallies=match.stats.total_rallies or 0,
            longest_rally=self._calculate_longest_rally(match_id),
            match_duration_minutes=match.duration_minutes,
        )
    
    async def get_shot_heatmap(
        self, match_id: int, player_number: Optional[int], user_id: int
    ) -> Optional[ShotHeatmapResponse]:
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match:
            return None
        
        query = self.db.query(Shot).filter(Shot.match_id == match_id)
        if player_number:
            query = query.filter(Shot.player_number == player_number)
        
        shots = query.all()
        # Generate heatmap data from shots
        heatmap_data = [
            {"x": shot.court_x, "y": shot.court_y, "intensity": 1}
            for shot in shots if shot.court_x and shot.court_y
        ]
        
        return ShotHeatmapResponse(
            match_id=match_id,
            player_number=player_number,
            heatmap_data=heatmap_data,
            total_shots=len(shots)
        )
    
    async def get_serve_analysis(
        self, match_id: int, player_number: Optional[int], user_id: int
    ) -> Optional[ServeAnalysisResponse]:
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match:
            return None
        
        query = self.db.query(Serve).filter(Serve.match_id == match_id)
        if player_number:
            query = query.filter(Serve.player_number == player_number)
        
        serves = query.all()
        # Calculate serve statistics
        first_serves = [s for s in serves if s.serve_number == 1]
        second_serves = [s for s in serves if s.serve_number == 2]
        
        first_serve_in = len([s for s in first_serves if not s.is_fault])
        second_serve_in = len([s for s in second_serves if not s.is_fault])
        
        return ServeAnalysisResponse(
            match_id=match_id,
            player_number=player_number,
            first_serve_percentage=(first_serve_in / len(first_serves) * 100) if first_serves else 0,
            second_serve_percentage=(second_serve_in / len(second_serves) * 100) if second_serves else 0,
            ace_count=len([s for s in serves if s.is_ace]),
            double_fault_count=len([s for s in serves if s.is_double_fault]),
            average_speed=sum([s.speed_estimate for s in serves if s.speed_estimate]) / len(serves) if serves else None,
            placement_distribution={},  # Calculate from serves
            points_won_on_serve={}  # Calculate from serves
        )
    
    async def get_player_comparison(
        self, match_id: int, user_id: int
    ) -> Optional[PlayerComparisonResponse]:
        stats = await self.get_match_stats(match_id, user_id)
        if not stats:
            return None
        
        return PlayerComparisonResponse(
            match_id=match_id,
            player1_stats=stats.player1_stats,
            player2_stats=stats.player2_stats,
            comparison_metrics={}
        )
    
    async def get_highlights(
        self, match_id: int, user_id: int
    ) -> Optional[HighlightsResponse]:
        match = self.db.query(Match).filter(
            Match.id == match_id,
            Match.user_id == user_id
        ).first()
        if not match or not match.stats or not match.stats.highlights:
            return None
        
        highlights = [
            Highlight(**h) for h in match.stats.highlights
        ]
        
        return HighlightsResponse(
            match_id=match_id,
            highlights=highlights
        )
    
    async def save_ml_pipeline_results(self, match_id: int, analytics_data: Dict[str, Any]) -> bool:
        """
        Save analytics results from ML pipeline to database.
        
        This method is called by the ML pipeline service after processing a video.
        """
        from datetime import datetime, timezone
        
        match = self.db.query(Match).filter(Match.id == match_id).first()
        if not match:
            return False
        
        try:
            # Extract analytics data
            player1_stats = analytics_data.get("player1_stats", {})
            player2_stats = analytics_data.get("player2_stats", {})
            rally_stats = analytics_data.get("rally_stats", {})
            shots_data = analytics_data.get("shots", [])
            rallies_data = analytics_data.get("rallies", [])
            
            # Create or update MatchStats
            stats = (
                self.db.query(MatchStats)
                .filter(MatchStats.match_id == match_id)
                .first()
            )
            
            if not stats:
                stats = MatchStats(
                    match_id=match_id,
                    player1_stats={},
                    player2_stats={}
                )
                self.db.add(stats)
            
            # Update player stats - calculate all required fields for PlayerStats schema
            # Calculate additional stats from shots if needed
            player1_shots_list = [s for s in shots_data if s.get("player_number") == 1]
            player2_shots_list = [s for s in shots_data if s.get("player_number") == 2]
            
            # Calculate winners and errors from shot outcomes
            player1_winners = len([s for s in player1_shots_list if s.get("outcome") in ["winner", "ace"]])
            player2_winners = len([s for s in player2_shots_list if s.get("outcome") in ["winner", "ace"]])
            player1_errors = len([s for s in player1_shots_list if s.get("outcome") in ["out", "net"]])
            player2_errors = len([s for s in player2_shots_list if s.get("outcome") in ["out", "net"]])
            
            # Estimate total points from rallies
            total_points_est = len(rallies_data) * 2  # Rough estimate
            
            stats.player1_stats = {
                "player_number": 1,
                "total_points": total_points_est,
                "points_won": int(total_points_est * 0.55),  # Estimate
                "total_shots": player1_stats.get("total_shots", len(player1_shots_list)),
                "winners": player1_winners,
                "errors": player1_errors,
                "unforced_errors": int(player1_errors * 0.6),
                "forced_errors": int(player1_errors * 0.4),
                "shot_distribution": player1_stats.get("shot_distribution", {}),
                "court_coverage": 65.0,  # Default value
                "average_rally_length": rally_stats.get("average_rally_length", 0) or (rally_stats.get("longest_rally", 0) * 0.6)
            }
            stats.player2_stats = {
                "player_number": 2,
                "total_points": total_points_est,
                "points_won": int(total_points_est * 0.45),  # Estimate
                "total_shots": player2_stats.get("total_shots", len(player2_shots_list)),
                "winners": player2_winners,
                "errors": player2_errors,
                "unforced_errors": int(player2_errors * 0.6),
                "forced_errors": int(player2_errors * 0.4),
                "shot_distribution": player2_stats.get("shot_distribution", {}),
                "court_coverage": 62.0,  # Default value
                "average_rally_length": rally_stats.get("average_rally_length", 0) or (rally_stats.get("longest_rally", 0) * 0.6)
            }
            
            # Update rally stats
            stats.total_rallies = rally_stats.get("total_rallies", len(rallies_data))
            # Calculate longest rally from rallies_data
            longest_rally_shots = max([r.get("shot_count", 0) for r in rallies_data], default=0)
            stats.longest_rally = rally_stats.get("longest_rally", longest_rally_shots)
            stats.total_shots = (
                player1_stats.get("total_shots", len(player1_shots_list)) + 
                player2_stats.get("total_shots", len(player2_shots_list))
            )
            
            # Save rallies and shots
            # First, delete existing rallies and shots for this match
            self.db.query(Shot).filter(Shot.match_id == match_id).delete()
            self.db.query(RallyModel).filter(RallyModel.match_id == match_id).delete()
            
            # Create rally mappings for shots
            rally_map = {}
            
            # Create Rally records
            for idx, rally_data in enumerate(rallies_data):
                rally = RallyModel(
                    match_id=match_id,
                    start_time=rally_data.get("start_time", 0.0),
                    end_time=rally_data.get("end_time", 0.0),
                    duration_seconds=rally_data.get("duration", 0.0),
                    shot_count=rally_data.get("shot_count", 0),
                    winner_player=rally_data.get("winner_player"),
                    ended_by=rally_data.get("ended_by")
                )
                self.db.add(rally)
                self.db.flush()  # Get the rally ID
                rally_map[idx] = rally.id
            
            # Create Shot records
            for shot_data in shots_data:
                from app.models.analytics import ShotType, ShotOutcome
                
                shot_type_str = shot_data.get("shot_type", "forehand").lower()
                shot_type = getattr(ShotType, shot_type_str.upper(), ShotType.FOREHAND)
                
                outcome_str = shot_data.get("outcome")
                outcome = None
                if outcome_str:
                    try:
                        outcome = getattr(ShotOutcome, outcome_str.upper())
                    except AttributeError:
                        outcome = ShotOutcome.IN_PLAY
                
                court_position = shot_data.get("court_position")
                court_x = court_position[0] if court_position and len(court_position) > 0 else None
                court_y = court_position[1] if court_position and len(court_position) > 1 else None
                
                # Find corresponding rally (simplified - in production, map properly)
                rally_id = None
                shot_timestamp = shot_data.get("timestamp", 0.0)
                for idx, rally_data in enumerate(rallies_data):
                    if (rally_data.get("start_time", 0) <= shot_timestamp <= 
                        rally_data.get("end_time", float('inf'))):
                        rally_id = rally_map.get(idx)
                        break
                
                shot = Shot(
                    match_id=match_id,
                    rally_id=rally_id,
                    player_number=shot_data.get("player_number", 1),
                    shot_type=shot_type,
                    outcome=outcome,
                    timestamp_seconds=shot_timestamp,
                    court_x=court_x,
                    court_y=court_y,
                    direction=shot_data.get("direction"),
                    confidence_score=shot_data.get("confidence", 0.0)
                )
                self.db.add(shot)
            
            # Update match status to COMPLETED
            match.status = MatchStatus.COMPLETED
            match.processing_progress = 1.0
            if not match.completed_at:
                match.completed_at = datetime.now(timezone.utc)
            
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            print(f"Error saving ML pipeline results: {str(e)}")
            match.status = MatchStatus.FAILED
            match.error_message = f"Failed to save analytics: {str(e)}"
            self.db.commit()
            return False

