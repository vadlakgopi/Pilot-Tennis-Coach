"""
Court Detection and Calibration Module
Detects tennis court lines and creates coordinate mapping
"""
import cv2
import numpy as np
from typing import Dict, Optional, Tuple
from dataclasses import dataclass


@dataclass
class CourtCalibration:
    """Court calibration data"""
    homography_matrix: np.ndarray
    court_corners: np.ndarray  # 4 corners of the court
    pixel_to_meter_ratio: float
    court_center: Tuple[float, float]


class CourtDetector:
    def __init__(self):
        self.calibration: Optional[CourtCalibration] = None
    
    async def detect_and_calibrate(self, frame: np.ndarray) -> CourtCalibration:
        """
        Detect court lines and create calibration
        
        Args:
            frame: Input video frame
            
        Returns:
            CourtCalibration object with transformation matrices
        """
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Edge detection
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Hough line transform to detect court lines
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi/180,
            threshold=100,
            minLineLength=100,
            maxLineGap=10
        )
        
        # Filter and classify lines (baseline, service line, center line, etc.)
        court_lines = self._classify_court_lines(lines, frame.shape)
        
        # Find court corners
        corners = self._find_court_corners(court_lines, frame.shape)
        
        # Calculate homography matrix for perspective transformation
        homography = self._calculate_homography(corners)
        
        # Calculate pixel-to-meter ratio
        pixel_to_meter = self._calculate_scale(corners)
        
        # Calculate court center
        court_center = self._calculate_center(corners)
        
        self.calibration = CourtCalibration(
            homography_matrix=homography,
            court_corners=corners,
            pixel_to_meter_ratio=pixel_to_meter,
            court_center=court_center
        )
        
        return self.calibration
    
    def _classify_court_lines(self, lines, image_shape) -> Dict[str, list]:
        """Classify detected lines into court line types"""
        # Simplified implementation
        # In production, use more sophisticated line classification
        return {
            "baselines": [],
            "service_lines": [],
            "center_line": [],
            "sidelines": []
        }
    
    def _find_court_corners(self, lines: Dict, image_shape: Tuple) -> np.ndarray:
        """Find the four corners of the tennis court"""
        # Simplified - find intersection points of key lines
        # In production, use more robust corner detection
        height, width = image_shape[:2]
        return np.array([
            [0, 0],  # Top-left
            [width, 0],  # Top-right
            [width, height],  # Bottom-right
            [0, height]  # Bottom-left
        ], dtype=np.float32)
    
    def _calculate_homography(self, corners: np.ndarray) -> np.ndarray:
        """Calculate homography matrix for perspective transformation"""
        # Standard tennis court dimensions: 23.77m x 10.97m (singles)
        court_width = 10.97  # meters
        court_length = 23.77  # meters
        
        # Destination points (bird's eye view)
        dst = np.array([
            [0, 0],
            [court_width, 0],
            [court_width, court_length],
            [0, court_length]
        ], dtype=np.float32)
        
        # Calculate homography
        homography, _ = cv2.findHomography(corners, dst)
        return homography
    
    def _calculate_scale(self, corners: np.ndarray) -> float:
        """Calculate pixel-to-meter conversion ratio"""
        # Estimate based on court dimensions
        # In production, use known court dimensions
        return 0.05  # meters per pixel (example)
    
    def _calculate_center(self, corners: np.ndarray) -> Tuple[float, float]:
        """Calculate court center point"""
        center = np.mean(corners, axis=0)
        return (float(center[0]), float(center[1]))
    
    def pixel_to_court_coords(self, pixel_x: float, pixel_y: float) -> Tuple[float, float]:
        """Convert pixel coordinates to court coordinates"""
        if not self.calibration:
            raise ValueError("Court not calibrated")
        
        point = np.array([[[pixel_x, pixel_y]]], dtype=np.float32)
        transformed = cv2.perspectiveTransform(point, self.calibration.homography_matrix)
        return (float(transformed[0][0][0]), float(transformed[0][0][1]))






