from fastapi import APIRouter, HTTPException
from loguru import logger

from models.schemas import ExcelGenerationRequest, ExcelGenerationResult
from exporters.excel_exporter import ExcelExporter

router = APIRouter()


@router.post("", response_model=ExcelGenerationResult)
async def generate_excel(request: ExcelGenerationRequest) -> ExcelGenerationResult:
    """
    Generate an Excel workbook from extracted data.
    """
    logger.info(f"Excel generation request: {request.output_path}")

    try:
        exporter = ExcelExporter(
            result=request.result,
            output_path=request.output_path,
            document_type=request.document_type,
        )
        output_path = await exporter.generate()
        logger.info(f"Excel generated: {output_path}")
        return ExcelGenerationResult(success=True, path=output_path)
    except PermissionError:
        logger.error(f"Cannot write to: {request.output_path}")
        raise HTTPException(status_code=403, detail="Cannot write to the specified path — permission denied")
    except Exception as e:
        logger.exception(f"Excel generation error: {e}")
        return ExcelGenerationResult(success=False, path="", error=str(e))
