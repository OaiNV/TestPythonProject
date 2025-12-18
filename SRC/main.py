"""
Main entry point for the new application
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env from current directory
load_dotenv(".env", override=True)

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

from app.core.database import init_database
from app.core.logging import setup_logging
from app.core.gateway import APIGateway, RouteManager
from app.api.router import APIRouterManager, main_router
from app.api.page_routes import page_router
from app.core.config import get_config
from config_gateway import Config

# Initialize logging
logger = setup_logging()

# Get configuration
config = get_config()


# Lifespan handler replacing deprecated on_event startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("[lifespan] Starting application initialization")
    try:
        await init_database()
        logger.info("[lifespan] Database initialized successfully")
    except Exception as e:
        logger.error(f"[lifespan] Error initializing database: {e}")
        raise

    yield

    # Shutdown (add cleanup here if needed)


# Create FastAPI app with lifespan
app = FastAPI(
    title="New App API Gateway",
    description="New application with MongoDB and API Gateway",
    version="1.0.0",
    lifespan=lifespan,
)

# Initialize API Gateway
gateway = APIGateway(app)
route_manager = RouteManager(gateway)
api_router_manager = APIRouterManager(route_manager)

# Include routers
app.include_router(main_router, prefix="/api", tags=["api"])
app.include_router(page_router, tags=["pages"])

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


if __name__ == "__main__":
    import uvicorn

    logger.info("[main] Starting server on localhost:8000")
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
