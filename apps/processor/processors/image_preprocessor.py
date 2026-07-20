"""
Image Preprocessor — CA Copilot
Handles orientation detection, deskewing, noise removal, contrast enhancement,
and separation of multi-invoice scans using OpenCV + Pillow.
"""
import io
import math
from typing import List, Tuple
from pathlib import Path
from loguru import logger


def _try_import_cv2():
    try:
        import cv2
        import numpy as np
        return cv2, np
    except ImportError:
        return None, None


def preprocess_image_bytes(image_bytes: bytes, filename: str = "image.png") -> bytes:
    """
    Full preprocessing pipeline for a single image:
    1. Deskew / correct rotation
    2. Denoise
    3. Sharpen / enhance contrast
    4. Binarize for OCR (adaptive thresholding)
    Returns preprocessed image as PNG bytes.
    """
    cv2, np = _try_import_cv2()
    if cv2 is None:
        logger.warning("OpenCV not available — returning raw image bytes")
        return image_bytes

    try:
        from PIL import Image, ImageEnhance
        import numpy as np

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            logger.warning("cv2 could not decode image — returning raw bytes")
            return image_bytes

        # Step 1: Auto-rotate using EXIF or detect orientation
        img = _correct_orientation(img, cv2, np)

        # Step 2: Deskew
        img = _deskew(img, cv2, np)

        # Step 3: Denoise
        img = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)

        # Step 4: Convert to grayscale and sharpen
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        gray = cv2.filter2D(gray, -1, kernel)

        # Step 5: Adaptive thresholding for scanned documents
        binary = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=21,
            C=10
        )

        # Encode back to PNG bytes
        success, encoded = cv2.imencode(".png", binary)
        if not success:
            return image_bytes

        return encoded.tobytes()

    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        return image_bytes


def _correct_orientation(img, cv2, np):
    """Detect and correct page orientation using heuristics (text angle)."""
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY_INV)

        # Find text contours to determine document orientation
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) < 10:
            return img

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Only auto-rotate for significant skew
        if abs(angle) < 0.5:
            return img

        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            img, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        logger.debug(f"Corrected image orientation by {angle:.2f}°")
        return rotated
    except Exception as e:
        logger.debug(f"Orientation correction skipped: {e}")
        return img


def _deskew(img, cv2, np):
    """Deskew document using Hough line transform."""
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, math.pi / 180, threshold=100, minLineLength=100, maxLineGap=10)

        if lines is None or len(lines) < 5:
            return img

        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 != x1:
                angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
                if abs(angle) < 45:  # Only horizontal lines
                    angles.append(angle)

        if not angles:
            return img

        median_angle = sorted(angles)[len(angles) // 2]
        if abs(median_angle) < 0.5:
            return img

        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        deskewed = cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REPLICATE)
        logger.debug(f"Deskewed by {median_angle:.2f}°")
        return deskewed
    except Exception as e:
        logger.debug(f"Deskew skipped: {e}")
        return img


def preprocess_pdf_pages(file_path: str, scale: float = 2.0) -> List[bytes]:
    """
    Render all pages of a PDF to preprocessed image bytes.
    Used for OCR fallback on scanned PDFs.
    Returns a list of PNG byte arrays, one per page.
    """
    import fitz
    logger.info(f"Rendering PDF pages for preprocessing: {file_path}")
    pages_bytes = []
    doc = fitz.open(file_path)
    mat = fitz.Matrix(scale, scale)

    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        raw_bytes = pix.tobytes("png")
        preprocessed = preprocess_image_bytes(raw_bytes, f"page_{page_num}.png")
        pages_bytes.append(preprocessed)

    doc.close()
    logger.info(f"Preprocessed {len(pages_bytes)} pages from {Path(file_path).name}")
    return pages_bytes


def separate_invoices_in_scan(image_bytes: bytes) -> List[bytes]:
    """
    Attempt to separate multiple invoices from a single scanned page
    using contour detection for distinct document regions.
    Returns a list of cropped image byte arrays.
    """
    cv2, np = _try_import_cv2()
    if cv2 is None:
        return [image_bytes]

    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return [image_bytes]

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 200, 255, cv2.THRESH_BINARY_INV)

        # Find large rectangular contours (likely separate documents)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        img_area = img.shape[0] * img.shape[1]
        regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            # Only consider large regions (>15% of total image area)
            if area > img_area * 0.15:
                regions.append((x, y, w, h))

        if len(regions) <= 1:
            return [image_bytes]

        # Sort by vertical position (top to bottom)
        regions.sort(key=lambda r: r[1])

        separated = []
        for x, y, w, h in regions:
            crop = img[y:y+h, x:x+w]
            _, enc = cv2.imencode(".png", crop)
            separated.append(enc.tobytes())

        logger.info(f"Separated {len(separated)} invoice regions from scan")
        return separated

    except Exception as e:
        logger.error(f"Invoice separation failed: {e}")
        return [image_bytes]
