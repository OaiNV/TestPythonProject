"""
Main entry point for the application
"""

import json
from utils.helper import load_config, process_data
from config.settings import get_settings


class Application:
    """Main application class"""

    def __init__(self):
        """Initialize application"""
        self.config = None
        self.settings = None

    def initialize(self):
        """Initialize application with config and settings"""
        self.config = load_config()
        self.settings = get_settings()
        return self.config, self.settings

    def run(self):
        """Run the application"""
        print("Starting application...")
        self.initialize()

        # Process data
        result = process_data(self.config)

        print(f"Processing complete: {result}")
        print(f"Settings loaded: {self.settings}")
        return result

    def shutdown(self):
        """Shutdown the application"""
        print("Shutting down application...")
        self.config = None
        self.settings = None


def main():
    """Main function"""
    app = Application()
    app.run()


def start_app():
    """Start the application"""
    app = Application()
    return app.run()


if __name__ == "__main__":
    main()
