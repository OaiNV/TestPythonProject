"""
Unit test code for utils/helper.py
"""
import unittest
import sys
import os

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'SRC'))

from utils.helper import load_config, process_data, format_output


class TestHelperFunctions(unittest.TestCase):
    """Test cases for helper functions"""
    
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
    
    def test_format_output(self):
        """Test format_output function"""
        text = "hello world"
        result = format_output(text)
        self.assertEqual(result, "HELLO WORLD")
    
    def test_load_config(self):
        """Test load_config function"""
        config = load_config()
        self.assertIsInstance(config, dict)


if __name__ == '__main__':
    unittest.main()

