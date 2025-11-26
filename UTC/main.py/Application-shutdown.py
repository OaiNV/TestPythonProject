"""
Unit test code for Application.shutdown method
"""
import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "SRC"))

from main import Application


class TestApplicationShutdown(unittest.TestCase):
    """Test cases for Application.shutdown method"""

    def test_shutdown(self):
        """Test Application shutdown method"""
        app = Application()
        app.initialize()
        app.shutdown()
        self.assertIsNone(app.config)
        self.assertIsNone(app.settings)


if __name__ == "__main__":
    unittest.main()

