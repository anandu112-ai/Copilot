from fastapi import APIRouter, HTTPException
from loguru import logger

from models.schemas import ExtractionRequest, ExtractionResult
from processors.pdf_pipeline import PDFPipeline

router = APIRouter()


@router.post("", response_model=ExtractionResult)
async def extract_pdf(request: ExtractionRequest) -> ExtractionResult:
    """
    Main PDF extraction endpoint.
    Validates, inspects, and extracts data from a PDF file.
    """
    logger.info(f"Extraction request: {request.file_path} | type={request.document_type}")

    try:
        pipeline = PDFPipeline(
            file_path=request.file_path,
            document_type=request.document_type,
            ocr_enabled=request.ocr_enabled,
        )
        result = await pipeline.run()
        logger.info(
            f"Extraction complete: confidence={result.confidence}, "
            f"line_items={len(result.line_items)}, warnings={len(result.warnings)}"
        )
        return result
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
    except PermissionError as e:
        logger.error(f"Permission error: {e}")
        raise HTTPException(status_code=403, detail="Cannot read file — permission denied")
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
