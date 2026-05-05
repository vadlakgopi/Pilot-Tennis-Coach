"""
ML Pipeline Configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Configuration settings for ML Pipeline service"""
    
    # API Service
    API_URL: str = os.getenv("API_URL", "http://localhost:8000")
    API_VERSION: str = os.getenv("API_VERSION", "v1")
    ML_SERVICE_TOKEN: str = os.getenv("ML_SERVICE_TOKEN", "super-secret-ml-token")
    
    # Video Processing
    VIDEO_STORAGE_PATH: str = os.getenv("VIDEO_STORAGE_PATH", "./data")
    
    # Processing Settings
    PROCESSING_TIMEOUT: int = int(os.getenv("PROCESSING_TIMEOUT", "3600"))  # 1 hour

    # TrackNetV2 weights
    TRACKNET_WEIGHTS_PATH: str = os.getenv(
        "TRACKNET_WEIGHTS_PATH",
        os.path.join(os.path.dirname(__file__), "..", "weights", "tracknet_v2_tennis.pt")
    )
    # Set TRACKNET_WEIGHTS_URL to a direct download URL or Google Drive share URL.
    # Leave empty to skip auto-download (manual placement of weights file is fine too).
    TRACKNET_WEIGHTS_URL: str = os.getenv("TRACKNET_WEIGHTS_URL", "")


settings = Settings()

