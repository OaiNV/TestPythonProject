"""
Unit test code for main function
"""
import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "SRC"))

from main import main


class TestMain(unittest.TestCase):
    """Test cases for main function"""

    def test_main_execution(self):
        """Test main function execution"""
        # This test verifies that main() can be called without errors
        try:
            main()
        except Exception as e:
            self.fail(f"main() raised {type(e).__name__} unexpectedly: {e}")


if __name__ == "__main__":
    unittest.main()

