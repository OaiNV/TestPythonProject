"""
Unit test code for Application.initialize method
"""
import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "SRC"))

from main import Application


class TestApplicationInitialize(unittest.TestCase):
    """Test cases for Application.initialize method"""

    def test_initialize(self):
        """Test Application initialization"""
        app = Application()
        config, settings = app.initialize()
        self.assertIsNotNone(config)
        self.assertIsNotNone(settings)
        self.assertIsNotNone(app.config)
        self.assertIsNotNone(app.settings)


if __name__ == "__main__":
    unittest.main()

