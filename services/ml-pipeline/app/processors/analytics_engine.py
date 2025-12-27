"""
Analytics Engine
Generates match analytics from processed data
"""
from typing import List, Dict, Any, Union


class AnalyticsEngine:
    def __init__(self):
        pass
    
    async def identify_rallies(
        self,
        shots: List[Any],
        ball_trajectories: List[Any]
    ) -> List[Dict[str, Any]]:
        """
        Identify rallies based on tennis rules:
        - Serve marks the start of a point
        - Points end when players stop play (error, winner, or long gap >10 seconds)
        - Server side change indicates a new point
        - Fault on 1st serve followed by 2nd serve from same side is still the same point
        """
        rallies = []
        current_rally = None
        previous_serve_side = None
        previous_server = None
        
        for i, shot in enumerate(shots):
            # Check if this is a new point (serve with is_point_start=True or server/side changed)
            is_new_point = False
            
            if hasattr(shot, 'is_point_start') and shot.is_point_start:
                # Explicitly marked as point start
                is_new_point = True
            elif shot.shot_type == "serve" and hasattr(shot, 'serve_side') and shot.serve_side:
                # Check if server or side changed from previous serve
                if previous_serve_side is not None and previous_server is not None:
                    if shot.serve_side != previous_serve_side or shot.player_number != previous_server:
                        is_new_point = True
                else:
                    # First serve in the match
                    is_new_point = True
                
                # Update tracking
                previous_serve_side = shot.serve_side
                previous_server = shot.player_number
            elif shot.shot_type == "serve":
                # Serve without side info - check time gap (long gap = new point)
                if current_rally and "shots" in current_rally and current_rally["shots"]:
                    time_since_last = shot.timestamp - current_rally["shots"][-1].timestamp
                    if time_since_last > 10.0:  # Long gap indicates new point
                        is_new_point = True
            
            # If new point, end current rally and start new one
            if is_new_point and current_rally:
                # End current rally
                if "shots" in current_rally and current_rally["shots"]:
                    current_rally["end_time"] = current_rally["shots"][-1].timestamp
                    current_rally["duration"] = current_rally["end_time"] - current_rally["start_time"]
                    current_rally["shot_count"] = len(current_rally["shots"])
                    
                    # Determine winner
                    if current_rally["player1_shots"] > current_rally["player2_shots"]:
                        current_rally["winner_player"] = 1
                    elif current_rally["player2_shots"] > current_rally["player1_shots"]:
                        current_rally["winner_player"] = 2
                    else:
                        current_rally["winner_player"] = None
                    current_rally["ended_by"] = "point_end"
                    # Remove shots list for serialization
                    del current_rally["shots"]
                    rallies.append(current_rally)
                current_rally = None
            
            # Start new rally if needed
            if current_rally is None:
                current_rally = {
                    "start_time": shot.timestamp,
                    "shots": [shot],
                    "player1_shots": 1 if shot.player_number == 1 else 0,
                    "player2_shots": 1 if shot.player_number == 2 else 0
                }
            else:
                # Check if rally continues
                time_since_last = shot.timestamp - current_rally["shots"][-1].timestamp
                
                # Rally continues if shots are within 5 seconds (active play)
                # OR if this is a 2nd serve (fault followed by serve from same side)
                is_second_serve = (
                    shot.shot_type == "serve" and 
                    i > 0 and 
                    hasattr(shots[i-1], 'shot_type') and shots[i-1].shot_type == "serve" and 
                    shots[i-1].player_number == shot.player_number and
                    hasattr(shot, 'serve_side') and hasattr(shots[i-1], 'serve_side') and
                    shot.serve_side == shots[i-1].serve_side
                )
                
                if time_since_last < 5.0 or is_second_serve:
                    # Rally continues
                    current_rally["shots"].append(shot)
                    if shot.player_number == 1:
                        current_rally["player1_shots"] += 1
                    else:
                        current_rally["player2_shots"] += 1
                else:
                    # Long gap indicates point ended (players stopped play)
                    current_rally["end_time"] = current_rally["shots"][-1].timestamp
                    current_rally["duration"] = current_rally["end_time"] - current_rally["start_time"]
                    current_rally["shot_count"] = len(current_rally["shots"])
                    
                    if current_rally["player1_shots"] > current_rally["player2_shots"]:
                        current_rally["winner_player"] = 1
                    elif current_rally["player2_shots"] > current_rally["player1_shots"]:
                        current_rally["winner_player"] = 2
                    else:
                        current_rally["winner_player"] = None
                    
                    current_rally["ended_by"] = "play_stopped"
                    del current_rally["shots"]
                    rallies.append(current_rally)
                    
                    # Start new rally
                    current_rally = {
                        "start_time": shot.timestamp,
                        "shots": [shot],
                        "player1_shots": 1 if shot.player_number == 1 else 0,
                        "player2_shots": 1 if shot.player_number == 2 else 0
                    }
            
            # Check if shot ended the rally (error or winner)
            if hasattr(shot, 'outcome') and shot.outcome in ["out", "net", "winner", "ace"]:
                if current_rally and "shots" in current_rally:
                    current_rally["end_time"] = shot.timestamp
                    if shot.outcome in ["winner", "ace"]:
                        current_rally["winner_player"] = shot.player_number
                        current_rally["ended_by"] = "winner"
                    elif shot.outcome in ["out", "net"]:
                        # Opposite player wins
                        current_rally["winner_player"] = 2 if shot.player_number == 1 else 1
                        current_rally["ended_by"] = "error"
        
        # Add final rally
        if current_rally:
            if "shots" in current_rally and current_rally["shots"]:
                current_rally["end_time"] = current_rally["shots"][-1].timestamp
                current_rally["duration"] = current_rally["end_time"] - current_rally["start_time"]
                current_rally["shot_count"] = len(current_rally["shots"])
                
                if current_rally["player1_shots"] > current_rally["player2_shots"]:
                    current_rally["winner_player"] = 1
                elif current_rally["player2_shots"] > current_rally["player1_shots"]:
                    current_rally["winner_player"] = 2
                else:
                    current_rally["winner_player"] = None
                
                if "ended_by" not in current_rally:
                    current_rally["ended_by"] = "match_end"
                del current_rally["shots"]
                rallies.append(current_rally)
        
        return rallies
    
    async def generate_analytics(
        self,
        shots: List[Any],
        rallies: List[Dict[str, Any]],
        player_tracks: List
    ) -> Dict[str, Any]:
        """
        Generate comprehensive match analytics
        """
        # Calculate player statistics
        player1_shots = [s for s in shots if s.player_number == 1]
        player2_shots = [s for s in shots if s.player_number == 2]
        
        # Shot type distribution
        player1_shot_types = {}
        player2_shot_types = {}
        
        for shot in player1_shots:
            player1_shot_types[shot.shot_type] = (
                player1_shot_types.get(shot.shot_type, 0) + 1
            )
        
        for shot in player2_shots:
            player2_shot_types[shot.shot_type] = (
                player2_shot_types.get(shot.shot_type, 0) + 1
            )
        
        # Rally statistics
        avg_rally_length = (
            sum(r["shot_count"] for r in rallies) / len(rallies)
            if rallies else 0
        )
        longest_rally = max((r["shot_count"] for r in rallies), default=0)
        
        analytics = {
            "match_id": None,  # Will be set by processor
            "player1_stats": {
                "total_shots": len(player1_shots),
                "shot_distribution": player1_shot_types
            },
            "player2_stats": {
                "total_shots": len(player2_shots),
                "shot_distribution": player2_shot_types
            },
            "rally_stats": {
                "total_rallies": len(rallies),
                "average_rally_length": avg_rally_length,
                "longest_rally": longest_rally
            },
            "shots": [self._shot_to_dict(s) for s in shots],
            "rallies": rallies
        }
        
        return analytics
    
    def _shot_to_dict(self, shot: Any) -> Dict[str, Any]:
        """Convert Shot object to dictionary"""
        # Handle both dataclass and regular object
        if hasattr(shot, '__dict__'):
            data = shot.__dict__
        else:
            # Try to get attributes directly
            data = {
                'player_number': getattr(shot, 'player_number', 1),
                'timestamp': getattr(shot, 'timestamp', 0.0),
                'shot_type': getattr(shot, 'shot_type', 'forehand'),
                'outcome': getattr(shot, 'outcome', 'in'),
                'confidence': getattr(shot, 'confidence', 0.8),
            }
            # Handle court_position
            if hasattr(shot, 'court_position'):
                pos = shot.court_position
                data['court_position'] = list(pos) if isinstance(pos, (list, tuple)) else [getattr(shot, 'court_x', 0), getattr(shot, 'court_y', 0)]
            else:
                data['court_position'] = [getattr(shot, 'court_x', 0), getattr(shot, 'court_y', 0)]
            data['direction'] = getattr(shot, 'direction', None)
        
        # Ensure court_position is a list
        if 'court_position' in data and isinstance(data['court_position'], tuple):
            data['court_position'] = list(data['court_position'])
        
        return {
            "player_number": data.get('player_number', 1),
            "timestamp": data.get('timestamp', 0.0),
            "shot_type": data.get('shot_type', 'forehand'),
            "direction": data.get('direction', None),
            "outcome": data.get('outcome', 'in'),
            "court_position": data.get('court_position', [0, 0]),
            "confidence": data.get('confidence', 0.8)
        }


