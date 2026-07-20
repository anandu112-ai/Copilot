"""
CA Copilot Integration Hub FastAPI Route Handler.
Manages:
  - Connector credentials (simulated local encryption/disconnects)
  - Guided Import Wizard payload processing (mapping, validation, bulk import)
  - Integration Dashboard analytics
  - Document organization rules (sorting files in folder tree structure)
  - Retry queue & logs
"""
import os
import shutil
import json
import sqlite3
import uuid
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Form, HTTPException, UploadFile, File, Query
from loguru import logger
import pandas as pd

from database.db import get_db_connection
from processors.connector_sdk import get_connector, auto_detect_columns

router = APIRouter(prefix="/integrations", tags=["Integration Hub"])

# ── DB Integration Schema Initializer ─────────────────────────────────────────

def init_integrations_schema():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS integration_connections (
        id TEXT PRIMARY KEY,
        platform_id TEXT NOT NULL,
        name TEXT NOT NULL,
        credentials TEXT, -- locally simulated encrypted storage
        status TEXT DEFAULT 'Connected',
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS integration_imports (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        platform_id TEXT NOT NULL,
        filename TEXT,
        records_imported INTEGER DEFAULT 0,
        records_skipped INTEGER DEFAULT 0,
        records_duplicate INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Completed',
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS integration_mapping_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        platform_id TEXT NOT NULL,
        mappings TEXT NOT NULL, -- JSON mappings
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS integration_retry_queue (
        id TEXT PRIMARY KEY,
        import_id TEXT NOT NULL,
        record_data TEXT NOT NULL, -- JSON data
        error_message TEXT,
        status TEXT DEFAULT 'Pending',
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    conn.commit()
    conn.close()

try:
    init_integrations_schema()
except Exception as e:
    logger.warning(f"Integrations DB schema init error: {e}")


# ── Connections Management ──────────────────────────────────────────────────

@router.get("/connections")
async def get_connections():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM integration_connections ORDER BY created_at DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.post("/connections")
async def add_connection(
    platform_id: str = Form(...),
    name: str = Form(...),
    host: Optional[str] = Form(None),
    port: Optional[str] = Form(None),
    authtoken: Optional[str] = Form(None),
    organization_id: Optional[str] = Form(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    conn_id = str(uuid.uuid4())
    
    creds = {
        "host": host,
        "port": port,
        "authtoken": f"ENC_{hash(authtoken)}" if authtoken else None,
        "organization_id": organization_id
    }
    
    cursor.execute(
        "INSERT INTO integration_connections (id, platform_id, name, credentials) VALUES (?, ?, ?, ?)",
        (conn_id, platform_id, name, json.dumps(creds))
    )
    conn.commit()
    conn.close()
    return {"id": conn_id, "name": name, "platform_id": platform_id, "status": "Connected"}

@router.delete("/connections/{conn_id}")
async def disconnect_connection(conn_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM integration_connections WHERE id = ?", (conn_id,))
    conn.commit()
    conn.close()
    return {"success": True}


# ── Guided Import Wizard: Step 4: Preview Data & Smart Mapping ───────────────────

@router.post("/preview")
async def preview_columns(file: UploadFile = File(...)):
    """Accepts a file, saves to temporary store, and returns headers, preview data, and auto-mapping."""
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ['.xlsx', '.xls', '.csv']:
         raise HTTPException(status_code=400, detail="Only Excel or CSV spreadsheets supported.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)

    try:
        if suffix in ['.xlsx', '.xls']:
            df = pd.read_excel(tmp_path, nrows=10)
        else:
            df = pd.read_csv(tmp_path, nrows=10)

        df = df.where(pd.notnull(df), None)
        headers = list(df.columns)
        preview_data = df.to_dict(orient="records")
        auto_map = auto_detect_columns(headers)

        return {
            "temp_file_path": str(tmp_path),
            "headers": headers,
            "preview": preview_data,
            "auto_mapping": auto_map
        }
    except Exception as e:
        if tmp_path.exists():
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Column parsing failed: {e}")


# ── Import Wizard: Step 5-8: Validation & Commit ──────────────────────────────

@router.post("/import")
async def execute_import(
    client_id: str = Form(...),
    platform_id: str = Form(...),
    temp_file_path: str = Form(...),
    mapping_json: str = Form(...),
    save_template: bool = Form(default=False),
    template_name: Optional[str] = Form(None)
):
    """Executes the validation and final commits. Organizes doc paths on success."""
    path = Path(temp_file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Temp file expired or not found.")

    try:
        mapping = json.loads(mapping_json)
        connector = get_connector(platform_id)
        
        # Load and transform
        raw_records = connector.import_data(str(path), client_id, mapping)
        
        # Validate
        val_res = connector.validate(raw_records)
        
        # Save template if requested
        if save_template and template_name:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO integration_mapping_templates (id, name, platform_id, mappings) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), template_name, platform_id, mapping_json)
            )
            conn.commit()
            conn.close()

        # Database Commit phase
        conn = get_db_connection()
        cursor = conn.cursor()
        
        import_id = str(uuid.uuid4())
        imported_count = 0
        skipped_count = 0
        duplicate_count = val_res.get("duplicate_count", 0)
        error_count = val_res.get("invalid_count", 0)

        # Write valid entries into SQLite
        for record in val_res.get("records", []):
            if "validation_errors" in record and record["validation_errors"]:
                # Send to retry queue
                cursor.execute(
                    "INSERT INTO integration_retry_queue (id, import_id, record_data, error_message) VALUES (?, ?, ?, ?)",
                    (str(uuid.uuid4()), import_id, json.dumps(record), ", ".join(record["validation_errors"]))
                )
                skipped_count += 1
                continue
            
            # Save valid invoice to ledger_entries
            try:
                ledger_id = f"l-imp-{str(uuid.uuid4())[:8]}"
                cursor.execute("""
                    INSERT INTO ledger_entries (
                        id, client_id, ledger_type, date, description, reference_number,
                        debit, total_amount, gstin, status
                    ) VALUES (?, ?, 'purchase', ?, ?, ?, ?, ?, ?, 'unmatched')
                """, (
                    ledger_id, client_id,
                    record.get("date", datetime.now().strftime('%Y-%m-%d')),
                    record.get("vendor", "Imported Ledger Entry"),
                    record.get("invoice_number", f"REF-{uuid.uuid4().hex[:6].upper()}"),
                    float(record.get("total_amount", 0.0)),
                    float(record.get("total_amount", 0.0)),
                    record.get("gstin"),
                ))
                imported_count += 1
            except Exception as e:
                logger.error(f"Failed inserting record: {e}")
                cursor.execute(
                    "INSERT INTO integration_retry_queue (id, import_id, record_data, error_message) VALUES (?, ?, ?, ?)",
                    (str(uuid.uuid4()), import_id, json.dumps(record), str(e))
                )
                error_count += 1
                skipped_count += 1

        # Track history
        cursor.execute("""
            INSERT INTO integration_imports (
                id, client_id, platform_id, filename, records_imported, records_skipped, records_duplicate, error_count, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed')
        """, (
            import_id, client_id, platform_id, path.name,
            imported_count, skipped_count, duplicate_count, error_count
        ))
        
        conn.commit()
        conn.close()

        # Clean up temp spreadsheet
        os.unlink(path)

        return {
            "import_id": import_id,
            "imported": imported_count,
            "skipped": skipped_count,
            "duplicates": duplicate_count,
            "errors": error_count,
            "status": "Success"
        }
    except Exception as e:
        if path.exists():
            os.unlink(path)
        logger.exception("Import operation failure")
        raise HTTPException(status_code=500, detail=f"Import transaction failed: {str(e)}")


# ── Module 8: Document Organization Rules ───────────────────────────────────────

@router.post("/organize-documents")
async def organize_documents(
    client_id: str = Form(...),
    financial_year: str = Form(...),
    month: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...)
):
    """Saves and organizes files into Client/FY/Month/Type file hierarchy tree."""
    # Organize in local documents folders under workspace
    base_dir = Path("/workspaces/Copilot/apps/processor/database/organized_docs")
    organized_path = base_dir / client_id / financial_year / month / document_type
    organized_path.mkdir(parents=True, exist_ok=True)

    dest_file = organized_path / file.filename
    with open(dest_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "success": True,
        "path": str(dest_file.relative_to(base_dir)),
        "filename": file.filename
    }


# ── Integration Dashboard statistics & logs ──────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard_stats(client_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Total imports count
    cursor.execute("SELECT COUNT(*) as c, SUM(records_imported) as s FROM integration_imports WHERE client_id = ?", (client_id,))
    imp_row = cursor.fetchone()
    total_imports = imp_row["c"] or 0
    total_records = imp_row["s"] or 0

    # 2. Connections count
    cursor.execute("SELECT COUNT(*) as c FROM integration_connections")
    total_connections = cursor.fetchone()["c"]

    # 3. Validation errors / pending retries
    cursor.execute("""
        SELECT COUNT(*) as c FROM integration_retry_queue q
        JOIN integration_imports i ON q.import_id = i.id
        WHERE i.client_id = ? AND q.status = 'Pending'
    """, (client_id,))
    pending_retries = cursor.fetchone()["c"]

    # 4. Recent imports list
    cursor.execute("SELECT * FROM integration_imports WHERE client_id = ? ORDER BY created_at DESC LIMIT 10", (client_id,))
    recent = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "connections_count": total_connections,
        "imports_count": total_imports,
        "records_imported": total_records,
        "pending_retries": pending_retries,
        "recent_imports": recent
    }

@router.get("/templates")
async def get_templates(platform_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM integration_mapping_templates WHERE platform_id = ?", (platform_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.get("/retry-queue")
async def get_retry_queue(import_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if import_id:
        cursor.execute("SELECT * FROM integration_retry_queue WHERE import_id = ? AND status = 'Pending'", (import_id,))
    else:
        cursor.execute("SELECT * FROM integration_retry_queue WHERE status = 'Pending'")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
