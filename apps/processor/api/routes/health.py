"""
Health check endpoint for the CA Copilot processing service.
Used by Electron on startup to confirm the service is ready.
"""
import time
import sys
import platform
from pathlib import Path
from fastapi import APIRouter
from loguru import logger

router = APIRouter(tags=["Health"])

_start_time = time.time()


@router.get("/health")
def health_check():
    """
    Detailed health check.
    Returns service status, uptime, versions, database connectivity, disk space.
    """
    uptime = round(time.time() - _start_time, 1)
    db_ok = False
    db_error = None
    record_counts: dict = {}

    try:
        from database.db import get_db_connection
        conn = get_db_connection()
        conn.execute("SELECT 1")
        # Collect key table counts for quick diagnostics
        for table in ('clients', 'bank_transactions', 'audit_findings', 'audit_logs'):
            try:
                row = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
                record_counts[table] = row[0] if row else 0
            except Exception:
                pass
        conn.close()
        db_ok = True
    except Exception as e:
        db_error = str(e)
        logger.warning(f"Health check DB probe failed: {e}")

    # Disk space check (upload temp dir)
    disk_info = {}
    try:
        import shutil
        tmp_dir = Path(".").resolve()
        total, used, free = shutil.disk_usage(tmp_dir)
        disk_info = {
            "total_gb": round(total / 1e9, 1),
            "used_gb": round(used / 1e9, 1),
            "free_gb": round(free / 1e9, 1),
            "usage_pct": round(used / total * 100, 1),
        }
    except Exception:
        pass

    # Memory usage
    memory_info = {}
    try:
        import psutil
        proc = psutil.Process()
        mem = proc.memory_info()
        memory_info = {
            "rss_mb": round(mem.rss / 1e6, 1),
            "vms_mb": round(mem.vms / 1e6, 1),
        }
    except Exception:
        pass  # psutil optional

    status = "ok" if db_ok else "degraded"
    return {
        "status": status,
        "service": "ca-copilot-processor",
        "version": "1.0.0",
        "uptime_seconds": uptime,
        "python_version": sys.version.split()[0],
        "platform": platform.system(),
        "database": {
            "status": "connected" if db_ok else "error",
            "error": db_error,
            "record_counts": record_counts,
        },
        "disk": disk_info,
        "memory": memory_info,
    }


@router.get("/health/ping")
def ping():
    """Minimal liveness probe — returns instantly."""
    return {"pong": True, "ts": time.time()}
