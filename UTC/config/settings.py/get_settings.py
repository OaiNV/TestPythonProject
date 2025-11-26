"""
Unit test code for get_settings function
"""

import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "SRC"))

from config.settings import get_settings


class TestGetSettings(unittest.TestCase):
    """Test cases for get_settings function"""

    def test_get_settings(self):
        """Test get_settings returns dictionary"""
        settings = get_settings()
        self.assertIsInstance(settings, dict)
        self.assertIn("base_dir", settings)
        self.assertIn("log_level", settings)


if __name__ == "__main__":
    unittest.main()
