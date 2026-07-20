"""
CA Copilot — Python Processing Service
Main entry point for the FastAPI application.
"""
import argparse
import sys
import uvicorn
from loguru import logger

from api.app import create_app

def parse_args():
    parser = argparse.ArgumentParser(description="CA Copilot Processing Service")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--log-level", type=str, default="info", help="Log level")
    return parser.parse_args()


def setup_logging(log_level: str):
    logger.remove()
    logger.add(
        sys.stdout,
        level=log_level.upper(),
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> - {message}",
    )


def main():
    args = parse_args()
    setup_logging(args.log_level)
    logger.info(f"Starting CA Copilot Processing Service on {args.host}:{args.port}")

    app = create_app()

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level=args.log_level.lower(),
        access_log=False,
    )


if __name__ == "__main__":
    main()
