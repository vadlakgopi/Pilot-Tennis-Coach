"""
Enhanced Analytics Engine
Generates comprehensive match analytics with all enhanced features
"""
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict

from app.processors.enhanced_shot_classifier import Shot
from app.processors.enhanced_ball_tracker import BallDetection
from app.processors.enhanced_player_tracker import PlayerDetection
from app.processors.enhanced_court_detector import CourtCalibration


class EnhancedAnalyticsEngine:
    """
    Enhanced analytics engine with all features:
    - Rally detection and statistics
    - Player movement heatmaps
    - Shot placement analysis
    - Serve speed estimation
    - Player fitness indicators
    - Stroke-level summary
    - Player comparison
    """
    
    def __init__(self, court_calibration: Optional[CourtCalibration] = None):
        self.court_calibration = court_calibration
    
    async def identify_rallies(
        self,
        shots: List[Shot],
        ball_trajectories: List[BallDetection]
    ) -> List[Dict[str, Any]]:
        """
        Identify rallies from shots and ball trajectories
        Uses continuous ball exchanges to define rallies
        """
        if not shots:
            return []
        
        rallies = []
        current_rally = None
        
        for i, shot in enumerate(shots):
            if current_rally is None:
                # Start new rally
                current_rally = {
                    "start_time": shot.timestamp,
                    "start_shot_id": shot.shot_id,
                    "shots": [shot],
                    "player1_shots": 0,
                    "player2_shots": 0
                }
            else:
                # Check if rally continues (shots within reasonable time)
                time_since_last = shot.timestamp - current_rally["shots"][-1].timestamp
                
                if time_since_last < 5.0:  # Rally continues if shots within 5 seconds
                    current_rally["shots"].append(shot)
                else:
                    # End current rally
                    current_rally = self._finalize_rally(current_rally)
                    rallies.append(current_rally)
                    
                    # Start new rally
                    current_rally = {
                        "start_time": shot.timestamp,
                        "start_shot_id": shot.shot_id,
                        "shots": [shot],
                        "player1_shots": 1 if shot.player_number == 1 else 0,
                        "player2_shots": 1 if shot.player_number == 2 else 0
                    }
            
            # Update shot counts
            if shot.player_number == 1:
                current_rally["player1_shots"] += 1
            else:
                current_rally["player2_shots"] += 1
        
        # Finalize last rally
        if current_rally:
            current_rally = self._finalize_rally(current_rally)
            rallies.append(current_rally)
        
        return rallies
    
    def _finalize_rally(self, rally: Dict) -> Dict:
        """Finalize rally with statistics"""
        if not rally["shots"]:
            return rally
        
        rally["end_time"] = rally["shots"][-1].timestamp
        rally["duration"] = rally["end_time"] - rally["start_time"]
        rally["shot_count"] = len(rally["shots"])
        
        # Determine winner
        if rally["player1_shots"] > rally["player2_shots"]:
            rally["winner_player"] = 1
        elif rally["player2_shots"] > rally["player1_shots"]:
            rally["winner_player"] = 2
        else:
            rally["winner_player"] = None
        
        # Determine how rally ended
        last_shot = rally["shots"][-1]
        if last_shot.outcome == "error":
            rally["ended_by"] = "error"
        elif last_shot.outcome == "winner":
            rally["ended_by"] = "winner"
        else:
            rally["ended_by"] = "unknown"
        
        # Remove shots list for serialization (keep only IDs)
        shot_ids = [s.shot_id for s in rally["shots"]]
        rally["shot_ids"] = shot_ids
        del rally["shots"]
        
        return rally
    
    async def generate_analytics(
        self,
        shots: List[Shot],
        rallies: List[Dict[str, Any]],
        player_tracks: List[PlayerDetection],
        player_tracker=None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive match analytics
        """
        # Basic statistics
        player1_shots = [s for s in shots if s.player_number == 1]
        player2_shots = [s for s in shots if s.player_number == 2]
        
        # Shot type distribution
        player1_shot_types = defaultdict(int)
        player2_shot_types = defaultdict(int)
        
        for shot in player1_shots:
            player1_shot_types[shot.shot_type] += 1
        for shot in player2_shots:
            player2_shot_types[shot.shot_type] += 1
        
        # Rally statistics
        avg_rally_length = (
            sum(r["shot_count"] for r in rallies) / len(rallies)
            if rallies else 0
        )
        longest_rally = max((r["shot_count"] for r in rallies), default=0)
        
        # Player movement heatmaps
        player1_heatmap = self._generate_heatmap(player_tracks, player_number=1)
        player2_heatmap = self._generate_heatmap(player_tracks, player_number=2)
        
        # Shot placement analysis
        player1_placements = self._analyze_shot_placements(player1_shots)
        player2_placements = self._analyze_shot_placements(player2_shots)
        
        # Serve statistics
        player1_serves = [s for s in player1_shots if s.shot_type == "serve"]
        player2_serves = [s for s in player2_shots if s.shot_type == "serve"]
        
        player1_serve_stats = self._calculate_serve_stats(player1_serves)
        player2_serve_stats = self._calculate_serve_stats(player2_serves)
        
        # Player fitness indicators
        player1_fitness = {}
        player2_fitness = {}
        if player_tracker:
            player1_fitness = player_tracker.get_player_stats(1)
            player2_fitness = player_tracker.get_player_stats(2)
        
        # Stroke-level summary
        player1_stroke_summary = self._generate_stroke_summary(player1_shots)
        player2_stroke_summary = self._generate_stroke_summary(player2_shots)
        
        analytics = {
            "player1_stats": {
                "total_shots": len(player1_shots),
                "shot_distribution": dict(player1_shot_types),
                "heatmap": player1_heatmap,
                "shot_placements": player1_placements,
                "serve_stats": player1_serve_stats,
                "fitness": player1_fitness,
                "stroke_summary": player1_stroke_summary
            },
            "player2_stats": {
                "total_shots": len(player2_shots),
                "shot_distribution": dict(player2_shot_types),
                "heatmap": player2_heatmap,
                "shot_placements": player2_placements,
                "serve_stats": player2_serve_stats,
                "fitness": player2_fitness,
                "stroke_summary": player2_stroke_summary
            },
            "rally_stats": {
                "total_rallies": len(rallies),
                "average_rally_length": avg_rally_length,
                "longest_rally": longest_rally,
                "rallies": rallies
            },
            "shots": [self._shot_to_dict(s) for s in shots]
        }
        
        return analytics
    
    def _generate_heatmap(
        self,
        player_tracks: List[PlayerDetection],
        player_number: int
    ) -> List[Dict[str, Any]]:
        """Generate player movement heatmap"""
        player_tracks_filtered = [
            p for p in player_tracks if p.player_id == player_number
        ]
        
        if not player_tracks_filtered or not self.court_calibration:
            return []
        
        # Convert player positions to court coordinates
        heatmap_data = []
        for track in player_tracks_filtered:
            try:
                court_x, court_y = self.court_calibration.pixel_to_court_coords(
                    track.center[0],
                    track.center[1]
                )
                heatmap_data.append({
                    "x": float(court_x),
                    "y": float(court_y),
                    "intensity": 1.0
                })
            except:
                continue
        
        # Cluster nearby points to reduce data size
        # Simplified: return all points (can be optimized with clustering)
        return heatmap_data
    
    def _analyze_shot_placements(self, shots: List[Shot]) -> Dict[str, Any]:
        """Analyze shot placement patterns"""
        placements = []
        
        for shot in shots:
            if shot.court_position:
                placements.append({
                    "x": shot.court_position[0],
                    "y": shot.court_position[1],
                    "shot_type": shot.shot_type,
                    "outcome": shot.outcome
                })
        
        # Calculate clusters (simplified)
        # In production, use K-means or DBSCAN
        
        return {
            "total_placements": len(placements),
            "placements": placements
        }
    
    def _calculate_serve_stats(self, serves: List[Shot]) -> Dict[str, Any]:
        """Calculate serve statistics"""
        if not serves:
            return {
                "total_serves": 0,
                "avg_speed_mps": 0.0,
                "max_speed_mps": 0.0,
                "serve_types": {}
            }
        
        speeds = [s.serve_speed_mps for s in serves if s.serve_speed_mps]
        serve_types = defaultdict(int)
        
        for serve in serves:
            if serve.serve_type:
                serve_types[serve.serve_type] += 1
        
        return {
            "total_serves": len(serves),
            "avg_speed_mps": sum(speeds) / len(speeds) if speeds else 0.0,
            "max_speed_mps": max(speeds) if speeds else 0.0,
            "serve_types": dict(serve_types)
        }
    
    def _generate_stroke_summary(self, shots: List[Shot]) -> Dict[str, Any]:
        """Generate stroke-level summary"""
        outcomes = defaultdict(int)
        shot_types = defaultdict(int)
        
        for shot in shots:
            if shot.outcome:
                outcomes[shot.outcome] += 1
            if shot.shot_type:
                shot_types[shot.shot_type] += 1
        
        return {
            "total_strokes": len(shots),
            "outcomes": dict(outcomes),
            "shot_types": dict(shot_types)
        }
    
    def _shot_to_dict(self, shot: Shot) -> Dict[str, Any]:
        """Convert Shot object to dictionary"""
        return {
            "player_number": shot.player_number,
            "timestamp": shot.timestamp,
            "shot_type": shot.shot_type,
            "direction": shot.direction,
            "outcome": shot.outcome,
            "court_position": list(shot.court_position) if shot.court_position else None,
            "confidence": shot.confidence,
            "serve_speed_mps": shot.serve_speed_mps,
            "serve_type": shot.serve_type
        }





