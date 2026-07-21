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
import os
import uuid
import sqlite3
import bcrypt
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Form, HTTPException, Query, Header
from loguru import logger
from jose import jwt, JWTError

from database.db import get_db_connection, log_audit_event

router = APIRouter(prefix="/firm", tags=["CA Firm Management"])

# ── Auth helpers ──────────────────────────────────────────────────────────────

def _load_jwt_secret() -> str:
    # 1. Environment variable (production)
    env_secret = os.environ.get('JWT_SECRET')
    if env_secret and len(env_secret) >= 32:
        return env_secret
    # 2. Persistent file-based secret (dev/local)
    secret_file = Path(__file__).parent.parent.parent / 'database' / '.jwt_secret'
    if secret_file.exists():
        s = secret_file.read_text().strip()
        if len(s) >= 32:
            return s
    import secrets as _secrets
    generated = _secrets.token_hex(32)
    secret_file.parent.mkdir(parents=True, exist_ok=True)
    secret_file.write_text(generated)
    logger.warning('JWT secret generated and saved to disk. Set JWT_SECRET env var in production.')
    return generated

JWT_SECRET = _load_jwt_secret()
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

def _require_admin(authorization: Optional[str]):
    """Decode JWT and enforce admin role."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    token = authorization.split(' ', 1)[1]
    payload = decode_token(token)
    if not payload.get('is_admin'):
        raise HTTPException(status_code=403, detail='Admin access required')
    return payload

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
    log_audit_event(
        module='auth',
        action='login',
        status='success',
        detail=f'User {email} logged in',
        user_id=str(staff["id"]),
        user_name=staff["name"],
    )
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


# ── Audit Logs API ────────────────────────────────────────────────────────────

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    module: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    client_id: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
):
    """Retrieve paginated, filterable audit logs."""
    _require_admin(authorization)
    conn = get_db_connection()
    clauses = []
    params = []
    if module:
        clauses.append("module = ?")
        params.append(module)
    if user_id:
        clauses.append("user_id = ?")
        params.append(user_id)
    if client_id:
        clauses.append("client_id = ?")
        params.append(client_id)
    if search:
        clauses.append("(action LIKE ? OR detail LIKE ? OR user_name LIKE ?)")
        like = f"%{search}%"
        params.extend([like, like, like])
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = conn.execute(
        f"SELECT * FROM audit_logs {where} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    total = conn.execute(f"SELECT COUNT(*) FROM audit_logs {where}", params).fetchone()[0]
    conn.close()
    return {"total": total, "logs": [dict(r) for r in rows]}


# ── Global Search ──────────────────────────────────────────────────────────

@router.get("/search")
def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(default=20, le=100),
    authorization: Optional[str] = Header(default=None),
):
    """
    Global search across clients, tasks, compliance deadlines, audit findings,
    users, and audit trail.
    Returns grouped results by entity type.
    """
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    token = authorization.split(' ', 1)[1]
    decode_token(token)  # validate

    like = f"%{q}%"
    conn = get_db_connection()
    results = {}

    # Clients
    rows = conn.execute(
        "SELECT id, name, 'client' as type FROM clients WHERE name LIKE ? LIMIT ?",
        (like, limit)
    ).fetchall()
    if rows:
        results['clients'] = [dict(r) for r in rows]

    # Tasks (if table exists)
    try:
        rows = conn.execute(
            """SELECT id, title as name, status, task_type, 'task' as type
               FROM tasks WHERE title LIKE ? OR description LIKE ? LIMIT ?""",
            (like, like, limit)
        ).fetchall()
        if rows:
            results['tasks'] = [dict(r) for r in rows]
    except Exception:
        pass

    # Audit findings
    try:
        rows = conn.execute(
            """SELECT id, title as name, severity, status, 'audit_finding' as type
               FROM audit_findings WHERE title LIKE ? OR description LIKE ? LIMIT ?""",
            (like, like, limit)
        ).fetchall()
        if rows:
            results['audit_findings'] = [dict(r) for r in rows]
    except Exception:
        pass

    # Compliance deadlines
    try:
        rows = conn.execute(
            """SELECT id, compliance_type as name, due_date, status, 'compliance' as type
               FROM client_compliance_deadlines WHERE compliance_type LIKE ? LIMIT ?""",
            (like, limit)
        ).fetchall()
        if rows:
            results['compliance'] = [dict(r) for r in rows]
    except Exception:
        pass

    # Users
    try:
        rows = conn.execute(
            """SELECT id, name, email, role, 'user' as type
               FROM users WHERE name LIKE ? OR email LIKE ? LIMIT ?""",
            (like, like, limit)
        ).fetchall()
        if rows:
            results['users'] = [dict(r) for r in rows]
    except Exception:
        pass

    # Vouchers
    try:
        rows = conn.execute(
            """SELECT id, voucher_number as name, voucher_type, approval_status, 'voucher' as type
               FROM vouchers WHERE voucher_number LIKE ? OR narration LIKE ? LIMIT ?""",
            (like, like, limit)
        ).fetchall()
        if rows:
            results['vouchers'] = [dict(r) for r in rows]
    except Exception:
        pass

    conn.close()
    total = sum(len(v) for v in results.values())
    return {"query": q, "total": total, "results": results}


# ── Diagnostic Report ─────────────────────────────────────────────────────────

@router.get("/diagnostics")
def get_diagnostics(
    authorization: Optional[str] = Header(default=None),
):
    """Generate a full diagnostic report for support and troubleshooting."""
    _require_admin(authorization)

    import sys, platform
    conn = get_db_connection()
    tables = {}
    try:
        table_names = [
            'clients', 'bank_transactions', 'ledger_entries', 'gst_invoices',
            'audit_trail', 'audit_findings', 'audit_logs', 'vouchers',
            'users', 'tasks',
        ]
        for t in table_names:
            try:
                row = conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()
                tables[t] = row[0] if row else 0
            except Exception:
                tables[t] = 'N/A'
    finally:
        conn.close()

    recent_errors = []
    try:
        c2 = get_db_connection()
        rows = c2.execute(
            "SELECT timestamp, module, action, detail FROM audit_logs "
            "WHERE status='error' ORDER BY timestamp DESC LIMIT 20"
        ).fetchall()
        recent_errors = [dict(r) for r in rows]
        c2.close()
    except Exception:
        pass

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "python": sys.version,
        "platform": platform.platform(),
        "table_counts": tables,
        "recent_errors": recent_errors,
    }


# ── Document Versioning ─────────────────────────────────────────────────────────

@router.get("/documents/{document_id}/versions")
def get_document_versions(
    document_id: str,
    authorization: Optional[str] = Header(default=None),
):
    """Return all saved versions of a document."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    from database.db import get_document_versions as _get_versions
    return {"document_id": document_id, "versions": _get_versions(document_id)}


