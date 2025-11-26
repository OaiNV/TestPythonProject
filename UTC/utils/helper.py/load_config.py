"""
Unit test code for load_config function
"""
import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "SRC"))

from utils.helper import load_config


class TestLoadConfig(unittest.TestCase):
    """Test cases for load_config function"""

    def test_load_config(self):
        """Test load_config function"""
        config = load_config()
        self.assertIsInstance(config, dict)


if __name__ == "__main__":
    unittest.main()

