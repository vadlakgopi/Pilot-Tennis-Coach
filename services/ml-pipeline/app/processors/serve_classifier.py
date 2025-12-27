"""
Serve Type Classification Module
Classifies serves into flat, slice, and kick using pose + speed + LSTM
"""
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    nn = None

from app.processors.enhanced_player_tracker import PlayerDetection
from app.processors.enhanced_ball_tracker import BallDetection


@dataclass
class ServeClassification:
    """Serve classification result"""
    serve_type: str  # flat, slice, kick
    confidence: float
    speed_mps: float  # Serve speed in m/s
    placement: Optional[str] = None  # wide, T, body


class LSTMServeClassifier(nn.Module):
    """
    LSTM-based serve type classifier
    """
    def __init__(self, input_size=136, hidden_size=64, num_layers=2, num_classes=3):
        # input_size: 132 (pose) + 4 (speed features) = 136
        super(LSTMServeClassifier, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc1 = nn.Linear(hidden_size, 32)
        self.dropout = nn.Dropout(0.3)
        self.fc2 = nn.Linear(32, num_classes)
        self.relu = nn.ReLU()
        
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_output = lstm_out[:, -1, :]
        x = self.relu(self.fc1(last_output))
        x = self.dropout(x)
        x = self.fc2(x)
        return x


class ServeTypeClassifier:
    """
    Serve type classifier using pose estimation + speed model + LSTM
    """
    def __init__(self):
        self.lstm_model = None
        if TORCH_AVAILABLE:
            try:
                self.lstm_model = LSTMServeClassifier(
                    input_size=136,  # 132 (pose) + 4 (speed features)
                    hidden_size=64,
                    num_layers=2,
                    num_classes=3  # flat, slice, kick
                )
                self.lstm_model.eval()
            except:
                self.lstm_model = None
        
        self.serve_types = ['flat', 'slice', 'kick']
    
    async def classify_serve(
        self,
        player_det: PlayerDetection,
        ball_det: BallDetection,
        pose_sequence: Optional[np.ndarray] = None
    ) -> ServeClassification:
        """
        Classify serve type
        
        Args:
            player_det: Player detection at serve time
            ball_det: Ball detection after serve
            pose_sequence: Optional pose keypoint sequence
            
        Returns:
            ServeClassification with type, confidence, and speed
        """
        # Calculate serve speed
        speed_mps = ball_det.speed_mps if ball_det and ball_det.speed_mps else 0.0
        
        # Extract pose sequence if not provided
        if pose_sequence is None and player_det.pose_keypoints is not None:
            pose_sequence = self._create_pose_sequence(player_det.pose_keypoints)
        
        # Classify using LSTM if available
        if self.lstm_model and pose_sequence is not None:
            serve_type, confidence = await self._classify_with_lstm(
                pose_sequence,
                speed_mps,
                ball_det
            )
        else:
            serve_type, confidence = self._classify_with_heuristics(
                speed_mps,
                ball_det
            )
        
        # Determine serve placement
        placement = self._determine_placement(ball_det)
        
        return ServeClassification(
            serve_type=serve_type,
            confidence=confidence,
            speed_mps=speed_mps,
            placement=placement
        )
    
    async def _classify_with_lstm(
        self,
        pose_sequence: np.ndarray,
        speed_mps: float,
        ball_det: BallDetection
    ) -> Tuple[str, float]:
        """Classify serve type using LSTM"""
        if not TORCH_AVAILABLE or self.lstm_model is None:
            return self._classify_with_heuristics(speed_mps, ball_det)
        
        try:
            # Prepare features: pose + speed features
            speed_features = np.array([
                speed_mps,
                ball_det.velocity[0] if ball_det.velocity else 0.0,
                ball_det.velocity[1] if ball_det.velocity else 0.0,
                abs(ball_det.velocity[0]) if ball_det.velocity else 0.0
            ])
            
            # Combine pose and speed features
            if len(pose_sequence.shape) == 1:
                pose_sequence = pose_sequence.reshape(1, -1)
            
            # Ensure sequence is right length
            if pose_sequence.shape[1] < 132:
                pose_sequence = np.pad(pose_sequence, ((0, 0), (0, 132 - pose_sequence.shape[1])))
            elif pose_sequence.shape[1] > 132:
                pose_sequence = pose_sequence[:, :132]
            
            # Add speed features
            speed_features_expanded = np.tile(speed_features, (pose_sequence.shape[0], 1))
            features = np.concatenate([pose_sequence, speed_features_expanded], axis=1)
            
            # Prepare tensor: (1, sequence_length, features)
            input_tensor = torch.FloatTensor(features).unsqueeze(0)
            
            with torch.no_grad():
                output = self.lstm_model(input_tensor)
                probabilities = torch.softmax(output, dim=1)
                predicted_class = torch.argmax(probabilities, dim=1).item()
                confidence = float(probabilities[0][predicted_class])
            
            serve_type = self.serve_types[predicted_class]
            return serve_type, confidence
        
        except Exception as e:
            print(f"Serve LSTM classification error: {e}")
            return self._classify_with_heuristics(speed_mps, ball_det)
    
    def _classify_with_heuristics(
        self,
        speed_mps: float,
        ball_det: BallDetection
    ) -> Tuple[str, float]:
        """Fallback heuristic classification"""
        if not ball_det or not ball_det.velocity:
            return 'flat', 0.5
        
        vx, vy = ball_det.velocity
        
        # Flat serve: high speed, straight trajectory
        if speed_mps > 40 and abs(vx) < abs(vy) * 0.5:
            return 'flat', 0.7
        
        # Slice serve: horizontal spin (sidespin)
        if abs(vx) > abs(vy) * 1.5:
            return 'slice', 0.7
        
        # Kick serve: high vertical component, moderate speed
        if speed_mps > 25 and speed_mps < 40 and vy < -30:
            return 'kick', 0.7
        
        # Default to flat
        return 'flat', 0.5
    
    def _determine_placement(self, ball_det: BallDetection) -> Optional[str]:
        """Determine serve placement (wide, T, body)"""
        if not ball_det or not ball_det.position:
            return None
        
        # This would need court coordinates
        # Simplified: use position relative to court
        x, y = ball_det.position
        
        # Would need court calibration to determine zones
        # For now, return None
        return None
    
    def _create_pose_sequence(self, pose_keypoints: np.ndarray) -> np.ndarray:
        """Create pose sequence from keypoints"""
        if pose_keypoints is None:
            return np.zeros((1, 132))
        
        # Flatten keypoints
        keypoints = pose_keypoints.flatten()
        
        # Pad or truncate to 132
        if len(keypoints) < 132:
            keypoints = np.pad(keypoints, (0, 132 - len(keypoints)))
        elif len(keypoints) > 132:
            keypoints = keypoints[:132]
        
        return keypoints.reshape(1, -1)





