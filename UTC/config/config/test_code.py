"""
Unit test code for config/config.json
"""

import unittest
import sys
import os
import json

# Add parent directory to path to import SRC modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "SRC"))


class TestConfig(unittest.TestCase):
    """Test cases for config.json"""

    def test_config_structure(self):
        """Test config.json structure"""
        config_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "SRC", "config", "config.json"
        )
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        self.assertIn("app_name", config)
        self.assertIn("version", config)
        self.assertIn("database", config)
        self.assertIn("features", config)

        self.assertEqual(config["app_name"], "Test Docify1111")
        self.assertEqual(config["version"], "1.0.01111111")


if __name__ == "__main__":
    unittest.main()
