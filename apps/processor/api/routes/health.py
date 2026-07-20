"""
Health check endpoint for the CA Copilot processing service.
Used by Electron on startup to confirm the service is ready.
"""
import time
from fastapi import APIRouter
from loguru import logger

router = APIRouter(tags=["Health"])

_start_time = time.time()


@router.get("/health")
def health_check():
    """
    Detailed health check.
    Returns service status, uptime, and database connectivity.
    """
    uptime = round(time.time() - _start_time, 1)
    db_ok = False
    try:
        from database.db import get_db_connection
        conn = get_db_connection()
        conn.execute("SELECT 1")
        conn.close()
        db_ok = True
    except Exception as e:
        logger.warning(f"Health check DB probe failed: {e}")

    return {
        "status": "ok" if db_ok else "degraded",
        "service": "ca-copilot-processor",
        "version": "1.0.0",
        "uptime_seconds": uptime,
        "database": "connected" if db_ok else "error",
    }
