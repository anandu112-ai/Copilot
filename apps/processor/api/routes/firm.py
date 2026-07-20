"""
CA Copilot CA Firm Management & Workflow API Route Handler.
FastAPI router providing:
  - Firm Profile & Branch settings (Module 1)
  - User Directory & Roles / Permissions (Module 2)
  - Tasks & Assignment Management (Module 4)
  - Multi-stage Approval Workflow queue (Module 5 & 8)
  - Internal Communications & Comments (Module 6)
  - Compliance Calendar (GST, IT, ROC, TDS due dates) (Module 7)
  - Full Audit Trail logging (Module 9)
  - SOP / Templates Knowledge Repository (Module 10)
  - Performance Dashboard (Module 11)
  - Action Notifications (Module 12)
"""
import json
import uuid
import sqlite3
import bcrypt
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Form, HTTPException, Query, Header
from loguru import logger
from jose import jwt, JWTError

from database.db import get_db_connection

router = APIRouter(prefix="/firm", tags=["CA Firm Management"])

# ── Auth helpers ──────────────────────────────────────────────────────────────

JWT_SECRET = "CA_COPILOT_JWT_SECRET_KEY_2026_CHANGE_IN_PROD"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 12

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

# ── DB Schema Init ────────────────────────────────────────────────────────────

