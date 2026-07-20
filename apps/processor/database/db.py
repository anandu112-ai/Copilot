"""
SQLite Database and Schema Management for CA Copilot Reconciliation Engine.
"""
import sqlite3
import json
from pathlib import Path
from loguru import logger
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "reconciliation.db"

def get_db_connection() -> sqlite3.Connection:
    """Get a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initialize the SQLite database and create all tables if they do not exist."""
    logger.info(f"Initializing database at: {DB_PATH}")
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Clients Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # 2. Bank Transactions Table
    # Stores bank statement rows
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bank_transactions (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        bank_name TEXT,
        account_number TEXT,
        date TEXT,
        value_date TEXT,
        narration TEXT,
        reference_number TEXT,
        cheque_number TEXT,
        debit REAL DEFAULT 0.0,
        credit REAL DEFAULT 0.0,
        balance REAL DEFAULT 0.0,
        transaction_type TEXT, -- 'credit' or 'debit'
        payment_mode TEXT, -- UPI, NEFT, RTGS, IMPS, CHEQUE, CASH, INTEREST, CHARGES, etc.
        category TEXT, -- Salary, GST Payment, Vendor Payment, etc.
        status TEXT DEFAULT 'unmatched', -- unmatched, matched, pending_review
        audit_flag TEXT,
        matched_ledger_id TEXT, -- foreign reference to ledger_entries if matched
        match_score REAL,
        match_reason TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # 3. Ledger Entries Table
    # Stores cash book, sales register, purchase register, bank ledger, etc.
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        ledger_type TEXT NOT NULL, -- purchase, sales, cash, bank, general
        date TEXT,
        description TEXT,
        reference_number TEXT,
        debit REAL DEFAULT 0.0,
        credit REAL DEFAULT 0.0,
        balance REAL DEFAULT 0.0,
        gstin TEXT,
        invoice_number TEXT,
        amount_taxable REAL DEFAULT 0.0,
        cgst REAL DEFAULT 0.0,
        sgst REAL DEFAULT 0.0,
        igst REAL DEFAULT 0.0,
        cess REAL DEFAULT 0.0,
        total_amount REAL DEFAULT 0.0,
        status TEXT DEFAULT 'unmatched', -- unmatched, matched, pending_review
        matched_txn_id TEXT, -- matches either bank_transactions.id or other ledger_entries.id
        match_score REAL,
        match_reason TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # 4. GST Invoices Table
    # Stores GSTR-1, GSTR-2B, GSTR-3B records
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gst_invoices (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        source_type TEXT NOT NULL, -- gstr-1, gstr-2b, gstr-3b
        gstin TEXT,
        vendor_name TEXT,
        invoice_number TEXT,
        invoice_date TEXT,
        taxable_value REAL DEFAULT 0.0,
        cgst REAL DEFAULT 0.0,
        sgst REAL DEFAULT 0.0,
        igst REAL DEFAULT 0.0,
        cess REAL DEFAULT 0.0,
        total_amount REAL DEFAULT 0.0,
        hsn_sac TEXT,
        status TEXT DEFAULT 'unmatched', -- unmatched, matched, pending_review
        matched_ledger_id TEXT, -- references ledger_entries.id
        match_score REAL,
        match_reason TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # 5. Audit Trail Table
    # Record manual actions (accept match, reject match, edit, notes)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_trail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        action TEXT NOT NULL, -- accept_match, reject_match, merge_records, edit_data, add_notes
        module TEXT NOT NULL, -- bank, gst, ledger
        record_id_1 TEXT NOT NULL,
        record_id_2 TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        user_decision TEXT,
        notes TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # 6. Metadata/Settings Table (For tracking processing times, configurations, etc.)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    # 7. Audit Rules Table (Custom configurable audit rules)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_rules (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        target_field TEXT,
        condition_operator TEXT,
        condition_value TEXT,
        severity TEXT,
        is_enabled INTEGER DEFAULT 1
    )
    """)

    # 8. Audit Findings Table (AI Observations and Risks)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_findings (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT,
        category TEXT,
        severity TEXT, -- Critical, High, Medium, Low, Info
        status TEXT DEFAULT 'Open', -- Open, Resolved, Reviewed
        description TEXT,
        evidence TEXT,
        legal_reference TEXT,
        recommended_action TEXT,
        impact_amount REAL DEFAULT 0.0,
        risk_score REAL DEFAULT 0.0,
        notes TEXT,
        detected_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # Seed default audit rules if not already present
    cursor.execute("SELECT count(*) FROM audit_rules")
    if cursor.fetchone()[0] == 0:
        default_rules = [
            ("rule-1", "High Value Payments", "Flag payments above ₹5,00,000", "debit", ">", "500000", "High", 1),
            ("rule-2", "Invalid GSTIN", "Warn if GSTIN format is invalid", "gstin", "is_invalid_format", "true", "High", 1),
            ("rule-3", "Invoices without PO", "Highlight invoices without purchase orders", "po", "is_empty", "true", "Medium", 1),
            ("rule-4", "Dormant Vendors", "Flag vendors inactive for more than one year", "vendor_status", "is_dormant", "1 year", "Medium", 1),
            ("rule-5", "Multiple Daily Vendor Payments", "Detect more than three payments to the same vendor on one day", "daily_payment_count", ">", "3", "High", 1),
            ("rule-6", "Section 40A(3) Cash Payment", "Flag cash payments exceeding ₹10,000 in a day", "cash_payment", ">", "10000", "Critical", 1)
        ]
        cursor.executemany("""
            INSERT INTO audit_rules (id, name, description, target_field, condition_operator, condition_value, severity, is_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, default_rules)

    # 9. AI Model Routing Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_model_routing (
        task_type TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model_name TEXT NOT NULL,
        confidence_threshold REAL DEFAULT 0.80,
        requires_approval INTEGER DEFAULT 1
    )
    """)

    # 10. Document Relations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_relations (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        source_doc_type TEXT NOT NULL,
        source_doc_id TEXT NOT NULL,
        target_doc_type TEXT NOT NULL,
        target_doc_id TEXT NOT NULL,
        relation_type TEXT DEFAULT 'supporting',
        confidence_score REAL DEFAULT 1.0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # 11. Client Groups Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS client_groups (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        group_name TEXT NOT NULL,
        parent_group TEXT,
        nature TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # 12. Client Cost Centres Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS client_cost_centres (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # 13. Inventory Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        sku TEXT,
        name TEXT NOT NULL,
        hsn_sac TEXT,
        uom TEXT,
        opening_qty REAL DEFAULT 0.0,
        opening_rate REAL DEFAULT 0.0,
        current_qty REAL DEFAULT 0.0,
        valuation_method TEXT DEFAULT 'FIFO',
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # 14. Vouchers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vouchers (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        voucher_number TEXT,
        voucher_type TEXT NOT NULL,
        date TEXT NOT NULL,
        ledger_name_debit TEXT NOT NULL,
        ledger_name_credit TEXT NOT NULL,
        amount REAL NOT NULL,
        narration TEXT,
        gst_rate REAL DEFAULT 0.0,
        hsn_sac TEXT,
        extracted_metadata TEXT,
        approval_status TEXT DEFAULT 'pending_junior',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # 15. Voucher Approval Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS voucher_approval_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_id TEXT NOT NULL,
        stage_from TEXT,
        stage_to TEXT,
        action_by TEXT NOT NULL,
        action_at TEXT DEFAULT (datetime('now')),
        comments TEXT,
        FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE
    )
    """)

    # 16. Client Compliance Deadlines Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS client_compliance_deadlines (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        compliance_type TEXT NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        assigned_user TEXT,
        last_checked TEXT,
        reference_law TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
    """)

    # Seed default model routing if not present
    cursor.execute("SELECT count(*) FROM ai_model_routing")
    if cursor.fetchone()[0] == 0:
        default_routings = [
            ("ocr", "tesseract", "Tesseract-OCR", 0.70, 0),
            ("invoice_extraction", "local_llama", "Llama-3-8B-Local", 0.85, 1),
            ("gst_analysis", "gemini_cloud", "Gemini-1.5-Pro", 0.90, 1),
            ("audit_reasoning", "gemini_cloud", "Gemini-1.5-Pro", 0.90, 1),
            ("chat", "local_llama", "Llama-3-8B-Local", 0.50, 0)
        ]
        cursor.executemany("""
            INSERT INTO ai_model_routing (task_type, provider, model_name, confidence_threshold, requires_approval)
            VALUES (?, ?, ?, ?, ?)
        """, default_routings)

    conn.commit()
    conn.close()
    logger.info("Database schema initialized successfully.")

# Run database initialization
init_db()
