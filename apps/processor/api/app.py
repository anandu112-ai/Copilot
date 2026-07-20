"""
FastAPI application factory.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import extraction, excel, health, reconciliation, audit_intelligence


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
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    # Routers
    app.include_router(health.router)
    app.include_router(extraction.router, prefix="/extract")
    app.include_router(excel.router, prefix="/generate-excel")
    app.include_router(reconciliation.router)
    app.include_router(audit_intelligence.router)

    return app