def init_firm_schema():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Firm Details Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS firm_profile (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # 2. Staff Directory Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS firm_staff (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL, -- Super Admin, Partner, Audit Manager, Senior Auditor, etc.
        email TEXT UNIQUE NOT NULL,
        branch TEXT DEFAULT 'Head Office',
        permissions TEXT, -- JSON permissions list
        status TEXT DEFAULT 'Active',
        password_hash TEXT,
        is_admin INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # Migrate: add columns to existing firm_staff if they don't exist yet
    try:
        cursor.execute("ALTER TABLE firm_staff ADD COLUMN password_hash TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE firm_staff ADD COLUMN is_admin INTEGER DEFAULT 0")
    except Exception:
        pass

    # 3. Tasks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS firm_tasks (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        task_type TEXT NOT NULL, -- Audit, GST, Bank Reconciliation, IT Return, Document Collection
        owner_id TEXT NOT NULL,
        due_date TEXT,
        priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Critical
        status TEXT DEFAULT 'Pending', -- Pending, In Progress, In Review, Approved, Completed
        comments TEXT DEFAULT '[]', -- JSON comments list
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # 4. Approvals Workflows Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS firm_approvals (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        client_id TEXT NOT NULL,
        document_id TEXT,
        stage TEXT NOT NULL, -- Document Uploaded, AI Processing, Staff Review, Senior Review, Partner Approval, Completed
        assigned_to TEXT,
        status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected, Needs Clarification
        reviewer_notes TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # 5. Compliance Calendar Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS firm_compliance_dates (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        category TEXT NOT NULL, -- GST, Income Tax, ROC, TDS, Custom
        description TEXT
    )
    """)

    # 6. Audit Trail Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS firm_audit_trail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL, -- Login, Upload, Delete, Edit, Approval, Export, AI Recommendation
        client_id TEXT,
        document_id TEXT,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # 7. Knowledge SOP Repository Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS firm_knowledge_base (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL, -- SOP, Checklist, Templates, Working Papers, Reference
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # 8. Notifications Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS firm_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT DEFAULT 'info', -- alert, success, info, warning
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # Seed Default Firm Profile if empty
    cursor.execute("SELECT COUNT(*) as c FROM firm_profile")
    if cursor.fetchone()["c"] == 0:
        default_profile = [
            ("firm_name", "Mehta & Sen Associates"),
            ("registration_no", "FRN-108272W"),
            ("address", "801, Nariman Point, Mumbai, Maharashtra - 400021"),
            ("contact", "+91 22 4589 1192"),
            ("logo_url", "/assets/logo.png")
        ]
        cursor.executemany("INSERT INTO firm_profile (key, value) VALUES (?, ?)", default_profile)

    # Seed Default Staff Directory if empty
    cursor.execute("SELECT COUNT(*) as c FROM firm_staff")
    if cursor.fetchone()["c"] == 0:
        default_staff = [
            ("staff-1", "A. K. Mehta", "Managing Partner", "mehta@mehtasen.com", "Mumbai Head Office", json.dumps(["Manage Users", "Approve Reports", "Configure Rules", "Delete Files", "Upload Documents"]), None, 0),
            ("staff-2", "Aditya Sen", "Partner", "sen@mehtasen.com", "Mumbai Head Office", json.dumps(["Approve Reports", "Export Reports", "Upload Documents"]), None, 0),
            ("staff-3", "Ravi Verma", "Senior Auditor", "ravi@mehtasen.com", "Pune Branch", json.dumps(["Edit Ledger", "Export Reports", "Upload Documents"]), None, 0),
            ("staff-4", "S. Sharma", "Article Assistant", "sharma@mehtasen.com", "Pune Branch", json.dumps(["Upload Documents", "Edit Ledger"]), None, 0)
        ]
        cursor.executemany("INSERT INTO firm_staff (id, name, role, email, branch, permissions, password_hash, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", default_staff)

    # ── Seed Super-Admin account (idempotent) ─────────────────────────────────
    ADMIN_EMAIL = "anandhuabhi112@gmail.com"
    ADMIN_PASSWORD = "Anandu@2006"
    cursor.execute("SELECT id FROM firm_staff WHERE email = ?", (ADMIN_EMAIL,))
    existing_admin = cursor.fetchone()
    if existing_admin:
        # Update existing row to ensure it has admin flag + password hash
        cursor.execute(
            "UPDATE firm_staff SET is_admin = 1, password_hash = ? WHERE email = ?",
            (hash_password(ADMIN_PASSWORD), ADMIN_EMAIL)
        )
    else:
        admin_hash = hash_password(ADMIN_PASSWORD)
        all_permissions = json.dumps([
            "Manage Users", "Approve Reports", "Configure Rules",
            "Delete Files", "Upload Documents", "Edit Ledger",
            "Export Reports", "System Settings", "View Audit Trail"
        ])
        cursor.execute(
            "INSERT INTO firm_staff (id, name, role, email, branch, permissions, password_hash, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("admin-1", "Anandu G", "Super Admin", ADMIN_EMAIL, "Head Office", all_permissions, admin_hash, 1)
        )
    logger.info(f"Admin account seeded/verified: {ADMIN_EMAIL}")

    # Seed Default Compliance Dates if empty
    cursor.execute("SELECT COUNT(*) as c FROM firm_compliance_dates")
    if cursor.fetchone()["c"] == 0:
        default_dates = [
            ("date-1", "GSTR-1 Monthly Filing", "2026-08-11", "GST", "Filing of outward supplies for July 2026"),
            ("date-2", "GSTR-3B Monthly Filing", "2026-08-20", "GST", "Summary return and payment of tax for July 2026"),
            ("date-3", "TDS Deposit (Challan 281)", "2026-08-07", "TDS", "TDS deduction deposit for July 2026"),
            ("date-4", "Income Tax Audit Filing", "2026-09-30", "Income Tax", "Tax audit reporting under Section 44AB")
        ]
        cursor.executemany("INSERT INTO firm_compliance_dates (id, title, due_date, category, description) VALUES (?, ?, ?, ?, ?)", default_dates)

    # Seed SOP Knowledge Base if empty
    cursor.execute("SELECT COUNT(*) as c FROM firm_knowledge_base")
    if cursor.fetchone()["c"] == 0:
        default_sop = [
            ("sop-1", "SOP for GST ITC Verification", "SOP", "1. Open GST Reconciliation. 2. Verify unmatched ledger entries. 3. Check for Rule 36(4) caps. 4. Flag GSTR-2B mismatches."),
            ("sop-2", "SOP for Bank Reconciliation", "SOP", "1. Load statement. 2. Verify NEFT/RTGS payments match references. 3. Check cash disallowances under 40A(3)."),
            ("sop-3", "Working Paper - Cash Verification Template", "Working Papers", "Standard cash book ledger checking program checklist.")
        ]
        cursor.executemany("INSERT INTO firm_knowledge_base (id, title, category, content) VALUES (?, ?, ?, ?)", default_sop)

    # Seed Tasks if empty
    cursor.execute("SELECT COUNT(*) as c FROM firm_tasks")
    if cursor.fetchone()["c"] == 0:
        default_tasks = [
            ("task-1", "client-1", "SBI Bank Reconciliation", "Verify ledger matching with SBI statement Q1", "Bank Reconciliation", "staff-3", "2026-08-15", "High", "In Progress"),
            ("task-2", "client-1", "Section 40A(3) Cash Review", "Scan cash account for transactions > 10k", "Audit", "staff-4", "2026-08-10", "High", "Pending")
        ]
        cursor.executemany("INSERT INTO firm_tasks (id, client_id, title, description, task_type, owner_id, due_date, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", default_tasks)

    conn.commit()
    conn.close()

try:
    init_firm_schema()
except Exception as e:
    logger.warning(f"Firm schema init warning: {e}")


# ── Authentication Endpoints ──────────────────────────────────────────────────

@router.post("/auth/login")
async def login(
    email: str = Form(...),
    password: str = Form(...)
):
    """Authenticate a staff member and return their profile."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM firm_staff WHERE email = ? AND status = 'Active'", (email,))
    staff = cursor.fetchone()
    conn.close()

    if not staff:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    password_hash = staff["password_hash"]
    if not password_hash or not verify_password(password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    profile = {
        "id": staff["id"],
        "name": staff["name"],
        "email": staff["email"],
        "role": staff["role"],
        "branch": staff["branch"],
        "is_admin": bool(staff["is_admin"]),
        "permissions": json.loads(staff["permissions"] or "[]"),
    }
    token = create_access_token({"sub": staff["email"], "role": staff["role"], "is_admin": bool(staff["is_admin"])})
    return {"access_token": token, "token_type": "bearer", "user": profile}


@router.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None)):
    """Return staff profile from JWT token (for session restoration)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    email = payload.get("sub")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM firm_staff WHERE email = ?", (email,))
    staff = cursor.fetchone()
    conn.close()
    if not staff:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": staff["id"],
        "name": staff["name"],
        "email": staff["email"],
        "role": staff["role"],
        "branch": staff["branch"],
        "is_admin": bool(staff["is_admin"]),
        "permissions": json.loads(staff["permissions"] or "[]"),
    }


@router.post("/auth/set-password")
async def set_password(
    email: str = Form(...),
    current_password: str = Form(...),
    new_password: str = Form(...)
):
    """Allow a staff member to change their own password."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM firm_staff WHERE email = ?", (email,))
    staff = cursor.fetchone()
    if not staff:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    if staff["password_hash"] and not verify_password(current_password, staff["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Current password incorrect")
    cursor.execute(
        "UPDATE firm_staff SET password_hash = ? WHERE email = ?",
        (hash_password(new_password), email)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Password updated successfully"}


# ── Profile & Workspace API ──────────────────────────────────────────────────

@router.get("/profile")
async def get_profile():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM firm_profile")
    rows = cursor.fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

@router.post("/profile")
async def update_profile(
    firm_name: str = Form(...),
    registration_no: str = Form(...),
    address: str = Form(...),
    contact: str = Form(...)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE firm_profile SET value = ? WHERE key = 'firm_name'", (firm_name,))
    cursor.execute("UPDATE firm_profile SET value = ? WHERE key = 'registration_no'", (registration_no,))
    cursor.execute("UPDATE firm_profile SET value = ? WHERE key = 'address'", (address,))
    cursor.execute("UPDATE firm_profile SET value = ? WHERE key = 'contact'", (contact,))
    conn.commit()
    conn.close()
    return {"success": True}


# ── User Directory & RBAC Permissions ─────────────────────────────────────────

@router.get("/staff")
async def list_staff():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM firm_staff ORDER BY role ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.post("/staff")
async def add_staff(
    name: str = Form(...),
    role: str = Form(...),
    email: str = Form(...),
    branch: str = Form(default="Mumbai Head Office"),
    permissions_json: str = Form(default="[]")
):
    conn = get_db_connection()
    cursor = conn.cursor()
    staff_id = f"staff-{str(uuid.uuid4())[:8]}"
    cursor.execute(
        "INSERT INTO firm_staff (id, name, role, email, branch, permissions) VALUES (?, ?, ?, ?, ?, ?)",
        (staff_id, name, role, email, branch, permissions_json)
    )
    conn.commit()
    conn.close()
    return {"id": staff_id, "name": name, "role": role, "email": email}


# ── Task Management & Review Workflow ─────────────────────────────────────────

@router.get("/tasks")
async def get_tasks(client_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if client_id:
        cursor.execute("SELECT * FROM firm_tasks WHERE client_id = ? ORDER BY due_date ASC", (client_id,))
    else:
        cursor.execute("SELECT * FROM firm_tasks ORDER BY due_date ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.post("/tasks")
async def create_task(
    client_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    task_type: str = Form(...),
    owner_id: str = Form(...),
    due_date: str = Form(...),
    priority: str = Form(default="Medium")
):
    conn = get_db_connection()
    cursor = conn.cursor()
    task_id = f"task-{str(uuid.uuid4())[:8]}"
    cursor.execute("""
        INSERT INTO firm_tasks (id, client_id, title, description, task_type, owner_id, due_date, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    """, (task_id, client_id, title, description, task_type, owner_id, due_date, priority))
    conn.commit()
    conn.close()
    return {"id": task_id, "title": title}

@router.post("/tasks/{task_id}/comments")
async def add_task_comment(task_id: str, author: str = Form(...), text: str = Form(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT comments FROM firm_tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    comments = json.loads(row["comments"] or "[]")
    comments.append({
        "author": author,
        "text": text,
        "timestamp": datetime.now().isoformat()
    })

    cursor.execute("UPDATE firm_tasks SET comments = ? WHERE id = ?", (json.dumps(comments), task_id))
    conn.commit()
    conn.close()
    return {"success": True, "comments": comments}

@router.post("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str = Form(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE firm_tasks SET status = ? WHERE id = ?", (status, task_id))
    conn.commit()
    conn.close()
    return {"success": True}


# ── Approvals Queue ──────────────────────────────────────────────────────────

@router.get("/approvals")
async def list_approvals():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.*, c.name as clientName, t.title as taskTitle
        FROM firm_approvals a
        JOIN clients c ON a.client_id = c.id
        LEFT JOIN firm_tasks t ON a.task_id = t.id
        ORDER BY a.updated_at DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.post("/approvals")
async def add_to_approval_queue(
    client_id: str = Form(...),
    task_id: Optional[str] = Form(None),
    document_id: Optional[str] = Form(None),
    stage: str = Form(...),
    assigned_to: Optional[str] = Form(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    approval_id = f"app-{str(uuid.uuid4())[:8]}"
    cursor.execute("""
        INSERT INTO firm_approvals (id, task_id, client_id, document_id, stage, assigned_to)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (approval_id, task_id, client_id, document_id, stage, assigned_to))
    conn.commit()
    conn.close()
    return {"id": approval_id}

@router.post("/approvals/{approval_id}/action")
async def approval_action(
    approval_id: str,
    action: str = Form(...), # Approved, Rejected, Needs Clarification
    notes: Optional[str] = Form(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE firm_approvals SET status = ?, reviewer_notes = ?, updated_at = datetime('now') WHERE id = ?", (action, notes, approval_id))
    conn.commit()
    conn.close()
    return {"success": True}


# ── Calendar & compliance deadlines ───────────────────────────────────────────

@router.get("/compliance")
async def list_compliance():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM firm_compliance_dates ORDER BY due_date ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


# ── SOP Knowledge Center ──────────────────────────────────────────────────────

@router.get("/knowledge")
async def get_knowledge(search: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if search:
        cursor.execute("SELECT * FROM firm_knowledge_base WHERE title LIKE ? OR content LIKE ?", (f"%{search}%", f"%{search}%"))
    else:
        cursor.execute("SELECT * FROM firm_knowledge_base")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


# ── Performance Dashboard ─────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_firm_dashboard(client_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Counts
    cursor.execute("SELECT COUNT(*) as c FROM clients")
    active_clients = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM firm_tasks WHERE status != 'Completed'")
    open_tasks = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM firm_approvals WHERE status = 'Pending'")
    pending_reviews = cursor.fetchone()["c"]

    # Deadlines count
    cursor.execute("SELECT COUNT(*) as c FROM firm_compliance_dates")
    compliance_count = cursor.fetchone()["c"]

    # Audit Trail
    cursor.execute("SELECT * FROM firm_audit_trail ORDER BY created_at DESC LIMIT 20")
    audit_trail = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "active_clients": active_clients,
        "open_tasks": open_tasks,
        "pending_reviews": pending_reviews,
        "compliance_count": compliance_count,
        "audit_trail": audit_trail
    }


# ── Audit Trail Log ───────────────────────────────────────────────────────────

@router.post("/audit-log")
async def log_firm_action(
    user_name: str = Form(...),
    action: str = Form(...),
    client_id: Optional[str] = Form(None),
    document_id: Optional[str] = Form(None),
    details: Optional[str] = Form(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO firm_audit_trail (user_name, action, client_id, document_id, details) VALUES (?, ?, ?, ?, ?)",
        (user_name, action, client_id, document_id, details)
    )
    conn.commit()
    conn.close()
    return {"success": True}


# ── Notifications API ─────────────────────────────────────────────────────────

@router.get("/notifications")
async def get_notifications(user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM firm_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", (user_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
