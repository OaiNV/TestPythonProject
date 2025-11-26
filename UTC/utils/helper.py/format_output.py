"""
Unit test code for format_output function
"""
import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "SRC"))

from utils.helper import format_output


class TestFormatOutput(unittest.TestCase):
    """Test cases for format_output function"""

    def test_format_output(self):
        """Test format_output function"""
        text = "hello world"
        result = format_output(text)
        self.assertEqual(result, "HELLO WORLD")


if __name__ == "__main__":
    unittest.main()