@router.post("/documents/{document_id}/versions")
def create_document_version(
    document_id: str,
    document_name: str = Form(...),
    document_type: str = Form(default=''),
    confidence: str = Form(default=''),
    notes: str = Form(default=''),
    client_id: str = Form(default=None),
    authorization: Optional[str] = Header(default=None),
):
    """Manually create a new version snapshot for a document."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    payload = decode_token(authorization.split(' ', 1)[1])
    from database.db import save_document_version
    version = save_document_version(
        document_id=document_id,
        document_name=document_name,
        document_type=document_type,
        confidence=confidence or None,
        created_by=payload.get('name') or payload.get('sub'),
        client_id=client_id,
        notes=notes or None,
    )
    if not version:
        raise HTTPException(status_code=500, detail='Failed to save version')
    return {"document_id": document_id, "version_number": version, "success": True}


# ── Accounting Integrity APIs ─────────────────────────────────────────────────

@router.post("/integrity/double-entry")
def api_double_entry(
    entries: List[Dict[str, Any]],
    authorization: Optional[str] = Header(default=None),
):
    """Validate that a set of journal entries balance (debits == credits)."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    from processors.accounting_integrity import validate_double_entry
    result = validate_double_entry(entries)
    return {
        'valid': result.valid,
        'total_debit': float(result.total_debit),
        'total_credit': float(result.total_credit),
        'difference': float(result.difference),
        'errors': result.errors,
        'warnings': result.warnings,
    }


@router.get("/integrity/trial-balance")
def api_trial_balance(
    client_id: str = Query(...),
    authorization: Optional[str] = Header(default=None),
):
    """Compute trial balance for a client from ledger entries."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    from processors.accounting_integrity import verify_trial_balance
    result = verify_trial_balance(client_id)
    return {
        'balanced': result.balanced,
        'total_debit': float(result.total_debit),
        'total_credit': float(result.total_credit),
        'difference': float(result.difference),
        'ledger_balances': {k: {kk: float(vv) for kk, vv in v.items()} for k, v in result.ledger_balances.items()},
        'errors': result.errors,
    }


@router.post("/integrity/check-duplicate-voucher")
def api_check_duplicate_voucher(
    client_id: str = Form(...),
    voucher_number: str = Form(...),
    voucher_type: str = Form(...),
    date: str = Form(...),
    amount: float = Form(...),
    exclude_id: Optional[str] = Form(default=None),
    authorization: Optional[str] = Header(default=None),
):
    """Check if a voucher is a duplicate before saving."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    from processors.accounting_integrity import check_duplicate_voucher
    result = check_duplicate_voucher(client_id, voucher_number, voucher_type, date, amount, exclude_id)
    return {
        'is_duplicate': result.is_duplicate,
        'duplicate_ids': result.duplicate_ids,
        'match_reason': result.match_reason,
    }


