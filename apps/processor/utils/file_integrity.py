"""
File Integrity Utilities — CA Copilot
Provides SHA-256 checksums, file size validation, and temp file cleanup.
"""
import hashlib
import os
import time
import tempfile
from pathlib import Path
from typing import Optional
from loguru import logger

UPLOAD_TMP_DIR = Path(tempfile.gettempdir()) / 'ca_copilot_uploads'


def compute_sha256(file_path: str) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def verify_file_integrity(file_path: str, expected_hash: Optional[str] = None) -> dict:
    """
    Verify a file exists, is readable, and optionally matches an expected SHA-256.
    Returns dict with: path, size_bytes, sha256, valid, error
    """
    result = {
        'path': file_path,
        'size_bytes': 0,
        'sha256': '',
        'valid': False,
        'error': None,
    }
    try:
        p = Path(file_path)
        if not p.exists():
            result['error'] = 'File not found'
            return result
        if not p.is_file():
            result['error'] = 'Path is not a file'
            return result
        stat = p.stat()
        if stat.st_size == 0:
            result['error'] = 'File is empty'
            return result
        result['size_bytes'] = stat.st_size
        result['sha256'] = compute_sha256(file_path)
        if expected_hash and result['sha256'] != expected_hash:
            result['error'] = f'Hash mismatch: expected {expected_hash}, got {result["sha256"]}'
            return result
        result['valid'] = True
    except PermissionError as e:
        result['error'] = f'Permission denied: {e}'
    except Exception as e:
        result['error'] = f'Integrity check failed: {e}'
    return result


def cleanup_temp_files(max_age_seconds: int = 3600) -> int:
    """
    Delete temp upload files older than max_age_seconds.
    Returns the count of files deleted.
    Called on app startup and periodically.
    """
    if not UPLOAD_TMP_DIR.exists():
        return 0
    now = time.time()
    deleted = 0
    for f in UPLOAD_TMP_DIR.iterdir():
        try:
            if f.is_file() and (now - f.stat().st_mtime) > max_age_seconds:
                f.unlink()
                deleted += 1
                logger.debug(f'Cleaned up temp file: {f.name}')
        except Exception as e:
            logger.warning(f'Could not delete temp file {f.name}: {e}')
    if deleted:
        logger.info(f'Temp cleanup: removed {deleted} files from {UPLOAD_TMP_DIR}')
    return deleted


def safe_delete(file_path: str) -> bool:
    """Safely delete a file, logging but not raising on failure."""
    try:
        p = Path(file_path)
        if p.exists():
            p.unlink()
            logger.debug(f'Deleted: {file_path}')
        return True
    except Exception as e:
        logger.warning(f'Could not delete {file_path}: {e}')
        return False
