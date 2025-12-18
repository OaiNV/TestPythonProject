"""
Service lifecycle management for Design Task Subscriber.

Handles initialization, shutdown, and signal handling for the service.
"""

import asyncio
import logging
import signal
import sys
from typing import Optional

from .core.database import get_database


logger = logging.getLogger(__name__)


def setup_logging():
    """Setup logging configuration for the service"""
    logger.info("[setup_logging] Start")
    try:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
        logger.info("[setup_logging] Success")
    except Exception as e:
        logger.error(f"[setup_logging] Error: {e}")
        raise


async def connect_mongodb():
    """
    Connect to MongoDB and return database instance.

    Returns:
        Database instance
    """
    logger.info("[connect_mongodb] Start")
    try:
        db = await get_database()
        await db.connect()
        logger.info("[connect_mongodb] Success")
        return db
    except Exception as e:
        logger.error(f"[connect_mongodb] Error: {e}")
        raise





def create_shutdown_handler(subscriber, db, poller):
    """
    Create async shutdown handler function.

    Args:
        subscriber: DesignTaskSubscriber instance
        db: Database instance
        poller: TaskPoller instance

    Returns:
        Async shutdown function
    """
    logger.debug("[create_shutdown_handler] Start")

    async def shutdown():
        """Graceful shutdown handler"""
        logger.info("[shutdown] Start")
        
        try:
            if poller is not None:
                await poller.stop()
                logger.info("[shutdown] TaskPoller stopped")
        except Exception as e:
            logger.error(f"[shutdown] Error stopping TaskPoller: {e}")
        
        try:
            subscriber.stop()
            logger.info("[shutdown] Subscriber stopped")
        except Exception as e:
            logger.error(f"[shutdown] Error stopping subscriber: {e}")

        try:
            if db is not None:
                await db.disconnect()
                logger.info("[shutdown] MongoDB disconnected")
        except Exception as e:
            logger.error(f"[shutdown] Error disconnecting MongoDB: {e}")

        logger.info("[shutdown] Success")

    return shutdown


def setup_signal_handlers(loop: asyncio.AbstractEventLoop, subscriber):
    """
    Setup signal handlers for graceful shutdown.

    Args:
        loop: Event loop instance
        subscriber: DesignTaskSubscriber instance
    """
    logger.info("[setup_signal_handlers] Start")
    try:

        def signal_handler(signum, frame):
            """
            Handle system signals (SIGINT, SIGTERM) for graceful shutdown.

            This sets the subscriber's is_running flag to False, which will
            cause the main loop to exit and trigger cleanup in the finally block.
            """
            logger.info(f"[signal_handler] Received signal {signum}")
            # Stop the subscriber loop gracefully by setting flag to False
            subscriber.is_running = False
            logger.info("[signal_handler] Shutdown initiated")

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        logger.info("[setup_signal_handlers] Success")
    except Exception as e:
        logger.error(f"[setup_signal_handlers] Error: {e}")
        raise


async def run_subscriber_loop(subscriber):
    """
    Run subscriber and keep service running.

    Args:
        subscriber: DesignTaskSubscriber instance

    Returns:
        bool: True if successful, False otherwise
    """
    logger.info("[run_subscriber_loop] Start")
    try:
        if not subscriber.start():
            logger.error("[run_subscriber_loop] Failed to start subscriber")
            return False

        logger.info(
            "[run_subscriber_loop] Subscriber is running. Press Ctrl+C to stop."
        )

        # Keep the service running by sleeping asynchronously
        # This loop allows the event loop to process other async tasks
        # while waiting for messages from MQTT broker
        while subscriber.is_running:
            await asyncio.sleep(1)

        logger.info("[run_subscriber_loop] Success")
        return True
    except KeyboardInterrupt:
        logger.info("[run_subscriber_loop] Received interrupt signal")
        return True
    except Exception as e:
        logger.error(f"[run_subscriber_loop] Error: {e}")
        return False


async def async_main(loop: asyncio.AbstractEventLoop, subscriber_class):
    """
    Async main function that runs in the event loop.

    Args:
        loop: Event loop instance
        subscriber_class: DesignTaskSubscriber class

    Returns:
        bool: True if successful
    """
    logger.info("[async_main] Start")
    db = None
    poller = None
    subscriber = None
    shutdown_handler = None

    try:
        # Connect to MongoDB first
        db = await connect_mongodb()
        
        # Initialize and start TaskPoller
        from .core.task_poller import get_task_poller
        poller = await get_task_poller()
        poller_task = asyncio.create_task(poller.start())
        
        # Create subscriber
        subscriber = subscriber_class()
        shutdown_handler = create_shutdown_handler(subscriber, db, poller)

        # Setup signal handlers with subscriber reference
        setup_signal_handlers(loop, subscriber)

        if not await run_subscriber_loop(subscriber):
            logger.error("[async_main] Failed to start subscriber service")
            return False

        logger.info("[async_main] Subscriber loop completed")

    except Exception as e:
        logger.error(f"[async_main] Error: {e}", exc_info=True)
    finally:
        # Always cleanup resources regardless of success or failure
        # This ensures MongoDB and MQTT connections are properly closed
        if shutdown_handler:
            try:
                logger.info("[async_main] Starting cleanup")
                await shutdown_handler()
                logger.info("[async_main] Cleanup completed")
            except Exception as e:
                logger.error(f"[async_main] Error during cleanup: {e}")


def run_service(subscriber_class, set_global_loop_callback=None):
    """
    Main entry point - creates event loop once and runs the service.

    Args:
        subscriber_class: DesignTaskSubscriber class
        set_global_loop_callback: Optional callback to set global loop reference
    """
    logger.info("[run_service] Start")

    try:
        setup_logging()

        # Create event loop once for the entire service lifetime
        # This event loop will be reused for all async operations
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Set global reference immediately so handlers can access it
        # This allows message handlers to submit async tasks to the event loop
        if set_global_loop_callback:
            set_global_loop_callback(loop)

        logger.info("[run_service] Event loop created")

        try:
            # Run the async main function in the event loop
            loop.run_until_complete(async_main(loop, subscriber_class))

        except KeyboardInterrupt:
            logger.info("[run_service] Received keyboard interrupt")
        finally:
            # Clean up any pending async tasks before closing the event loop
            # This ensures graceful shutdown without leaving tasks hanging
            try:
                pending = asyncio.all_tasks(loop)
                if pending:
                    logger.info(
                        f"[run_service] Cancelling {len(pending)} pending tasks"
                    )
                    for task in pending:
                        task.cancel()

                    # Wait for all tasks to be cancelled gracefully
                    # return_exceptions=True prevents errors from stopping cleanup
                    loop.run_until_complete(
                        asyncio.gather(*pending, return_exceptions=True)
                    )
            except Exception as e:
                logger.error(f"[run_service] Error cancelling tasks: {e}")

            # Close the event loop to free resources
            loop.close()
            logger.info("[run_service] Event loop closed")

        logger.info("[run_service] Success")

    except Exception as e:
        logger.error(f"[run_service] Error: {e}", exc_info=True)
        sys.exit(1)
