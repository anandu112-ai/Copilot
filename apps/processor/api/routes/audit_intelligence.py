"""
CA Copilot AI Audit Intelligence API Router.
Handles audit runs, finding listings, custom learning rules, vendor profiles, and report exports.
"""
import uuid
import tempfile
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Form, Query, Response
from loguru import logger

from database.db import get_db_connection
from processors.audit_intelligence import AuditIntelligenceEngine, get_vendor_profiles, get_customer_profiles
from exporters.audit_reports import AuditReportsExporter

router = APIRouter(prefix="/audit", tags=["Audit Intelligence"])

def row_to_dict(row):
    return dict(row) if row else None

# ── Audit Runs & Findings ──────────────────────────────────────────────────

@router.post("/run")
async def run_audit_scan(client_id: str = Form(...)):
    """Triggers the full AI audit check suite and commits findings to SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Client not found")
        
    conn.close()

    try:
        engine = AuditIntelligenceEngine(client_id)
        count = engine.run_all_audits()
        return {"success": True, "count": count}
    except Exception as e:
        logger.exception("AI Audit scan failure")
        raise HTTPException(status_code=500, detail=f"Audit scan run failed: {str(e)}")

@router.get("/findings")
async def get_audit_findings(
    client_id: str,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Retrieve audit findings with optional severity/category/status filters."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM audit_findings WHERE client_id = ?"
    params = [client_id]

    if severity and severity != "all":
        query += " AND severity = ?"
        params.append(severity)
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
    if status and status != "all":
        query += " AND status = ?"
        params.append(status)
    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    query += " ORDER BY risk_score DESC"
    cursor.execute(query, params)
    rows = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.post("/action")
async def handle_audit_action(
    finding_id: str = Form(...),
    action: str = Form(...), # resolve, reopen, add_notes
    notes: Optional[str] = Form(None)
):
    """Mark findings as resolved / open or add accountant notes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, client_id FROM audit_findings WHERE id = ?", (finding_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Finding not found")

    client_id = row["client_id"]

    try:
        if action == "resolve":
            cursor.execute("UPDATE audit_findings SET status = 'Resolved' WHERE id = ?", (finding_id,))
            cursor.execute("""
                INSERT INTO audit_trail (client_id, action, module, record_id_1, user_decision, notes)
                VALUES (?, 'resolve_finding', 'audit', ?, 'RESOLVED', ?)
            """, (client_id, finding_id, notes or "Marked as Resolved"))
        elif action == "reopen":
            cursor.execute("UPDATE audit_findings SET status = 'Open' WHERE id = ?", (finding_id,))
            cursor.execute("""
                INSERT INTO audit_trail (client_id, action, module, record_id_1, user_decision, notes)
                VALUES (?, 'reopen_finding', 'audit', ?, 'OPENED', ?)
            """, (client_id, finding_id, notes or "Re-opened finding"))
        elif action == "add_notes":
            cursor.execute("UPDATE audit_findings SET notes = ? WHERE id = ?", (notes, finding_id))
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Action failed: {str(e)}")

    conn.close()
    return {"success": True}

# ── Module 12: Learning Rules (Custom Rules Configurator) ────────────────────

