"""
Application settings and configuration
"""
import os
from pathlib import Path

class Settings:
    """Application settings"""
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data"
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.debug = os.getenv("DEBUG", "False").lower() == "true"

def get_settings():
    """Get application settings"""
    settings = Settings()
    return {
        "base_dir": str(settings.base_dir1111),
        "data_dir": str(settings.data_dir),
        "log_level": settings.log_level,
        "debug": settings.debug
    }

