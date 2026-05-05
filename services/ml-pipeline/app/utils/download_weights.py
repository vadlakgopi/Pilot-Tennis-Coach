"""
Utility for auto-downloading ML model weights.
"""
import logging
from pathlib import Path

log = logging.getLogger(__name__)


def ensure_tracknet_weights(weights_path: str, download_url: str) -> bool:
    """
    Ensure TrackNetV2 weights exist at weights_path.
    If missing and download_url is set, attempt to download.
    Returns True if weights are available.
    """
    path = Path(weights_path)
    if path.exists() and path.stat().st_size > 0:
        return True

    if not download_url:
        log.warning(
            "TrackNetV2 weights not found at %s and TRACKNET_WEIGHTS_URL is not set. "
            "Ball tracking will fall back to YOLO+color.",
            path,
        )
        return False

    path.parent.mkdir(parents=True, exist_ok=True)
    log.info("Downloading TrackNetV2 weights from %s → %s", download_url, path)

    # Google Drive links — use gdown if available
    if "drive.google.com" in download_url or "docs.google.com" in download_url:
        try:
            import gdown
            gdown.download(download_url, str(path), quiet=False, fuzzy=True)
            if path.exists() and path.stat().st_size > 0:
                log.info("TrackNetV2 weights downloaded via gdown")
                return True
        except Exception as exc:
            log.warning("gdown failed (%s); falling back to requests", exc)

    # Direct HTTP download
    try:
        import requests
        with requests.get(download_url, stream=True, timeout=120) as resp:
            resp.raise_for_status()
            with open(path, "wb") as fh:
                for chunk in resp.iter_content(chunk_size=8192):
                    fh.write(chunk)
        if path.exists() and path.stat().st_size > 0:
            log.info("TrackNetV2 weights downloaded via requests")
            return True
    except Exception as exc:
        log.error("Failed to download TrackNetV2 weights: %s", exc)

    return False
