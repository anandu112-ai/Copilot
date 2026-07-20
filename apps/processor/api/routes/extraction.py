"""
CA Copilot — Complete API Routes
Endpoints:
  POST   /extract          — Process a single document
  POST   /extract/upload   — Upload file + process
  POST   /batch            — Submit batch job
  GET    /batch/{job_id}   — Get batch status
  POST   /excel            — Generate Excel from ExtractionResult
  GET    /health           — Health check
"""
import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from loguru import logger

from models.schemas import (
    ExtractionRequest, ExtractionResult, ExcelGenerationRequest,
    ExcelGenerationResult, BatchExtractionRequest, BatchJobStatus
)
from processors.document_pipeline import DocumentPipeline
from exporters.excel_exporter import ExcelExporter
from processors.batch_processor import submit_batch_job, get_job_status

router = APIRouter()

UPLOAD_TMP_DIR = Path(tempfile.gettempdir()) / "ca_copilot_uploads"
UPLOAD_TMP_DIR.mkdir(parents=True, exist_ok=True)


# ── Single Document Extraction ──────────────────────────────────────────────

@router.post("/extract", response_model=ExtractionResult)
async def extract_document(request: ExtractionRequest) -> ExtractionResult:
    """
    Process any supported document type from a local file path.
    Automatically detects document type if not specified.
    """
    logger.info(f"Extract request: {request.file_path}")
    if not Path(request.file_path).exists():
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

    try:
        pipeline = DocumentPipeline(request)
        result = await pipeline.run()

        # Auto-generate Excel if output_dir provided
        if request.output_dir:
            out_path = str(Path(request.output_dir) / result.output_filename)
            exporter = ExcelExporter(result, out_path)
            await exporter.generate()
            logger.info(f"Excel saved: {out_path}")

        return result

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail="Cannot read file — permission denied")
    except Exception as e:
        logger.exception(f"Extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@router.post("/extract/upload", response_model=ExtractionResult)
async def extract_uploaded_file(
    file: UploadFile = File(...),
    output_dir: Optional[str] = Form(default=None),
    ocr_enabled: bool = Form(default=True),
    preprocess_image: bool = Form(default=True),
):
    """
    Upload a file and immediately process it.
    Supports PDF, JPG, PNG, TIFF, HEIC, XLSX, CSV, DOCX, TXT, ZIP.
    """
    # Save uploaded file to temp location
    tmp_path = UPLOAD_TMP_DIR / (file.filename or "upload.pdf")
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    logger.info(f"File uploaded: {tmp_path} ({tmp_path.stat().st_size} bytes)")

    try:
        request = ExtractionRequest(
            file_path=str(tmp_path),
            ocr_enabled=ocr_enabled,
            preprocess_image=preprocess_image,
            output_dir=output_dir,
        )
        pipeline = DocumentPipeline(request)
        result = await pipeline.run()

        if output_dir:
            out_path = str(Path(output_dir) / result.output_filename)
            exporter = ExcelExporter(result, out_path)
            await exporter.generate()

        return result

    finally:
        # Clean up temp file
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass


# ── Excel Generation ─────────────────────────────────────────────────────────

@router.post("/excel", response_model=ExcelGenerationResult)
async def generate_excel(request: ExcelGenerationRequest) -> ExcelGenerationResult:
    """Generate a formatted Excel workbook from an ExtractionResult."""
    try:
        exporter = ExcelExporter(request.result, request.output_path)
        path = await exporter.generate()
        return ExcelGenerationResult(
            success=True,
            path=path,
            filename=Path(path).name,
        )
    except Exception as e:
        logger.exception(f"Excel generation error: {e}")
        return ExcelGenerationResult(success=False, path="", error=str(e))


# ── Batch Processing ──────────────────────────────────────────────────────────

@router.post("/batch", response_model=dict)
async def submit_batch(request: BatchExtractionRequest) -> dict:
    """Submit a batch of files for processing. Returns job_id."""
    if not request.file_paths:
        raise HTTPException(status_code=400, detail="No files provided")

    # Validate all files exist
    missing = [f for f in request.file_paths if not Path(f).exists()]
    if missing:
        raise HTTPException(status_code=404, detail=f"Files not found: {missing[:5]}")

    job_id = await submit_batch_job(request)
    return {"job_id": job_id, "total_files": len(request.file_paths), "status": "queued"}


@router.get("/batch/{job_id}", response_model=BatchJobStatus)
async def get_batch_status(job_id: str) -> BatchJobStatus:
    """Get the current status and progress of a batch job."""
    status = await get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return status


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health_check() -> dict:
    """Service health check."""
    import sys
    return {
        "status": "ok",
        "service": "CA Copilot Document Processor",
        "python": sys.version.split()[0],
    }