@router.get("/rules")
async def get_audit_rules():
    """Get all customizable audit rules."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_rules")
    rules = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return rules

@router.post("/rules")
async def create_audit_rule(
    name: str = Form(...),
    description: str = Form(...),
    target_field: str = Form(...),
    condition_operator: str = Form(...),
    condition_value: str = Form(...),
    severity: str = Form(...),
    is_enabled: int = Form(1)
):
    """Add a new customizable rule configuration without changing code."""
    rule_id = str(uuid.uuid4())
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO audit_rules (id, name, description, target_field, condition_operator, condition_value, severity, is_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (rule_id, name, description, target_field, condition_operator, condition_value, severity, is_enabled))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Rule name already exists")
    conn.close()
    return {"id": rule_id, "name": name}

@router.put("/rules/{rule_id}")
async def update_audit_rule(
    rule_id: str,
    description: Optional[str] = Form(None),
    condition_value: Optional[str] = Form(None),
    severity: Optional[str] = Form(None),
    is_enabled: Optional[int] = Form(None)
):
    """Modify details or toggle enablement status of a custom rule."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM audit_rules WHERE id = ?", (rule_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Rule not found")

    updates = []
    params = []
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if condition_value is not None:
        updates.append("condition_value = ?")
        params.append(condition_value)
    if severity is not None:
        updates.append("severity = ?")
        params.append(severity)
    if is_enabled is not None:
        updates.append("is_enabled = ?")
        params.append(is_enabled)

    if updates:
        query = f"UPDATE audit_rules SET {', '.join(updates)} WHERE id = ?"
        params.append(rule_id)
        cursor.execute(query, params)
        conn.commit()

    conn.close()
    return {"success": True}

@router.delete("/rules/{rule_id}")
async def delete_audit_rule(rule_id: str):
    """Remove a custom rule configuration."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM audit_rules WHERE id = ?", (rule_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# ── Module 10: Interactive Audit Dashboard Stats ─────────────────────────────

@router.get("/dashboard-stats")
async def get_audit_dashboard_stats(client_id: str):
    """Retrieve statistics, impact amounts, compliance health score, and severity aggregates."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total Findings
    cursor.execute("SELECT count(*), sum(case when status='Open' then 1 else 0 end) FROM audit_findings WHERE client_id = ?", (client_id,))
    total_cnt, open_cnt = cursor.fetchone()
    total_cnt = total_cnt or 0
    open_cnt = open_cnt or 0

    # Severity Counts
    cursor.execute("""
        SELECT severity, count(*)
        FROM audit_findings
        WHERE client_id = ? AND status='Open'
        GROUP BY severity
    """, (client_id,))
    sev_counts = {r[0].lower(): r[1] for r in cursor.fetchall()}
    
    # Impact amount
    cursor.execute("SELECT sum(impact_amount) FROM audit_findings WHERE client_id = ? AND status='Open'", (client_id,))
    total_impact = cursor.fetchone()[0] or 0.0

    # Compliance Score calculation
    # Base 100, deduction per finding based on severity
    deductions = {
        "critical": 15,
        "high": 10,
        "medium": 5,
        "low": 2
    }
    score = 100
    for sev, count in sev_counts.items():
        score -= count * deductions.get(sev, 1)
    compliance_score = max(score, 10)

    # Reconciliations stats for tabs count
    cursor.execute("SELECT count(*) FROM gst_invoices WHERE client_id=? AND status='unmatched'", (client_id,))
    gst_unmatched = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT count(*) FROM bank_transactions WHERE client_id=? AND status='unmatched'", (client_id,))
    bank_unmatched = cursor.fetchone()[0] or 0

    # Duplicates stats
    cursor.execute("SELECT count(*) FROM audit_findings WHERE client_id=? AND category='Duplicate Entry'", (client_id,))
    dup_count = cursor.fetchone()[0] or 0

    conn.close()
    return {
        "compliance_score": compliance_score,
        "total_findings": total_cnt,
        "open_findings": open_cnt,
        "critical_count": sev_counts.get("critical", 0),
        "high_count": sev_counts.get("high", 0),
        "medium_count": sev_counts.get("medium", 0),
        "low_count": sev_counts.get("low", 0),
        "total_impact_amount": total_impact,
        "gst_unmatched_count": gst_unmatched,
        "bank_unmatched_count": bank_unmatched,
        "duplicate_count": dup_count
    }

# ── Module 7: Vendor & Customer Profile Intelligence ──────────────────────────

@router.get("/vendor-profiles")
async def get_audit_vendor_profiles(client_id: str):
    """Retrieve detailed profiles and risk insights for all vendors."""
    try:
        return get_vendor_profiles(client_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customer-profiles")
async def get_audit_customer_profiles(client_id: str):
    """Retrieve customer statistics and profile metrics."""
    try:
        return get_customer_profiles(client_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Module 11: Reports Export ─────────────────────────────────────────────────

@router.get("/reports/export")
async def export_audit_findings(
    client_id: str,
    format_type: str = "excel" # excel, csv, pdf
):
    """Export findings report in the requested file layout."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM clients WHERE id = ?", (client_id,))
    client_row = cursor.fetchone()
    if not client_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Client not found")
    client_name = client_row["name"]

    cursor.execute("SELECT * FROM audit_findings WHERE client_id = ? ORDER BY risk_score DESC", (client_id,))
    findings = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()

    exporter = AuditReportsExporter(client_id, client_name)

    if format_type == "csv":
        csv_content = exporter.export_csv(findings)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit_findings_report_{client_name}.csv"}
        )
        
    elif format_type == "pdf":
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir) / "audit_findings.pdf"
            exporter.export_pdf(findings, str(tmp_path))
            with open(tmp_path, "rb") as f:
                pdf_bytes = f.read()
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=audit_findings_report_{client_name}.pdf"}
            )
            
    else: # excel
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir) / "audit_findings.xlsx"
            exporter.export_excel(findings, str(tmp_path))
            with open(tmp_path, "rb") as f:
                excel_bytes = f.read()
            return Response(
                content=excel_bytes,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=audit_findings_report_{client_name}.xlsx"}
            )
