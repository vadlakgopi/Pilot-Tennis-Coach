"""
Highlights Video Generator
Generates highlights video from match analytics showing winners, aces, and smashes
"""
import cv2
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from app.utils.logger import log_info, log_warning, log_error


@dataclass
class HighlightClip:
    """Represents a highlight clip to extract"""
    start_time: float  # Start timestamp in seconds
    end_time: float    # End timestamp in seconds
    highlight_type: str  # 'winner', 'ace', 'smash'
    description: str
    player_number: Optional[int] = None


class HighlightsGenerator:
    """Generate highlights video from match analytics"""
    
    def __init__(self, video_path: str, output_path: str):
        self.video_path = video_path
        self.output_path = output_path
        self.clips: List[HighlightClip] = []
    
    def identify_highlights(self, shots: List[Dict], rallies: List[Dict]) -> List[HighlightClip]:
        """
        Identify highlight moments from shots and rallies
        
        Highlights include:
        - Shot sequences ending with winners
        - Serve aces
        - Smashes
        """
        highlights = []
        
        # Find winners (shots with outcome='winner')
        for shot in shots:
            if shot.get('outcome') == 'winner':
                # Get shot sequence leading to winner (last 3-5 shots before winner)
                highlight_type = 'winner'
                start_time = max(0, shot.get('timestamp', 0) - 5.0)  # 5 seconds before
                end_time = shot.get('timestamp', 0) + 2.0  # 2 seconds after
                
                highlights.append(HighlightClip(
                    start_time=start_time,
                    end_time=end_time,
                    highlight_type=highlight_type,
                    description=f"Winner by Player {shot.get('player_number', 'Unknown')}",
                    player_number=shot.get('player_number')
                ))
            
            # Find aces (serves with outcome='ace')
            if shot.get('shot_type') == 'serve' and shot.get('outcome') == 'ace':
                highlight_type = 'ace'
                start_time = max(0, shot.get('timestamp', 0) - 2.0)  # 2 seconds before
                end_time = shot.get('timestamp', 0) + 3.0  # 3 seconds after
                
                highlights.append(HighlightClip(
                    start_time=start_time,
                    end_time=end_time,
                    highlight_type=highlight_type,
                    description=f"Ace by Player {shot.get('player_number', 'Unknown')}",
                    player_number=shot.get('player_number')
                ))
            
            # Find smashes (overhead shots)
            if shot.get('shot_type') in ['smash', 'overhead']:
                highlight_type = 'smash'
                start_time = max(0, shot.get('timestamp', 0) - 2.0)  # 2 seconds before
                end_time = shot.get('timestamp', 0) + 2.0  # 2 seconds after
                
                highlights.append(HighlightClip(
                    start_time=start_time,
                    end_time=end_time,
                    highlight_type=highlight_type,
                    description=f"Smash by Player {shot.get('player_number', 'Unknown')}",
                    player_number=shot.get('player_number')
                ))
        
        # Sort by timestamp
        highlights.sort(key=lambda x: x.start_time)
        
        # Merge overlapping clips
        merged = []
        for clip in highlights:
            if not merged:
                merged.append(clip)
            else:
                last = merged[-1]
                # If clips overlap or are close (< 1 second apart), merge them
                if clip.start_time <= last.end_time + 1.0:
                    last.end_time = max(last.end_time, clip.end_time)
                    last.description += f" | {clip.description}"
                else:
                    merged.append(clip)
        
        self.clips = merged
        return merged
    
    def generate_highlights_video(self, clips: List[HighlightClip]) -> bool:
        """
        Generate highlights video by extracting and concatenating clips
        
        Args:
            clips: List of highlight clips to extract
            
        Returns:
            True if successful, False otherwise
        """
        if not clips:
            log_warning("No highlights to generate")
            return False
        
        if not os.path.exists(self.video_path):
            log_error(f"Source video not found: {self.video_path}")
            return False
        
        # Open source video
        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            log_error(f"Could not open source video: {self.video_path}")
            return False
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        # Create output directory
        output_dir = Path(self.output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Setup video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(self.output_path, fourcc, fps, (width, height))
        
        if not out.isOpened():
            log_error(f"Could not create output video: {self.output_path}")
            cap.release()
            return False
        
        log_info(f"Generating highlights video with {len(clips)} clips...")
        
        # Extract and write each clip
        for i, clip in enumerate(clips):
            log_info(f"Processing clip {i+1}/{len(clips)}: {clip.highlight_type} at {clip.start_time:.1f}s-{clip.end_time:.1f}s")
            
            # Clamp times to video duration
            start_time = max(0, min(clip.start_time, duration))
            end_time = max(start_time, min(clip.end_time, duration))
            
            # Calculate frame numbers
            start_frame = int(start_time * fps)
            end_frame = int(end_time * fps)
            
            # Seek to start frame
            cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
            
            # Read and write frames
            frame_count = start_frame
            while frame_count < end_frame:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Add text overlay with highlight info
                text = f"{clip.highlight_type.upper()}"
                cv2.putText(frame, text, (50, 50), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
                
                out.write(frame)
                frame_count += 1
        
        # Release resources
        cap.release()
        out.release()
        
        log_info(f"✅ Highlights video generated: {self.output_path}")
        return True
    
    def generate_from_analytics(self, analytics: Dict[str, Any]) -> bool:
        """
        Generate highlights video from analytics data
        
        Args:
            analytics: Analytics dictionary with shots and rallies
            
        Returns:
            True if successful, False otherwise
        """
        shots = analytics.get('shots', [])
        rallies = analytics.get('rallies', [])
        
        # Identify highlights
        clips = self.identify_highlights(shots, rallies)
        
        if not clips:
            log_warning("No highlights found in analytics")
            return False
        
        # Generate video
        return self.generate_highlights_video(clips)

