"""
FastAPI application factory.
"""
import time
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from api.routes import extraction, excel, health, reconciliation, audit_intelligence, copilot, integrations, firm


def create_app() -> FastAPI:
    app = FastAPI(
        title="CA Copilot Processing Service",
        description="Local PDF processing and Excel generation service",
        version="1.0.0",
        docs_url="/docs",
    )

    # Only allow localhost requests
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ],
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS", "DELETE", "PUT"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # ── Request timing & logging middleware ─────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            elapsed = (time.perf_counter() - start) * 1000
            logger.error(
                f"Unhandled error | {request.method} {request.url.path} "
                f"| {elapsed:.1f}ms | {exc}"
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error. Check server logs."},
            )
        elapsed = (time.perf_counter() - start) * 1000
        if response.status_code >= 400:
            logger.warning(
                f"{request.method} {request.url.path} "
                f"→ {response.status_code} | {elapsed:.1f}ms"
            )
        else:
            logger.debug(
                f"{request.method} {request.url.path} "
                f"→ {response.status_code} | {elapsed:.1f}ms"
            )
        return response

    # ── Global exception handlers ───────────────────────────────────────────
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        logger.warning(f"Validation error on {request.url.path}: {exc}")
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(FileNotFoundError)
    async def file_not_found_handler(request: Request, exc: FileNotFoundError):
        logger.warning(f"File not found on {request.url.path}: {exc}")
        return JSONResponse(status_code=404, content={"detail": f"File not found: {exc}"})

    @app.exception_handler(PermissionError)
    async def permission_error_handler(request: Request, exc: PermissionError):
        logger.error(f"Permission denied on {request.url.path}: {exc}")
        return JSONResponse(status_code=403, content={"detail": "Permission denied."})

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unhandled exception on {request.url.path}: {exc}\n"
            f"{traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected error occurred. Please try again."},
        )

    # ── Routers ─────────────────────────────────────────────────────────────
    app.include_router(health.router)
    app.include_router(extraction.router, prefix="/extract")
    app.include_router(excel.router, prefix="/generate-excel")
    app.include_router(reconciliation.router)
    app.include_router(audit_intelligence.router)
    app.include_router(copilot.router)
    app.include_router(integrations.router)
    app.include_router(firm.router)

    return app
