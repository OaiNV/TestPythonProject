"""
Helper utility functions
"""

import json
import os


def load_config():
    """Load configuration from JSON file"""
    config_path = os.path.join(os.path.dirname(__file__), "..", "config", "config.json")
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"default": "config1111111"}


def process_data(data):
    """Process input data"""
    if isinstance(data, dict):
        return f"Processed {len(data)} items"
    return "No data to process"


def format_output(text):
    """Format output text"""
    return text.upper()
