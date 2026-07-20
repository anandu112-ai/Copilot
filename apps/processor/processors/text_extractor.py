"""
Text extraction module.
Uses PyMuPDF for text-based PDFs and pdfplumber for table-heavy documents.
"""
from typing import List, Tuple
from loguru import logger


def extract_text_pymupdf(file_path: str) -> Tuple[str, List[List[List[str]]]]:
    """
    Extract text and simple table data using PyMuPDF (fitz).
    Returns (full_text, raw_tables)
    """
    import fitz

    full_text = []
    tables = []

    doc = fitz.open(file_path)
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        full_text.append(text)

    doc.close()
    return "\n".join(full_text), tables


def extract_tables_pdfplumber(file_path: str) -> Tuple[str, List[List[List[str]]]]:
    """
    Extract text and tables using pdfplumber (better for tabular data).
    Returns (full_text, raw_tables)
    """
    import pdfplumber

    full_text = []
    all_tables = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            # Text
            text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
            full_text.append(text)

            # Tables
            tables = page.extract_tables(
                table_settings={
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                    "snap_tolerance": 5,
                    "join_tolerance": 3,
                    "edge_min_length": 3,
                    "min_words_vertical": 1,
                    "min_words_horizontal": 1,
                }
            )
            for table in tables:
                if table:
                    # Clean None values
                    cleaned = [
                        [str(cell).strip() if cell is not None else "" for cell in row]
                        for row in table
                    ]
                    all_tables.append(cleaned)

    logger.debug(f"pdfplumber extracted {len(all_tables)} table(s)")
    return "\n".join(full_text), all_tables


def extract_with_ocr(file_path: str, language: str = "eng") -> Tuple[str, List[List[List[str]]]]:
    """
    OCR fallback for scanned PDFs.
    Renders each page as an image and runs Tesseract.
    """
    import fitz
    from PIL import Image
    import pytesseract
    import io

    logger.info(f"Running OCR on: {file_path} | lang={language}")

    full_text = []
    doc = fitz.open(file_path)

    for page_num in range(len(doc)):
        page = doc[page_num]
        # Render at 2x resolution for better OCR accuracy
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        img_bytes = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_bytes))

        custom_config = f"--oem 3 --psm 6 -l {language}"
        text = pytesseract.image_to_string(image, config=custom_config)
        full_text.append(text)

        logger.debug(f"OCR page {page_num + 1}: {len(text)} chars extracted")

    doc.close()
    return "\n".join(full_text), []
