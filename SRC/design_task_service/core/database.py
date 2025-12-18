"""
MongoDB database connection and configuration
Re-exported from CEC_DocifyCode_Common for backward compatibility
"""

import os
from ..config import MONGODB_URL, MONGODB_DATABASE

# Set environment variables from config BEFORE importing CEC_DocifyCode_Common
# This ensures the Database instance reads the correct config
os.environ.setdefault("MONGODB_URL", MONGODB_URL)
os.environ.setdefault("MONGODB_DATABASE", MONGODB_DATABASE)

from CEC_DocifyCode_Common.database import Database, get_database

# Re-export for backward compatibility
__all__ = ["Database", "get_database"]
