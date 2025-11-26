"""
Unit test code for start_app function
"""
import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "SRC"))

from main import start_app


class TestStartApp(unittest.TestCase):
    """Test cases for start_app function"""

    def test_start_app(self):
        """Test start_app function"""
        result = start_app()
        self.assertIsNotNone(result)


if __name__ == "__main__":
    unittest.main()

