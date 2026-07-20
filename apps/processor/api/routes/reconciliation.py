"""
CA Copilot Reconciliation Engine API Routes.
Exposes endpoints for Clients, Bank Statements, Ledger, GST, Matching, Dashboard, Workspace actions, and Reports.
"""
import os
import uuid
import tempfile
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response, StreamingResponse
from loguru import logger
import json

from database.db import get_db_connection
from processors.reconciliation_engine import MatchingEngine, detect_duplicates
from exporters.reconciliation_reports import ReconciliationReportsExporter
from parsers.reconciliation_parsers import parse_ledger_upload, parse_gst_upload
from models.schemas import ExtractionRequest
from processors.document_pipeline import DocumentPipeline

router = APIRouter(prefix="/reconciliation", tags=["Reconciliation"])

# Helper to format rows
def row_to_dict(row):
    return dict(row) if row else None

# ── Clients Endpoints ────────────────────────────────────────────────────────

@router.post("/clients")
async def create_client(name: str = Form(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    client_id = str(uuid.uuid4())
    try:
        cursor.execute("INSERT INTO clients (id, name) VALUES (?, ?)", (client_id, name))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Client name already exists")
    conn.close()
    return {"id": client_id, "name": name}

@router.get("/clients")
async def get_clients():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, created_at FROM clients ORDER BY name ASC")
    clients = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return clients

# ── Document Uploader & Ingestion ───────────────────────────────────────────

@router.post("/upload-bank")
async def upload_bank_statement(
    client_id: str = Form(...),
    bank_name: Optional[str] = Form(None),
    account_number: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Ingest a bank statement.
    If PDF: run document extraction pipeline (with OCR).
    If Excel/CSV: parse via Pandas column mapping.
    """
    file_bytes = await file.read()
    filename = file.filename or "statement.pdf"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify client exists
    cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Client not found")

    transactions_to_insert = []
    extracted_bank_name = bank_name or "Unknown Bank"
    extracted_ac_no = account_number or "Unknown Account"

    # If PDF, process using the core document pipeline
    if filename.endswith(".pdf"):
        logger.info(f"Processing PDF Bank Statement via DocumentPipeline: {filename}")
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir) / filename
            with open(tmp_path, "wb") as f:
                f.write(file_bytes)
            
            # Setup Extraction Request
            request = ExtractionRequest(
                file_path=str(tmp_path),
                document_type="bank_statement",
                ocr_enabled=True,
                preprocess_image=True
            )
            try:
                pipeline = DocumentPipeline(request)
                result = await pipeline.run()
                
                # Fetch bank metadata from result if available
                if result.bank_header:
                    extracted_bank_name = bank_name or result.bank_header.bank_name or "Parsed Bank"
                    extracted_ac_no = account_number or result.bank_header.account_number or "Parsed Account"

                for t in result.transactions:
                    transactions_to_insert.append({
                        "date": t.date,
                        "value_date": t.value_date,
                        "narration": t.description or t.narration,
                        "reference_number": t.reference_number,
                        "cheque_number": t.chq_ref,
                        "debit": float(t.debit) if t.debit else 0.0,
                        "credit": float(t.credit) if t.credit else 0.0,
                        "balance": float(t.balance) if t.balance else 0.0,
                        "payment_mode": t.payment_mode or "OTHER",
                        "category": t.category or "OTHER",
                        "audit_flag": t.audit_flag
                    })
            except Exception as e:
                logger.exception("Error extracting PDF statement")
                conn.close()
                raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")
    
    # If Excel / CSV, parse using pandas table parsing helper
    elif filename.endswith((".xlsx", ".xls", ".csv")):
        logger.info(f"Parsing Excel/CSV Bank Statement via Pandas: {filename}")
        try:
            records = parse_ledger_upload(file_bytes, filename)
            for r in records:
                transactions_to_insert.append({
                    "date": r["date"],
                    "value_date": r["date"], # default same
                    "narration": r["description"],
                    "reference_number": r["reference_number"] or r["invoice_number"],
                    "cheque_number": "",
                    "debit": r["debit"],
                    "credit": r["credit"],
                    "balance": 0.0,
                    "payment_mode": "OTHER",
                    "category": "OTHER",
                    "audit_flag": ""
                })
        except Exception as e:
            logger.exception("Error parsing statement sheet")
            conn.close()
            raise HTTPException(status_code=400, detail=f"Sheet parsing failed: {str(e)}")
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid file type. Upload PDF, Excel, or CSV.")

    # Write transactions to database
    inserted_count = 0
    for txn in transactions_to_insert:
        txn_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO bank_transactions (
                id, client_id, bank_name, account_number, date, value_date, narration,
                reference_number, cheque_number, debit, credit, balance,
                transaction_type, payment_mode, category, status, audit_flag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unmatched', ?)
        """, (
            txn_id, client_id, extracted_bank_name, extracted_ac_no, txn["date"], txn["value_date"],
            txn["narration"], txn["reference_number"], txn["cheque_number"], txn["debit"], txn["credit"],
            txn["balance"], "debit" if txn["debit"] > 0 else "credit", txn["payment_mode"], txn["category"], txn["audit_flag"]
        ))
        inserted_count += 1
        
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "count": inserted_count,
        "bank_name": extracted_bank_name,
        "account_number": extracted_ac_no
    }

@router.post("/upload-ledger")
async def upload_ledger(
    client_id: str = Form(...),
    ledger_type: str = Form(...), # purchase, sales, cash, bank, general
    file: UploadFile = File(...)
):
    """
    Upload Cash Book, Purchase Register, Sales Register or general/sub-ledgers.
    Supports Excel & CSV.
    """
    file_bytes = await file.read()
    filename = file.filename or "ledger.xlsx"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Client not found")

    try:
        records = parse_ledger_upload(file_bytes, filename)
    except Exception as e:
        logger.exception("Error parsing ledger file")
        conn.close()
        raise HTTPException(status_code=400, detail=f"Ledger file parse error: {str(e)}")

    inserted = 0
    for r in records:
        entry_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO ledger_entries (
                id, client_id, ledger_type, date, description, reference_number,
                debit, credit, balance, gstin, invoice_number, amount_taxable,
                cgst, sgst, igst, cess, total_amount, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unmatched')
        """, (
            entry_id, client_id, ledger_type, r["date"], r["description"], r["reference_number"],
            r["debit"], r["credit"], r["credit"] - r["debit"], r["gstin"], r["invoice_number"],
            r["amount_taxable"], r["cgst"], r["sgst"], r["igst"], r["cess"], r["total_amount"]
        ))
        inserted += 1

    conn.commit()
    conn.close()
    return {"success": True, "count": inserted}

@router.post("/upload-gst")
async def upload_gst(
    client_id: str = Form(...),
    source_type: str = Form(...), # gstr-1, gstr-2b, gstr-3b
    file: UploadFile = File(...)
):
    """
    Upload GSTR-2B or GSTR-1 files.
    """
    file_bytes = await file.read()
    filename = file.filename or "gstr.xlsx"

    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Client not found")

    try:
        records = parse_gst_upload(file_bytes, filename)
    except Exception as e:
        logger.exception("Error parsing GST file")
        conn.close()
        raise HTTPException(status_code=400, detail=f"GST file parse error: {str(e)}")

    inserted = 0
    for r in records:
        inv_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO gst_invoices (
                id, client_id, source_type, gstin, vendor_name, invoice_number, invoice_date,
                taxable_value, cgst, sgst, igst, cess, total_amount, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unmatched')
        """, (
            inv_id, client_id, source_type, r["gstin"], r["vendor_name"], r["invoice_number"],
            r["invoice_date"], r["taxable_value"], r["cgst"], r["sgst"], r["igst"], r["cess"], r["total_amount"]
        ))
        inserted += 1

    conn.commit()
    conn.close()
    return {"success": True, "count": inserted}

# ── Reconcile Matching Executions ───────────────────────────────────────────

@router.post("/match/bank")
async def run_bank_matching(
    client_id: str,
    amount_tolerance: float = Query(1.0),
    date_tolerance_days: int = Query(10)
):
    engine = MatchingEngine(client_id)
    result = engine.reconcile_bank_statements(amount_tolerance, date_tolerance_days)
    return result

@router.post("/match/gst")
async def run_gst_matching(
    client_id: str,
    amount_tolerance: float = Query(5.0)
):
    engine = MatchingEngine(client_id)
    result = engine.reconcile_gst(amount_tolerance)
    return result

@router.post("/match/ledger")
async def run_ledger_matching(
    client_id: str,
    amount_tolerance: float = Query(1.0)
):
    engine = MatchingEngine(client_id)
    result = engine.reconcile_ledgers(amount_tolerance)
    return result

# ── Data Listing & Filters ──────────────────────────────────────────────────

@router.get("/transactions/bank")
async def get_bank_transactions(
    client_id: str,
    status: Optional[str] = None,
    payment_mode: Optional[str] = None,
    category: Optional[str] = None
):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM bank_transactions WHERE client_id = ?"
    params = [client_id]
    
    if status:
        query += " AND status = ?"
        params.append(status)
    if payment_mode:
        query += " AND payment_mode = ?"
        params.append(payment_mode)
    if category:
        query += " AND category = ?"
        params.append(category)
        
    query += " ORDER BY date DESC"
    cursor.execute(query, params)
    rows = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.get("/transactions/ledger")
async def get_ledger_entries(
    client_id: str,
    ledger_type: Optional[str] = None,
    status: Optional[str] = None
):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM ledger_entries WHERE client_id = ?"
    params = [client_id]
    
    if ledger_type:
        query += " AND ledger_type = ?"
        params.append(ledger_type)
    if status:
        query += " AND status = ?"
        params.append(status)
        
    query += " ORDER BY date DESC"
    cursor.execute(query, params)
    rows = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.get("/transactions/gst")
async def get_gst_invoices(
    client_id: str,
    source_type: Optional[str] = None,
    status: Optional[str] = None
):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM gst_invoices WHERE client_id = ?"
    params = [client_id]
    
    if source_type:
        query += " AND source_type = ?"
        params.append(source_type)
    if status:
        query += " AND status = ?"
        params.append(status)
        
    query += " ORDER BY invoice_date DESC"
    cursor.execute(query, params)
    rows = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.get("/duplicates")
async def get_client_duplicates(client_id: str):
    return detect_duplicates(client_id)

# ── Workspace Review Override Actions & Auditing ────────────────────────────

@router.post("/action")
async def handle_workspace_action(
    client_id: str = Form(...),
    action: str = Form(...), # accept_match, reject_match, merge_records, edit_data, add_notes
    module: str = Form(...), # bank, gst, ledger
    record_id_1: str = Form(...),
    record_id_2: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    updated_data: Optional[str] = Form(None) # JSON payload for edits
):
    """
    Handles user decision. Updates database states and creates an audit trail entry.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Save to Audit Trail
        cursor.execute("""
            INSERT INTO audit_trail (client_id, action, module, record_id_1, record_id_2, user_decision, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (client_id, action, module, record_id_1, record_id_2, action.upper(), notes))

        # 1. Reject Match
        if action == "reject_match":
            if module == "bank":
                cursor.execute("UPDATE bank_transactions SET status = 'unmatched', matched_ledger_id = NULL, match_score = NULL, match_reason = NULL WHERE id = ?", (record_id_1,))
                if record_id_2:
                    cursor.execute("UPDATE ledger_entries SET status = 'unmatched', matched_txn_id = NULL, match_score = NULL, match_reason = NULL WHERE id = ?", (record_id_2,))
            elif module == "gst":
                cursor.execute("UPDATE gst_invoices SET status = 'unmatched', matched_ledger_id = NULL, match_score = NULL, match_reason = NULL WHERE id = ?", (record_id_1,))
                if record_id_2:
                    cursor.execute("UPDATE ledger_entries SET status = 'unmatched', matched_txn_id = NULL, match_score = NULL, match_reason = NULL WHERE id = ?", (record_id_2,))
            elif module == "ledger":
                cursor.execute("UPDATE ledger_entries SET status = 'unmatched', matched_txn_id = NULL, match_score = NULL, match_reason = NULL WHERE id = ?", (record_id_1,))
                if record_id_2:
                    cursor.execute("UPDATE ledger_entries SET status = 'unmatched', matched_txn_id = NULL, match_score = NULL, match_reason = NULL WHERE id = ?", (record_id_2,))

        # 2. Accept Match
        elif action == "accept_match":
            if not record_id_2:
                raise HTTPException(status_code=400, detail="record_id_2 is required for accept_match")
            if module == "bank":
                cursor.execute("UPDATE bank_transactions SET status = 'matched', matched_ledger_id = ?, match_score = 100.0, match_reason = 'Manual Override Accept' WHERE id = ?", (record_id_2, record_id_1))
                cursor.execute("UPDATE ledger_entries SET status = 'matched', matched_txn_id = ?, match_score = 100.0, match_reason = 'Manual Override Accept' WHERE id = ?", (record_id_1, record_id_2))
            elif module == "gst":
                cursor.execute("UPDATE gst_invoices SET status = 'matched', matched_ledger_id = ?, match_score = 100.0, match_reason = 'Manual Override Accept' WHERE id = ?", (record_id_2, record_id_1))
                cursor.execute("UPDATE ledger_entries SET status = 'matched', matched_txn_id = ?, match_score = 100.0, match_reason = 'Manual Override Accept' WHERE id = ?", (record_id_1, record_id_2))
            elif module == "ledger":
                cursor.execute("UPDATE ledger_entries SET status = 'matched', matched_txn_id = ?, match_score = 100.0, match_reason = 'Manual Override Accept' WHERE id = ?", (record_id_2, record_id_1))
                cursor.execute("UPDATE ledger_entries SET status = 'matched', matched_txn_id = ?, match_score = 100.0, match_reason = 'Manual Override Accept' WHERE id = ?", (record_id_1, record_id_2))

        # 3. Add Notes
        elif action == "add_notes":
            if module == "bank":
                cursor.execute("UPDATE bank_transactions SET notes = ? WHERE id = ?", (notes, record_id_1))
            elif module == "gst":
                cursor.execute("UPDATE gst_invoices SET notes = ? WHERE id = ?", (notes, record_id_1))
            elif module == "ledger":
                cursor.execute("UPDATE ledger_entries SET notes = ? WHERE id = ?", (notes, record_id_1))

        # 4. Edit Data
        elif action == "edit_data":
            if not updated_data:
                raise HTTPException(status_code=400, detail="updated_data is required for edit_data")
            data_dict = json.loads(updated_data)
            if module == "bank":
                cursor.execute("""
                    UPDATE bank_transactions
                    SET date = ?, narration = ?, reference_number = ?, debit = ?, credit = ?, category = ?
                    WHERE id = ?
                """, (data_dict.get("date"), data_dict.get("narration"), data_dict.get("reference_number"), data_dict.get("debit"), data_dict.get("credit"), data_dict.get("category"), record_id_1))
            elif module == "gst":
                cursor.execute("""
                    UPDATE gst_invoices
                    SET invoice_date = ?, vendor_name = ?, invoice_number = ?, taxable_value = ?, total_amount = ?, gstin = ?
                    WHERE id = ?
                """, (data_dict.get("invoice_date"), data_dict.get("vendor_name"), data_dict.get("invoice_number"), data_dict.get("taxable_value"), data_dict.get("total_amount"), data_dict.get("gstin"), record_id_1))
            elif module == "ledger":
                cursor.execute("""
                    UPDATE ledger_entries
                    SET date = ?, description = ?, reference_number = ?, debit = ?, credit = ?, invoice_number = ?
                    WHERE id = ?
                """, (data_dict.get("date"), data_dict.get("description"), data_dict.get("reference_number"), data_dict.get("debit"), data_dict.get("credit"), data_dict.get("invoice_number"), record_id_1))

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        logger.exception("Error executing override action")
        raise HTTPException(status_code=500, detail=f"Action failed: {str(e)}")
    
    conn.close()
    return {"success": True}

@router.get("/audit-trail")
async def get_audit_trail(client_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, action, module, record_id_1, record_id_2, timestamp, user_decision, notes
        FROM audit_trail
        WHERE client_id = ?
        ORDER BY timestamp DESC
    """, (client_id,))
    rows = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

# ── Module 8: Dashboard Telemetry ─────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard_stats(client_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    stats = {}
    
    # Bank Stats
    cursor.execute("SELECT count(*), sum(case when status='matched' then 1 else 0 end), sum(case when status='pending_review' then 1 else 0 end) FROM bank_transactions WHERE client_id=?", (client_id,))
    b_total, b_matched, b_pending = cursor.fetchone()
    stats["bank"] = {
        "total": b_total or 0,
        "matched": b_matched or 0,
        "pending": b_pending or 0,
        "unmatched": (b_total or 0) - (b_matched or 0) - (b_pending or 0)
    }
    
    # GST Stats
    cursor.execute("SELECT count(*), sum(case when status='matched' then 1 else 0 end), sum(case when status='pending_review' then 1 else 0 end) FROM gst_invoices WHERE client_id=?", (client_id,))
    g_total, g_matched, g_pending = cursor.fetchone()
    stats["gst"] = {
        "total": g_total or 0,
        "matched": g_matched or 0,
        "pending": g_pending or 0,
        "unmatched": (g_total or 0) - (g_matched or 0) - (g_pending or 0)
    }

    # Ledger Stats
    cursor.execute("SELECT count(*), sum(case when status='matched' then 1 else 0 end), sum(case when status='pending_review' then 1 else 0 end) FROM ledger_entries WHERE client_id=?", (client_id,))
    l_total, l_matched, l_pending = cursor.fetchone()
    stats["ledger"] = {
        "total": l_total or 0,
        "matched": l_matched or 0,
        "pending": l_pending or 0,
        "unmatched": (l_total or 0) - (l_matched or 0) - (l_pending or 0)
    }
    
    # Duplicates stats
    dups = detect_duplicates(client_id)
    stats["duplicates"] = {
        "bank": len(dups["bank"]),
        "gst": len(dups["gst"]),
        "ledger": len(dups["ledger"]),
        "total": len(dups["bank"]) + len(dups["gst"]) + len(dups["ledger"])
    }
    
    conn.close()
    return stats

# ── Module 7: Reports Generation ─────────────────────────────────────────────

@router.get("/reports/export")
async def export_reconciliation_report(
    client_id: str,
    report_type: str, # bank, gst, ledger, duplicate
    format_type: str = "excel" # excel, csv, pdf
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM clients WHERE id = ?", (client_id,))
    client_row = cursor.fetchone()
    if not client_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Client not found")
    client_name = client_row["name"]
    
    exporter = ReconciliationReportsExporter(client_id, client_name)
    data = {}

    if report_type == "bank":
        cursor.execute("SELECT * FROM bank_transactions WHERE client_id = ?", (client_id,))
        txns = [row_to_dict(r) for r in cursor.fetchall()]
        data = {
            "total_count": len(txns),
            "matched_count": sum(1 for t in txns if t["status"] == "matched"),
            "pending_count": sum(1 for t in txns if t["status"] == "pending_review"),
            "unmatched_count": sum(1 for t in txns if t["status"] == "unmatched"),
            "transactions": txns
        }
    elif report_type == "gst":
        cursor.execute("SELECT * FROM gst_invoices WHERE client_id = ?", (client_id,))
        invoices = [row_to_dict(r) for r in cursor.fetchall()]
        data = {"invoices": invoices}
    elif report_type == "ledger":
        cursor.execute("SELECT * FROM ledger_entries WHERE client_id = ?", (client_id,))
        entries = [row_to_dict(r) for r in cursor.fetchall()]
        data = {"entries": entries}
    elif report_type == "duplicate":
        data = detect_duplicates(client_id)
        
    conn.close()

    if format_type == "csv":
        csv_content = exporter.export_csv(data, report_type)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{client_name}.csv"}
        )
        
    elif format_type == "pdf":
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir) / f"{report_type}_report.pdf"
            exporter.export_pdf(data, report_type, str(tmp_path))
            with open(tmp_path, "rb") as f:
                pdf_bytes = f.read()
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={report_type}_report_{client_name}.pdf"}
            )
            
    else: # excel
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir) / f"{report_type}_report.xlsx"
            exporter.export_excel(data, report_type, str(tmp_path))
            with open(tmp_path, "rb") as f:
                excel_bytes = f.read()
            return Response(
                content=excel_bytes,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={report_type}_report_{client_name}.xlsx"}
            )
