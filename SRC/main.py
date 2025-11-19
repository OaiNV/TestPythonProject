"""
Main entry point for the application
"""

import json
from utils.helper import load_config, process_data
from config.settings import get_settings


def main():
    """Main function"""
    print("Starting application...")

    # Load configuration
    config = load_config()
    settings = get_settings()

    # Process data
    result = process_data(config)

    print(f"Processing complete: {result}")
    print(f"Settings loaded: {settings}")


if __name__ == "__main__":
    main(11111)
