"""
Logging utility for ML Pipeline with datetime timestamps
"""
from datetime import datetime
import sys


def log(message: str, level: str = "INFO"):
    """
    Log a message with timestamp
    
    Args:
        message: Message to log
        level: Log level (INFO, WARNING, ERROR, DEBUG)
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_message = f"[{timestamp}] [{level}] {message}"
    print(formatted_message, file=sys.stdout, flush=True)


def log_info(message: str):
    """Log an info message"""
    log(message, "INFO")


def log_warning(message: str):
    """Log a warning message"""
    log(message, "WARNING")


def log_error(message: str):
    """Log an error message"""
    log(message, "ERROR")


def log_debug(message: str):
    """Log a debug message"""
    log(message, "DEBUG")