@router.get("/integrity/voucher-sequence")
def api_voucher_sequence(
    client_id: str = Query(...),
    voucher_type: str = Query(...),
    authorization: Optional[str] = Header(default=None),
):
    """Validate voucher number sequence for gaps and duplicates."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    from processors.accounting_integrity import validate_voucher_sequence
    result = validate_voucher_sequence(client_id, voucher_type)
    return {
        'valid': result.valid,
        'gaps': result.gaps,
        'duplicates': result.duplicates,
        'errors': result.errors,
    }


@router.get("/integrity/ledger-balance")
def api_ledger_balance(
    client_id: str = Query(...),
    ledger_type: str = Query(...),
    authorization: Optional[str] = Header(default=None),
):
    """Reconcile computed vs stated running balances in a ledger."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    from processors.accounting_integrity import reconcile_ledger_balance
    return reconcile_ledger_balance(client_id, ledger_type)


# ── AI Governance APIs ────────────────────────────────────────────────────────

@router.get("/ai-governance/logs")
def get_ai_governance_logs(
    task_type: Optional[str] = Query(default=None),
    client_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    authorization: Optional[str] = Header(default=None),
):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    from processors.ai_governance import get_governance_logs
    return get_governance_logs(task_type=task_type, client_id=client_id, limit=limit, offset=offset)


@router.post("/ai-governance/override")
def record_ai_override(
    log_id: str = Form(...),
    reason: str = Form(...),
    authorization: Optional[str] = Header(default=None),
):
    """Record that a user overrode an AI recommendation."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    payload = decode_token(authorization.split(' ', 1)[1])
    conn = get_db_connection()
    conn.execute(
        "UPDATE ai_governance_logs SET user_override=1, override_reason=? WHERE id=?",
        (reason, log_id)
    )
    conn.commit()
    conn.close()
    from database.db import log_audit_event
    log_audit_event(module='ai_governance', action='user_override',
                    detail=f'Log {log_id}: {reason}', user_id=payload.get('sub'))
    return {"success": True}


@router.post("/ai-governance/approve")
def approve_ai_output(
    log_id: str = Form(...),
    authorization: Optional[str] = Header(default=None),
):
    """Mark an AI output as reviewed and approved."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    payload = decode_token(authorization.split(' ', 1)[1])
    now = datetime.utcnow().isoformat()
    conn = get_db_connection()
    conn.execute(
        "UPDATE ai_governance_logs SET final_approved=1, approved_by=?, approved_at=? WHERE id=?",
        (payload.get('name') or payload.get('sub'), now, log_id)
    )
    conn.commit()
    conn.close()
    return {"success": True, "approved_at": now}


# ── Workflow Engine APIs ─────────────────────────────────────────────────────

@router.get("/workflows/templates")
def list_workflow_templates(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM workflow_templates WHERE is_active=1').fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/workflows/start")
def start_workflow(
    entity_type: str = Form(...),
    entity_id: str = Form(...),
    title: str = Form(...),
    template_id: str = Form(default='wf-invoice-approval'),
    client_id: Optional[str] = Form(default=None),
    due_date: Optional[str] = Form(default=None),
    priority: str = Form(default='medium'),
    authorization: Optional[str] = Header(default=None),
):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    payload = decode_token(authorization.split(' ', 1)[1])
    from processors.workflow_engine import create_workflow
    instance_id = create_workflow(
        entity_type=entity_type, entity_id=entity_id, title=title,
        template_id=template_id, client_id=client_id,
        started_by=payload.get('name') or payload.get('sub'),
        due_date=due_date, priority=priority,
    )
    return {'instance_id': instance_id, 'success': True}


@router.post("/workflows/{instance_id}/action")
def workflow_action(
    instance_id: str,
    action: str = Form(...),
    comments: str = Form(default=''),
    authorization: Optional[str] = Header(default=None),
):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    payload = decode_token(authorization.split(' ', 1)[1])
    from processors.workflow_engine import advance_workflow
    try:
        updated = advance_workflow(
            instance_id=instance_id, action=action,
            acted_by=payload.get('name') or payload.get('sub'),
            comments=comments,
        )
        return {'success': True, 'instance': updated}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/workflows/{instance_id}")
def get_workflow(
    instance_id: str,
    authorization: Optional[str] = Header(default=None),
):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    from processors.workflow_engine import get_workflow_instance
    inst = get_workflow_instance(instance_id)
    if not inst:
        raise HTTPException(status_code=404, detail='Workflow instance not found')
    return inst


@router.get("/workflows")
def list_workflows(
    client_id: Optional[str] = Query(default=None),
    entity_type: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authentication required')
    decode_token(authorization.split(' ', 1)[1])
    from processors.workflow_engine import get_pending_workflows
    return get_pending_workflows(client_id=client_id, entity_type=entity_type)
