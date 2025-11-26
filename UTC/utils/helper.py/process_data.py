"""
Unit test code for process_data function
"""
import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "SRC"))

from utils.helper import process_data


class TestProcessData(unittest.TestCase):
    """Test cases for process_data function"""

    def test_process_data_dict(self):
        """Test process_data with dictionary input"""
        data = {"key1": "value1", "key2": "value2"}
        result = process_data(data)
        self.assertIn("Processed", result)
        self.assertIn("2", result)

    def test_process_data_empty(self):
        """Test process_data with empty input"""
        result = process_data(None)
        self.assertEqual(result, "No data to process")


if __name__ == "__main__":
    unittest.main()

