"""
PDF Validation Module.
Checks the file before any expensive processing.
"""
import os
from pathlib import Path
from loguru import logger


MAX_FILE_SIZE_MB = 100


class PDFValidationError(ValueError):
    """Raised when a PDF file fails validation."""
    pass


def validate_pdf(file_path: str) -> None:
    """
    Validate a PDF file before processing.
    Raises PDFValidationError with a user-friendly message on failure.
    """
    path = Path(file_path)

    # Check existence
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Check extension
    if path.suffix.lower() != ".pdf":
        raise PDFValidationError(
            f"File does not have a .pdf extension: {path.name}"
        )

    # Check file size
    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise PDFValidationError(
            f"File is too large ({size_mb:.1f}MB). Maximum allowed size is {MAX_FILE_SIZE_MB}MB."
        )

    if path.stat().st_size == 0:
        raise PDFValidationError("File is empty.")

    # Check PDF signature (first 4 bytes should be %PDF)
    with open(file_path, "rb") as f:
        header = f.read(5)
        if not header.startswith(b"%PDF"):
            raise PDFValidationError(
                "File does not appear to be a valid PDF (invalid file signature)."
            )

    logger.debug(f"PDF validated: {path.name} ({size_mb:.2f}MB)")


def inspect_pdf(file_path: str) -> dict:
    """
    Inspect a PDF to determine extraction strategy.
    Returns inspection metadata.
    """
    import fitz  # PyMuPDF

    result = {
        "page_count": 0,
        "is_text_based": False,
        "is_scanned": False,
        "has_tables": False,
        "is_encrypted": False,
        "file_size_mb": 0.0,
    }

    result["file_size_mb"] = round(os.path.getsize(file_path) / (1024 * 1024), 2)

    try:
        doc = fitz.open(file_path)
    except Exception as e:
        raise PDFValidationError(f"Cannot open PDF — it may be corrupted: {e}")

    if doc.is_encrypted:
        doc.close()
        raise PDFValidationError(
            "PDF is encrypted/password-protected. Please remove the password before processing."
        )

    result["page_count"] = len(doc)
    result["is_encrypted"] = False

    if result["page_count"] == 0:
        doc.close()
        raise PDFValidationError("PDF has no pages.")

    # Sample first few pages for text
    text_chars = 0
    for page_num in range(min(3, result["page_count"])):
        page = doc[page_num]
        text = page.get_text("text")
        text_chars += len(text.strip())

    result["is_text_based"] = text_chars > 50
    result["is_scanned"] = not result["is_text_based"]

    doc.close()

    logger.debug(
        f"Inspection: pages={result['page_count']}, "
        f"text_based={result['is_text_based']}, scanned={result['is_scanned']}"
    )

    return result
