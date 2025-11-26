"""
Unit test code for Application.run method
"""
import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "SRC"))

from main import Application


class TestApplicationRun(unittest.TestCase):
    """Test cases for Application.run method"""

    def test_run(self):
        """Test Application run method"""
        app = Application()
        result = app.run()
        self.assertIsNotNone(result)


if __name__ == "__main__":
    unittest.main()

