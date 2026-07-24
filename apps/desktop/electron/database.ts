import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export class DatabaseManager {
  private db!: Database.Database
  private dbPath: string

  constructor() {
    const dataDir = path.join(app.getPath('userData'), 'data')
    fs.mkdirSync(dataDir, { recursive: true })
    this.dbPath = path.join(dataDir, 'ca-copilot.db')
  }

  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.runMigrations()
    console.log('[Database] Initialized at', this.dbPath)
  }

  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS conversion_history (
        id TEXT PRIMARY KEY,
        original_file_name TEXT NOT NULL,
        original_file_path TEXT,
        document_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('success', 'partial', 'failed')),
        output_path TEXT,
        warnings TEXT DEFAULT '[]',
        processing_duration_ms INTEGER,
        page_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_path TEXT,
        file_size INTEGER,
        document_type TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        business_name TEXT,
        client_type TEXT,
        pan TEXT,
        gstin TEXT,
        email TEXT,
        phone TEXT,
        financial_year TEXT,
        assigned_staff TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Module 1: Firm Workspace Table
      CREATE TABLE IF NOT EXISTS firm_details (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        registration TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        logo TEXT,
        letterhead TEXT,
        workspace_type TEXT, -- 'single', 'multi-partner', 'branch', 'department'
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Module 2: Users Table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        status TEXT DEFAULT 'active', -- 'active', 'inactive', 'locked'
        branch TEXT,
        department TEXT,
        password_hash TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Module 2: Roles Permissions Table
      CREATE TABLE IF NOT EXISTS roles_permissions (
        role TEXT,
        permission TEXT,
        enabled INTEGER DEFAULT 1,
        PRIMARY KEY (role, permission)
      );

      -- Phase 3: teams are local-first and can be synchronized by the existing queue.
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        leader_id TEXT,
        permissions TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS team_members (
        team_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        PRIMARY KEY (team_id, user_id),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS team_client_assignments (
        team_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        PRIMARY KEY (team_id, client_id),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );

      -- Module 4: Tasks Table
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        owner_id TEXT,
        owner_name TEXT,
        due_date TEXT,
        priority TEXT, -- 'low', 'medium', 'high', 'critical'
        status TEXT, -- 'pending', 'in_progress', 'review', 'completed'
        title TEXT NOT NULL,
        description TEXT,
        task_type TEXT, -- 'audit', 'gst', 'bank_reconciliation', 'it_return', 'document_collection', 'review'
        attachments TEXT, -- JSON array of file paths
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Module 6: Task Comments Table
      CREATE TABLE IF NOT EXISTS task_comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_role TEXT,
        comment_text TEXT NOT NULL,
        attachment_path TEXT,
        is_internal INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Module 5 & 8: Document Approvals Table
      CREATE TABLE IF NOT EXISTS document_approvals (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        step TEXT NOT NULL, -- 'uploaded', 'ai_processing', 'staff_review', 'senior_review', 'partner_approval', 'report_generation', 'delivery'
        status TEXT NOT NULL, -- 'pending', 'approved', 'rejected', 'needs_clarification'
        reviewer_name TEXT,
        reviewer_role TEXT,
        notes TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Module 7: Compliance Deadlines Table
      CREATE TABLE IF NOT EXISTS compliance_deadlines (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        deadline_date TEXT NOT NULL,
        category TEXT NOT NULL, -- 'GST', 'Income Tax', 'Audit', 'ROC', 'TDS', 'Custom'
        status TEXT DEFAULT 'upcoming', -- 'upcoming', 'overdue', 'completed'
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Module 8: Document Versions Table
      CREATE TABLE IF NOT EXISTS document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT DEFAULT (datetime('now'))
      );

      -- Module 10: Knowledge Repository Table
      CREATE TABLE IF NOT EXISTS knowledge_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL, -- 'template', 'sop', 'checklist', 'audit_program', 'working_paper', 'reference'
        content TEXT,
        file_path TEXT,
        tags TEXT, -- JSON array of strings
        created_by TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Module 9: Audit Trail Table
      CREATE TABLE IF NOT EXISTS audit_trail (
        id TEXT PRIMARY KEY,
        timestamp TEXT DEFAULT (datetime('now')),
        user_name TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL, -- 'login', 'upload', 'delete', 'edit', 'approval', 'export', 'ai_recommendation', 'manual_override'
        client_name TEXT,
        document_name TEXT,
        details TEXT
      );

      -- Module 14: Offline Collaboration Sync Log
      CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL, -- 'pull', 'push', 'resolve_conflict'
        timestamp TEXT DEFAULT (datetime('now')),
        status TEXT NOT NULL, -- 'success', 'failed', 'conflicts'
        conflicts_count INTEGER DEFAULT 0,
        description TEXT
      );

      -- Phase 7: AI Automation Rules Table
      CREATE TABLE IF NOT EXISTS ai_automation_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trigger_event TEXT NOT NULL,
        actions TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 7: AI Suggestions Table
      CREATE TABLE IF NOT EXISTS ai_suggestions (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        item_type TEXT NOT NULL, -- 'ledger', 'expense_category', 'vendor_mapping', 'gst_classification'
        original_value TEXT NOT NULL,
        suggested_value TEXT NOT NULL,
        confidence REAL NOT NULL,
        status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
        approved_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 7: AI Working Papers Table
      CREATE TABLE IF NOT EXISTS ai_working_papers (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        document_type TEXT NOT NULL, -- 'audit_checklist', 'working_paper', 'observation_note'
        title TEXT NOT NULL,
        generated_content TEXT NOT NULL,
        flagged_sections TEXT, -- JSON array identifying AI elements
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 7: AI Learning Records Table
      CREATE TABLE IF NOT EXISTS ai_learning_records (
        id TEXT PRIMARY KEY,
        pattern_type TEXT NOT NULL, -- 'vendor_naming', 'ledger_mapping', 'review_pattern'
        pattern_key TEXT NOT NULL,
        pattern_value TEXT NOT NULL,
        user_override INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 7: AI Pipeline Jobs Table
      CREATE TABLE IF NOT EXISTS ai_pipeline_jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
        steps TEXT NOT NULL, -- JSON array of steps
        current_step INTEGER DEFAULT 0,
        progress REAL DEFAULT 0,
        retry_count INTEGER DEFAULT 0,
        logs TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 7: AI QA Validation Flags Table
      CREATE TABLE IF NOT EXISTS ai_qa_flags (
        id TEXT PRIMARY KEY,
        file_id TEXT,
        file_name TEXT,
        check_type TEXT NOT NULL, -- 'ocr_quality', 'missing_fields', 'calculation_check', 'duplicate'
        message TEXT NOT NULL,
        confidence_score REAL,
        status TEXT DEFAULT 'flagged', -- 'flagged', 'resolved', 'ignored'
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Seed default settings
      INSERT OR IGNORE INTO app_settings (key, value) VALUES
        ('theme', 'dark'),
        ('defaultExportFolder', ''),
        ('ocrEnabled', 'true'),
        ('ocrLanguage', 'eng'),
        ('logLevel', 'info'),
        ('appVersion', '1.0.0');

      -- Seed default firm details
      INSERT OR IGNORE INTO firm_details (id, name, registration, address, phone, email, workspace_type) VALUES
        ('firm-1', 'Aditya Sen & Associates', 'FRN-102938W', 'Suite 405, Nariman Point, Mumbai, MH - 400021', '+91 22 2284 9011', 'office@adityasen.in', 'multi-partner');

      -- Seed default users
      INSERT OR IGNORE INTO users (id, name, email, role, status, branch, department, password_hash) VALUES
        ('user-1', 'CA Aditya Sen', 'aditya@adityasen.in', 'Managing Partner', 'active', 'Mumbai Head Office', 'Taxation & Audit', 'scrypt:admin123'),
        ('user-2', 'Ravi Verma', 'ravi.verma@adityasen.in', 'Senior Auditor', 'active', 'Mumbai Head Office', 'Audit', 'scrypt:ravi123'),
        ('user-3', 'S. Sharma', 's.sharma@adityasen.in', 'Junior Auditor', 'active', 'Mumbai Head Office', 'Audit', 'scrypt:sharma123'),
        ('user-4', 'Neha Gupta', 'neha.gupta@adityasen.in', 'Article Assistant', 'active', 'Mumbai Head Office', 'Taxation', 'scrypt:neha123'),
        ('user-5', 'Amit Patel', 'amit.patel@adityasen.in', 'Accountant', 'active', 'Pune Branch Office', 'Accounts', 'scrypt:amit123'),
        ('user-6', 'Priya Nair', 'priya.nair@adityasen.in', 'Read-Only Reviewer', 'active', 'Mumbai Head Office', 'Compliance', 'scrypt:priya123');

      -- Seed default role permissions (Enabled by default)
      INSERT OR IGNORE INTO roles_permissions (role, permission, enabled) VALUES
        ('Super Admin', 'Upload Documents', 1), ('Super Admin', 'Delete Files', 1), ('Super Admin', 'Edit Ledger', 1), ('Super Admin', 'Approve Reports', 1), ('Super Admin', 'Export Reports', 1), ('Super Admin', 'Configure Rules', 1), ('Super Admin', 'Manage Users', 1),
        ('Managing Partner', 'Upload Documents', 1), ('Managing Partner', 'Delete Files', 1), ('Managing Partner', 'Edit Ledger', 1), ('Managing Partner', 'Approve Reports', 1), ('Managing Partner', 'Export Reports', 1), ('Managing Partner', 'Configure Rules', 1), ('Managing Partner', 'Manage Users', 1),
        ('Partner', 'Upload Documents', 1), ('Partner', 'Delete Files', 0), ('Partner', 'Edit Ledger', 1), ('Partner', 'Approve Reports', 1), ('Partner', 'Export Reports', 1), ('Partner', 'Configure Rules', 1), ('Partner', 'Manage Users', 0),
        ('Senior Auditor', 'Upload Documents', 1), ('Senior Auditor', 'Delete Files', 0), ('Senior Auditor', 'Edit Ledger', 1), ('Senior Auditor', 'Approve Reports', 0), ('Senior Auditor', 'Export Reports', 1), ('Senior Auditor', 'Configure Rules', 0), ('Senior Auditor', 'Manage Users', 0),
        ('Junior Auditor', 'Upload Documents', 1), ('Junior Auditor', 'Delete Files', 0), ('Junior Auditor', 'Edit Ledger', 0), ('Junior Auditor', 'Approve Reports', 0), ('Junior Auditor', 'Export Reports', 0), ('Junior Auditor', 'Configure Rules', 0), ('Junior Auditor', 'Manage Users', 0),
        ('Article Assistant', 'Upload Documents', 1), ('Article Assistant', 'Delete Files', 0), ('Article Assistant', 'Edit Ledger', 0), ('Article Assistant', 'Approve Reports', 0), ('Article Assistant', 'Export Reports', 0), ('Article Assistant', 'Configure Rules', 0), ('Article Assistant', 'Manage Users', 0),
        ('Read-Only Reviewer', 'Upload Documents', 0), ('Read-Only Reviewer', 'Delete Files', 0), ('Read-Only Reviewer', 'Edit Ledger', 0), ('Read-Only Reviewer', 'Approve Reports', 0), ('Read-Only Reviewer', 'Export Reports', 0), ('Read-Only Reviewer', 'Configure Rules', 0), ('Read-Only Reviewer', 'Manage Users', 0);

      -- Seed default compliance deadlines (GST & Income Tax & ROC)
      INSERT OR IGNORE INTO compliance_deadlines (id, title, deadline_date, category, status, description) VALUES
        ('dl-1', 'GST GSTR-1 Return Filing', '2026-08-11', 'GST', 'upcoming', 'Monthly return for outward supplies (sales) for July 2026.'),
        ('dl-2', 'GST GSTR-3B Return Filing', '2026-08-20', 'GST', 'upcoming', 'Monthly return for summary supplies and tax payment for July 2026.'),
        ('dl-3', 'TDS Payment Deposit (Section 192-194)', '2026-08-07', 'TDS', 'upcoming', 'Challan deposit for tax deducted during July 2026.'),
        ('dl-4', 'Income Tax Return (ITR) Audited Corporate', '2026-10-31', 'Income Tax', 'upcoming', 'ITR filing deadline for corporate clients subject to Audit.'),
        ('dl-5', 'ROC AOC-4 Filing (Financial Statement)', '2026-10-30', 'ROC', 'upcoming', 'Annual filing of financial statements of company to registrar.');

      -- Seed default knowledge items
      INSERT OR IGNORE INTO knowledge_items (id, title, category, content, tags, created_by) VALUES
        ('ki-1', 'GST ITC Reconcilation Standard Operating Procedure', 'sop', 'This document outlines the step-by-step procedure for reconciling purchases ledger (Books) with GSTR-2B. Match items by invoice number, dates, and amounts within 1% rounding boundary. Flag unmatched supplier invoices in red.', '["gst", "itc", "sop"]', 'CA Aditya Sen'),
        ('ki-2', 'Standard Audit Checklist for Corporate Auditing', 'checklist', '1. Verify cash balances. 2. Inspect physical asset additions. 3. Reconcile bank ledgers with external bank statements. 4. Verify GSTR-1 vs sales ledger.', '["audit", "checklist", "corporate"]', 'CA Aditya Sen'),
        ('ki-3', 'Template - Working Paper for Bank Statement Reconciliation', 'working_paper', 'Columns: Date | Description | Ledger Ref | Debit (Books) | Credit (Books) | Debit (Bank) | Credit (Bank) | Reconciled Status | Auditor Comments', '["reconciliation", "template", "working-paper"]', 'Ravi Verma');

      -- Seed Phase 7 AI automation rules
      INSERT OR IGNORE INTO ai_automation_rules (id, name, trigger_event, actions, status) VALUES
        ('rule-1', 'Large Invoice Route', 'invoice_uploaded', '[{"type":"condition","field":"grandTotal","operator":">","value":"1000000"},{"type":"action","assign_user":"user-1"},{"type":"action","create_task":"Review Large Invoice"},{"type":"action","notify_role":"Partner"}]', 'active'),
        ('rule-2', 'GST Mismatch Router', 'gst_mismatch_detected', '[{"type":"condition","field":"mismatchAmount","operator":">","value":"50000"},{"type":"action","mark_priority":"high"},{"type":"action","create_task":"Investigate GST variance"},{"type":"action","generate_report":"exception"}]', 'active'),
        ('rule-3', 'Bank Statement Reconciler', 'bank_statement_imported', '[{"type":"action","extract_transactions":true},{"type":"action","categorize_ledger":true},{"type":"action","match_statement":true},{"type":"action","notify_user":"user-2"}]', 'active');

      -- Seed Phase 7 AI suggestions
      INSERT OR IGNORE INTO ai_suggestions (id, client_id, item_type, original_value, suggested_value, confidence) VALUES
        ('sug-1', 'client-1', 'ledger', 'Salary payments July', 'Salaries & Wages Expense A/c', 0.94),
        ('sug-2', 'client-1', 'vendor_mapping', 'APEX STEEL IND', 'Apex Steel Industries Pvt Ltd', 0.98),
        ('sug-3', 'client-2', 'expense_category', 'Fuel charges invoice #82', 'Travel & Fuel Expenses', 0.89),
        ('sug-4', 'client-3', 'gst_classification', 'Consulting fees', 'SAC 9983 - Professional Services (18% GST)', 0.92);

      -- Seed Phase 7 AI working papers
      INSERT OR IGNORE INTO ai_working_papers (id, client_id, document_type, title, generated_content, flagged_sections) VALUES
        ('wp-1', 'client-1', 'audit_checklist', 'Statutory Audit Checklist (AI-Generated)', '# Statutory Audit Checklist\n\n* [x] **Verification of Fixed Assets:** Checked machinery log assets added in Q1. (Evidence: PDF Invoice #9842)\n* [ ] **Cash Count Verification:** Require human audit verification of petty cash ledger balances.\n* [x] [AI-GENERATED] **GST Return vs Sales Ledger:** Reconciled GSTR-1 sales values. Found 100% boundary check match.\n\n*Note: Sections tagged as [AI-GENERATED] represent machine processing predictions. Validate prior to sign-off.*', '["GST Return vs Sales Ledger"]'),
        ('wp-2', 'client-2', 'working_paper', 'Bank Reconciliation Working Paper (AI-Generated)', '# Bank Reconciliation Ledger Verification\n\n* **Client Name:** MGM Logistics Services\n* **Period:** June 2026\n* **Difference Found:** ₹14,821 (Unmatched Bank Charges)\n* [AI-GENERATED] **Exception Notes:** Statement entry "CHG/ATM/INT" matching auto-mapped to ledger "Bank Charges & Interest A/c" based on historical naming pattern. Confidence 94%.\n\n*Human review recommended.*', '["Exception Notes"]');

      -- Seed Phase 7 AI QA flags
      INSERT OR IGNORE INTO ai_qa_flags (id, file_id, file_name, check_type, message, confidence_score, status) VALUES
        ('qa-1', 'doc-1', 'Apex_Q1_AuditReport_Draft.pdf', 'missing_fields', 'Corporate Identification Number (CIN) column is missing from client registration metadata.', 0.85, 'flagged'),
        ('qa-2', 'doc-2', 'MGM_LedgerReconcilation_July.xlsx', 'calculation_check', 'Subtotal addition verification check found a discrepancy of ₹120.00 on Page 4.', 0.96, 'flagged'),
        ('qa-3', 'doc-3', 'Om_GST_OffsetDraft.pdf', 'duplicate', 'Potential duplicate scan detected. File structure matches 99% with Om_GST_Invoice_984.pdf uploaded yesterday.', 0.99, 'flagged');

      -- Phase 8: Backup Records
      CREATE TABLE IF NOT EXISTS backup_records (
        id TEXT PRIMARY KEY,
        backup_type TEXT NOT NULL, -- 'full', 'incremental', 'manual', 'scheduled'
        file_path TEXT NOT NULL,
        file_size_mb REAL DEFAULT 0,
        status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'verified'
        encrypted INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );

      -- Phase 8: License Registry
      CREATE TABLE IF NOT EXISTS license_registry (
        id TEXT PRIMARY KEY,
        license_key TEXT UNIQUE NOT NULL,
        edition TEXT NOT NULL, -- 'trial', 'professional', 'enterprise'
        status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked', 'trial'
        activated_at TEXT,
        expires_at TEXT,
        device_id TEXT,
        max_users INTEGER DEFAULT 1,
        features TEXT DEFAULT '[]', -- JSON array of enabled feature flags
        notes TEXT
      );

      -- Phase 8: Plugin Registry
      CREATE TABLE IF NOT EXISTS plugin_registry (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        author TEXT,
        description TEXT,
        category TEXT, -- 'ocr', 'report', 'reconciliation', 'ai', 'compliance', 'integration'
        status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'error', 'updating'
        config TEXT DEFAULT '{}', -- JSON plugin configuration
        installed_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 8: System Error Logs
      CREATE TABLE IF NOT EXISTS error_logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL, -- 'debug', 'info', 'warning', 'error', 'critical'
        module TEXT,
        message TEXT NOT NULL,
        stack_trace TEXT,
        resolved INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 8: Performance Metrics Snapshots
      CREATE TABLE IF NOT EXISTS perf_metrics (
        id TEXT PRIMARY KEY,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        unit TEXT,
        recorded_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 8: Document Fingerprints (Security)
      CREATE TABLE IF NOT EXISTS document_fingerprints (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        hash_sha256 TEXT NOT NULL,
        file_size INTEGER,
        access_history TEXT DEFAULT '[]', -- JSON array of {user, timestamp, action}
        retention_until TEXT,
        read_only INTEGER DEFAULT 0,
        watermark_enabled INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 8: Update History
      CREATE TABLE IF NOT EXISTS update_history (
        id TEXT PRIMARY KEY,
        from_version TEXT,
        to_version TEXT NOT NULL,
        channel TEXT DEFAULT 'stable', -- 'stable', 'beta'
        status TEXT DEFAULT 'pending', -- 'pending', 'downloaded', 'installed', 'rolled_back', 'failed'
        release_notes TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase 8: QA Test Results
      CREATE TABLE IF NOT EXISTS qa_test_results (
        id TEXT PRIMARY KEY,
        suite TEXT NOT NULL, -- 'unit', 'integration', 'e2e', 'performance', 'security'
        test_name TEXT NOT NULL,
        status TEXT NOT NULL, -- 'passed', 'failed', 'skipped'
        duration_ms INTEGER,
        error_message TEXT,
        run_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT (datetime('now')),
        user_id TEXT,
        user_name TEXT,
        client_id TEXT,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT DEFAULT 'success',
        detail TEXT,
        execution_ms INTEGER,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

      -- Seed Phase 8 backup records
      INSERT OR IGNORE INTO backup_records (id, backup_type, file_path, file_size_mb, status, encrypted, notes, completed_at) VALUES
        ('bkp-1', 'full', '/backups/ca_copilot_full_2026-07-01.enc', 142.4, 'verified', 1, 'Scheduled weekly full backup', '2026-07-01T02:00:00'),
        ('bkp-2', 'incremental', '/backups/ca_copilot_incr_2026-07-08.enc', 18.2, 'completed', 1, 'Incremental nightly delta', '2026-07-08T02:00:00'),
        ('bkp-3', 'manual', '/backups/ca_copilot_manual_2026-07-15.enc', 148.9, 'verified', 1, 'Before Phase 7 deployment', '2026-07-15T09:32:00');

      -- Seed Phase 8 license
      INSERT OR IGNORE INTO license_registry (id, license_key, edition, status, activated_at, expires_at, device_id, max_users, features) VALUES
        ('lic-1', 'ENT-2026-DEMO-K9X2-CA-COPILOT', 'enterprise', 'active', '2026-01-01T00:00:00', '2027-01-01T00:00:00', 'device-001', 50, '["all_modules","ai_automation","multi_branch","api_access","priority_support"]');

      -- Seed Phase 8 plugins
      INSERT OR IGNORE INTO plugin_registry (id, name, version, author, description, category, status) VALUES
        ('plg-1', 'Advanced OCR Engine (Tesseract 5)', '5.3.2', 'CA Copilot Labs', 'High-accuracy OCR for regional language invoices including Hindi, Marathi, Tamil.', 'ocr', 'active'),
        ('plg-2', 'GST Portal Integration Bridge', '2.1.0', 'TaxTech Solutions', 'Direct GSTR-2B auto-pull via GSP API without manual upload.', 'integration', 'inactive'),
        ('plg-3', 'Industry Template Pack - Manufacturing', '1.0.0', 'CA Copilot Labs', '40+ audit templates and SOPs for manufacturing sector clients.', 'compliance', 'active'),
        ('plg-4', 'AI Risk Scoring Engine', '1.2.0', 'CA Copilot Labs', 'Deep heuristic analysis for fraud patterns and high-risk ledger entries.', 'ai', 'active'),
        ('plg-5', 'Tally ERP Sync Bridge', '3.0.1', 'ErpBridge Technologies', 'Two-way sync with Tally Prime for books of accounts integration.', 'integration', 'inactive');

      -- Seed Phase 8 error logs
      INSERT OR IGNORE INTO error_logs (id, level, module, message, resolved) VALUES
        ('log-1', 'warning', 'OCR Agent', 'Low confidence OCR extraction (72%) on scanned invoice INV-9842. Manual review recommended.', 0),
        ('log-2', 'info', 'Database', 'Daily WAL checkpoint completed successfully. Pages flushed: 412.', 1),
        ('log-3', 'error', 'GST Reconciler', 'GSTR-2B API timeout after 30s. Retried 3 times, falling back to manual import mode.', 0),
        ('log-4', 'info', 'Backup', 'Scheduled incremental backup completed. Size: 18.2 MB. Encrypted: Yes.', 1);

      -- Seed Phase 8 performance metrics
      INSERT OR IGNORE INTO perf_metrics (id, metric_name, metric_value, unit) VALUES
        ('pm-1', 'db_query_avg_ms', 4.2, 'ms'),
        ('pm-2', 'ocr_processing_speed', 2.3, 'pages/sec'),
        ('pm-3', 'startup_time_ms', 1840, 'ms'),
        ('pm-4', 'memory_usage_mb', 312.4, 'MB'),
        ('pm-5', 'db_size_mb', 48.6, 'MB'),
        ('pm-6', 'ai_suggestion_accuracy', 96.2, '%');

      -- Seed Phase 8 QA test results
      INSERT OR IGNORE INTO qa_test_results (id, suite, test_name, status, duration_ms) VALUES
        ('qt-1', 'unit', 'GST reconciliation matching algorithm', 'passed', 142),
        ('qt-2', 'unit', 'OCR confidence score thresholding', 'passed', 89),
        ('qt-3', 'integration', 'Database backup and restore cycle', 'passed', 3420),
        ('qt-4', 'e2e', 'Full invoice upload to report generation workflow', 'passed', 8910),
        ('qt-5', 'performance', 'Batch processing 500 invoice OCR pipeline', 'passed', 62400),
        ('qt-6', 'security', 'SQL injection prevention in search inputs', 'passed', 210),
        ('qt-7', 'unit', 'License validation offline token check', 'passed', 44);

      -- Seed Phase 8 update history
      INSERT OR IGNORE INTO update_history (id, from_version, to_version, channel, status, release_notes) VALUES
        ('upd-1', '0.9.0', '1.0.0', 'stable', 'installed', 'Initial stable release with Phase 1-6 modules.'),
        ('upd-2', '1.0.0', '1.1.0', 'stable', 'installed', 'Phase 7 AI Automation: Task planner, rules engine, working papers, QA flags.');

      -- Phase 2 Sync Queue
      CREATE TABLE IF NOT EXISTS local_sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_local_id TEXT NOT NULL,
        action TEXT CHECK(action IN ('insert', 'update', 'delete')) NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        retry_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        last_attempted_at TEXT,
        next_attempt_at TEXT,
        last_error TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        local_payload TEXT,
        remote_payload TEXT,
        status TEXT DEFAULT 'open',
        resolution TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        resolved_at TEXT
      );
    `)

    const queueColumns = [
      { name: 'status', def: "TEXT DEFAULT 'pending'" },
      { name: 'priority', def: "TEXT DEFAULT 'normal'" },
      { name: 'last_attempted_at', def: 'TEXT' },
      { name: 'next_attempt_at', def: 'TEXT' },
    ]

    try {
      const queueInfo = this.db.prepare('PRAGMA table_info(local_sync_queue)').all() as { name: string }[]
      const existingQueueCols = queueInfo.map(col => col.name)
      for (const col of queueColumns) {
        if (!existingQueueCols.includes(col.name)) {
          this.db.prepare(`ALTER TABLE local_sync_queue ADD COLUMN ${col.name} ${col.def}`).run()
        }
      }
    } catch (err) {
      console.error('Failed to migrate local_sync_queue columns:', err)
    }

    try {
      const conflictInfo = this.db.prepare('PRAGMA table_info(sync_conflicts)').all() as { name: string }[]
      const existingConflictCols = conflictInfo.map(col => col.name)
      const conflictColumns = [
        { name: 'status', def: "TEXT DEFAULT 'open'" },
        { name: 'resolution', def: 'TEXT' },
        { name: 'created_at', def: "TEXT DEFAULT (datetime('now'))" },
        { name: 'resolved_at', def: 'TEXT' },
      ]
      for (const col of conflictColumns) {
        if (!existingConflictCols.includes(col.name)) {
          this.db.prepare(`ALTER TABLE sync_conflicts ADD COLUMN ${col.name} ${col.def}`).run()
        }
      }
    } catch (err) {
      console.error('Failed to migrate sync_conflicts columns:', err)
    }

    // Add sync properties to syncable tables dynamically
    const tablesToSync = ['clients', 'documents', 'tasks', 'users']
    const columnsToAdd = [
      { name: 'cloud_id', def: 'TEXT' },
      { name: 'sync_status', def: "TEXT DEFAULT 'synced'" },
      { name: 'deleted_at', def: 'TEXT' },
      { name: 'version_number', def: 'INTEGER DEFAULT 1' },
      { name: 'last_synced_at', def: 'TEXT' }
    ]

    for (const table of tablesToSync) {
      try {
        const pragma = this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
        const existingCols = pragma.map(c => c.name)
        
        for (const col of columnsToAdd) {
          if (!existingCols.includes(col.name)) {
            this.db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.def}`).run()
          }
        }
      } catch (err) {
        console.error(`Failed to migrate table columns for ${table}:`, err)
      }
    }
  }

  // Settings
  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  }

  setSetting(key: string, value: string): void {
    this.db.prepare(
      "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
    ).run(key, value)
  }

  getAllSettings(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[]
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  }

  // ── Synchronization Engine SQLite Helpers ──────────────────────────────────
  addToSyncQueue(tableName: string, recordLocalId: string, action: 'insert' | 'update' | 'delete'): void {
    try {
      this.db.prepare('DELETE FROM local_sync_queue WHERE table_name = ? AND record_local_id = ? AND action = ?').run(tableName, recordLocalId, action)
      this.db.prepare(
        'INSERT INTO local_sync_queue (table_name, record_local_id, action, status, priority, last_attempted_at, next_attempt_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))'
      ).run(tableName, recordLocalId, action, 'pending', 'normal')
    } catch (err) {
      console.error('Failed to add to local_sync_queue:', err)
    }
  }

  getPendingSyncQueue(): unknown[] {
    try {
      return this.db.prepare(`
        SELECT * FROM local_sync_queue
        WHERE status IN ('pending', 'retrying')
          AND (next_attempt_at IS NULL OR next_attempt_at <= datetime('now'))
        ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          next_attempt_at ASC, id ASC
      `).all()
    } catch {
      return []
    }
  }

  getSyncQueueSummary(): { pendingCount: number; failedCount: number; syncingCount: number; conflictCount: number } {
    try {
      const counts = this.db.prepare("SELECT status, COUNT(*) as count FROM local_sync_queue GROUP BY status").all() as Array<{ status: string; count: number }>
      const summary = counts.reduce((acc, row) => {
        if (row.status === 'pending') acc.pendingCount += row.count
        if (row.status === 'failed') acc.failedCount += row.count
        if (row.status === 'uploading' || row.status === 'downloading') acc.syncingCount += row.count
        return acc
      }, { pendingCount: 0, failedCount: 0, syncingCount: 0, conflictCount: 0 })

      const conflictCount = (this.db.prepare("SELECT COUNT(*) as count FROM sync_conflicts WHERE status = 'open'").get() as { count: number }).count
      return { ...summary, conflictCount }
    } catch {
      return { pendingCount: 0, failedCount: 0, syncingCount: 0, conflictCount: 0 }
    }
  }

  getSyncConflicts(): unknown[] {
    try {
      return this.db.prepare('SELECT * FROM sync_conflicts ORDER BY created_at DESC').all()
    } catch {
      return []
    }
  }

  insertSyncConflict(conflict: { id: string; tableName: string; recordId: string; localPayload: unknown; remotePayload: unknown }): void {
    try {
      this.db.prepare(`
        INSERT OR IGNORE INTO sync_conflicts (id, table_name, record_id, local_payload, remote_payload, status)
        VALUES (?, ?, ?, ?, ?, 'open')
      `).run(conflict.id, conflict.tableName, conflict.recordId, JSON.stringify(conflict.localPayload), JSON.stringify(conflict.remotePayload))
    } catch (err) {
      console.error('Failed to insert sync conflict:', err)
    }
  }

  resolveSyncConflict(id: string, resolution: string, status = 'resolved'): void {
    try {
      this.db.prepare('UPDATE sync_conflicts SET resolution = ?, status = ?, resolved_at = datetime(\'now\') WHERE id = ?').run(resolution, status, id)
    } catch (err) {
      console.error('Failed to resolve sync conflict:', err)
    }
  }

  updateSyncQueueStatus(queueId: number, status: string, lastError?: string | null): void {
    try {
      this.db.prepare(`
        UPDATE local_sync_queue SET status = ?, last_error = ?, last_attempted_at = datetime('now'),
          next_attempt_at = CASE WHEN ? IN ('pending', 'retrying') THEN datetime('now') ELSE next_attempt_at END
        WHERE id = ?
      `).run(status, lastError || null, status, queueId)
    } catch (err) {
      console.error('Failed to update sync queue status:', err)
    }
  }

  getRecordData(tableName: string, localId: string): unknown {
    try {
      if (!this.isSyncableTable(tableName)) return null
      return this.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(localId)
    } catch {
      return null
    }
  }

  updateRecordSyncStatus(
    tableName: string,
    localId: string,
    cloudId: string,
    syncStatus: string,
    versionNumber: number,
    lastSyncedAt: string
  ): void {
    try {
      if (!this.isSyncableTable(tableName)) throw new Error(`Unsupported sync table: ${tableName}`)
      this.db.prepare(`
        UPDATE ${tableName} 
        SET cloud_id = ?, sync_status = ?, version_number = ?, last_synced_at = ? 
        WHERE id = ?
      `).run(cloudId, syncStatus, versionNumber, lastSyncedAt, localId)
    } catch (err) {
      console.error(`Failed to update sync status for ${tableName} (${localId}):`, err)
    }
  }

  updateSyncQueueError(queueId: number, lastError: string): void {
    try {
      const item = this.db.prepare('SELECT retry_count FROM local_sync_queue WHERE id = ?').get(queueId) as { retry_count: number } | undefined
      if (!item) return
      const retries = item.retry_count + 1
      const maxRetries = 8
      // Capped exponential backoff (30s, 60s, 120s … up to 30m) plus jitter prevents retry storms.
      const delaySeconds = Math.min(1800, 30 * Math.pow(2, Math.min(retries - 1, 6))) + Math.floor(Math.random() * 15)
      this.db.prepare(`
        UPDATE local_sync_queue SET retry_count = ?, status = ?, last_error = ?,
          last_attempted_at = datetime('now'), next_attempt_at = datetime('now', ?)
        WHERE id = ?
      `).run(retries, retries >= maxRetries ? 'failed' : 'retrying', lastError, `+${delaySeconds} seconds`, queueId)
    } catch (err) {
      console.error('Failed to update sync queue error:', err)
    }
  }

  deleteSyncQueueEntry(queueId: number): void {
    try {
      this.db.prepare('DELETE FROM local_sync_queue WHERE id = ?').run(queueId)
    } catch (err) {
      console.error('Failed to delete sync queue entry:', err)
    }
  }

  applySyncUpdate(tableName: string, record: any): void {
    try {
      if (!this.isSyncableTable(tableName)) throw new Error(`Unsupported sync table: ${tableName}`)
      const fields = Object.keys(record)
      const placeholders = fields.map(() => '?').join(', ')
      const values = Object.values(record)
      
      this.db.prepare(`
        INSERT OR REPLACE INTO ${tableName} (${fields.join(', ')})
        VALUES (${placeholders})
      `).run(...values)
    } catch (err) {
      console.error(`Failed to apply sync update to SQLite table ${tableName}:`, err)
    }
  }

  recoverInterruptedSyncOperations(): number {
    try {
      const result = this.db.prepare(`
        UPDATE local_sync_queue SET status = 'retrying',
          last_error = COALESCE(last_error, 'Previous sync was interrupted.'),
          next_attempt_at = datetime('now')
        WHERE status IN ('uploading', 'downloading')
      `).run()
      return result.changes
    } catch (err) {
      console.error('Failed to recover interrupted sync operations:', err)
      return 0
    }
  }

  private isSyncableTable(tableName: string): boolean {
    return ['clients', 'documents', 'tasks', 'users'].includes(tableName)
  }

  // Conversion History
  insertConversion(record: {
    id: string
    originalFileName: string
    originalFilePath: string
    documentType: string
    status: string
    outputPath: string
    warnings: string[]
    processingDurationMs: number
    pageCount: number
  }): void {
    this.db.prepare(`
      INSERT INTO conversion_history
        (id, original_file_name, original_file_path, document_type, status, output_path, warnings, processing_duration_ms, page_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.originalFileName,
      record.originalFilePath,
      record.documentType,
      record.status,
      record.outputPath,
      JSON.stringify(record.warnings),
      record.processingDurationMs,
      record.pageCount
    )
  }

  getConversionHistory(limit = 100): unknown[] {
    return this.db.prepare(`
      SELECT * FROM conversion_history
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit)
  }

  deleteConversion(id: string): void {
    this.db.prepare('DELETE FROM conversion_history WHERE id = ?').run(id)
  }

  getDashboardStats(): Record<string, number> {
    const totalConversions = (this.db.prepare('SELECT COUNT(*) as count FROM conversion_history').get() as { count: number }).count
    const successfulConversions = (this.db.prepare("SELECT COUNT(*) as count FROM conversion_history WHERE status = 'success'").get() as { count: number }).count
    const totalClients = (this.db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number }).count
    const totalDocuments = (this.db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number }).count

    return {
      totalConversions,
      successfulConversions,
      totalClients,
      totalDocuments,
    }
  }

  getRecentActivity(limit = 10): unknown[] {
    return this.db.prepare(`
      SELECT
        id,
        'conversion' as activity_type,
        original_file_name as title,
        document_type as subtitle,
        status,
        created_at
      FROM conversion_history
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit)
  }

  // Clients Database Helper Methods
  getClients(): unknown[] {
    return this.db.prepare(`
      SELECT 
        id, 
        client_name as clientName, 
        business_name as businessName, 
        client_type as clientType, 
        pan, 
        gstin, 
        email, 
        phone, 
        financial_year as financialYear, 
        assigned_staff as assignedStaff, 
        status, 
        created_at as createdAt, 
        updated_at as updatedAt 
      FROM clients 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `).all()
  }


  insertClient(client: {
    id: string
    clientName: string
    businessName?: string
    clientType?: string
    pan?: string
    gstin?: string
    email?: string
    phone?: string
    financialYear?: string
    assignedStaff?: string
    status?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO clients
        (id, client_name, business_name, client_type, pan, gstin, email, phone, financial_year, assigned_staff, status, sync_status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_upload', datetime('now'))
    `).run(
      client.id,
      client.clientName,
      client.businessName || '',
      client.clientType || '',
      client.pan || '',
      client.gstin || '',
      client.email || '',
      client.phone || '',
      client.financialYear || '',
      client.assignedStaff || '',
      client.status || 'active'
    )
    this.addToSyncQueue('clients', client.id, 'update')
  }

  deleteClient(id: string): void {
    this.db.prepare("UPDATE clients SET deleted_at = datetime('now'), sync_status = 'pending_upload' WHERE id = ?").run(id)
    this.addToSyncQueue('clients', id, 'delete')
  }

  // Firm Details
  getFirmDetails(): unknown {
    return this.db.prepare('SELECT * FROM firm_details LIMIT 1').get()
  }

  saveFirmDetails(details: {
    id: string
    name: string
    registration?: string
    address?: string
    phone?: string
    email?: string
    logo?: string
    letterhead?: string
    workspace_type?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO firm_details
        (id, name, registration, address, phone, email, logo, letterhead, workspace_type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      details.id,
      details.name,
      details.registration || '',
      details.address || '',
      details.phone || '',
      details.email || '',
      details.logo || '',
      details.letterhead || '',
      details.workspace_type || 'single'
    )
  }

  // Users
  getUsers(): unknown[] {
    return this.db.prepare('SELECT * FROM users ORDER BY name ASC').all()
  }

  insertUser(user: {
    id: string
    name: string
    email: string
    role: string
    status?: string
    branch?: string
    department?: string
    password_hash?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO users
        (id, name, email, role, status, branch, department, password_hash, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      user.id,
      user.name,
      user.email,
      user.role,
      user.status || 'active',
      user.branch || '',
      user.department || '',
      user.password_hash || 'scrypt:user123'
    )
  }

  deleteUser(id: string): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id)
  }

  // Roles & Permissions
  getRolePermissions(): unknown[] {
    return this.db.prepare('SELECT * FROM roles_permissions').all()
  }

  insertRolePermission(role: string, permission: string, enabled: number): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO roles_permissions (role, permission, enabled)
      VALUES (?, ?, ?)
    `).run(role, permission, enabled)
  }

  clearRolePermissions(role: string): void {
    this.db.prepare('DELETE FROM roles_permissions WHERE role = ?').run(role)
  }

  // Teams
  getTeams(): unknown[] {
    return this.db.prepare(`
      SELECT teams.*, COUNT(DISTINCT team_members.user_id) AS member_count,
        COUNT(DISTINCT team_client_assignments.client_id) AS client_count
      FROM teams
      LEFT JOIN team_members ON team_members.team_id = teams.id
      LEFT JOIN team_client_assignments ON team_client_assignments.team_id = teams.id
      GROUP BY teams.id
      ORDER BY teams.name ASC
    `).all()
  }

  getTeamMembers(teamId: string): unknown[] {
    return this.db.prepare(`
      SELECT users.* FROM users
      INNER JOIN team_members ON team_members.user_id = users.id
      WHERE team_members.team_id = ? ORDER BY users.name ASC
    `).all(teamId)
  }

  saveTeam(team: { id: string; name: string; description?: string; leader_id?: string; permissions?: string; status?: string; member_ids?: string[]; client_ids?: string[] }): void {
    const save = this.db.transaction(() => {
      this.db.prepare(`
        INSERT OR REPLACE INTO teams (id, name, description, leader_id, permissions, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(team.id, team.name, team.description || '', team.leader_id || '', team.permissions || '[]', team.status || 'active')
      this.db.prepare('DELETE FROM team_members WHERE team_id = ?').run(team.id)
      this.db.prepare('DELETE FROM team_client_assignments WHERE team_id = ?').run(team.id)
      const addMember = this.db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)')
      const addClient = this.db.prepare('INSERT OR IGNORE INTO team_client_assignments (team_id, client_id) VALUES (?, ?)')
      team.member_ids?.forEach((userId) => addMember.run(team.id, userId))
      team.client_ids?.forEach((clientId) => addClient.run(team.id, clientId))
    })
    save()
  }

  deleteTeam(id: string): void {
    this.db.prepare('DELETE FROM teams WHERE id = ?').run(id)
  }

  // Tasks
  getTasks(): unknown[] {
    return this.db.prepare('SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY due_date ASC, created_at DESC').all()
  }

  insertTask(task: {
    id: string
    client_id?: string
    owner_id?: string
    owner_name?: string
    due_date?: string
    priority?: string
    status?: string
    title: string
    description?: string
    task_type?: string
    attachments?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO tasks
        (id, client_id, owner_id, owner_name, due_date, priority, status, title, description, task_type, attachments, sync_status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_upload', datetime('now'))
    `).run(
      task.id,
      task.client_id || '',
      task.owner_id || '',
      task.owner_name || '',
      task.due_date || '',
      task.priority || 'medium',
      task.status || 'pending',
      task.title,
      task.description || '',
      task.task_type || 'other',
      task.attachments || '[]'
    )
    this.addToSyncQueue('tasks', task.id, 'update')
  }

  updateTaskStatus(id: string, status: string): void {
    this.db.prepare(`
      UPDATE tasks SET status = ?, sync_status = 'pending_upload', updated_at = datetime('now') WHERE id = ?
    `).run(status, id)
    this.addToSyncQueue('tasks', id, 'update')
  }

  deleteTask(id: string): void {
    this.db.prepare("UPDATE tasks SET deleted_at = datetime('now'), sync_status = 'pending_upload' WHERE id = ?").run(id)
    this.addToSyncQueue('tasks', id, 'delete')
  }

  // Task Comments
  getTaskComments(taskId: string): unknown[] {
    return this.db.prepare('SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC').all(taskId)
  }

  insertTaskComment(comment: {
    id: string
    task_id: string
    user_name: string
    user_role?: string
    comment_text: string
    attachment_path?: string
    is_internal?: number
  }): void {
    this.db.prepare(`
      INSERT INTO task_comments
        (id, task_id, user_name, user_role, comment_text, attachment_path, is_internal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      comment.id,
      comment.task_id,
      comment.user_name,
      comment.user_role || '',
      comment.comment_text,
      comment.attachment_path || '',
      comment.is_internal !== undefined ? comment.is_internal : 1
    )
  }

  // Document Approvals
  getDocumentApprovals(documentId: string): unknown[] {
    return this.db.prepare('SELECT * FROM document_approvals WHERE document_id = ? ORDER BY updated_at ASC').all(documentId)
  }

  insertDocumentApproval(approval: {
    id: string
    document_id: string
    step: string
    status: string
    reviewer_name?: string
    reviewer_role?: string
    notes?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO document_approvals
        (id, document_id, step, status, reviewer_name, reviewer_role, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      approval.id,
      approval.document_id,
      approval.step,
      approval.status,
      approval.reviewer_name || '',
      approval.reviewer_role || '',
      approval.notes || ''
    )
  }

  // Compliance Calendar
  getComplianceDeadlines(): unknown[] {
    return this.db.prepare('SELECT * FROM compliance_deadlines ORDER BY deadline_date ASC').all()
  }

  insertComplianceDeadline(deadline: {
    id: string
    title: string
    deadline_date: string
    category: string
    status?: string
    description?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO compliance_deadlines
        (id, title, deadline_date, category, status, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      deadline.id,
      deadline.title,
      deadline.deadline_date,
      deadline.category,
      deadline.status || 'upcoming',
      deadline.description || ''
    )
  }

  updateComplianceDeadline(id: string, status: string): void {
    this.db.prepare(`
      UPDATE compliance_deadlines SET status = ? WHERE id = ?
    `).run(status, id)
  }

  deleteComplianceDeadline(id: string): void {
    this.db.prepare('DELETE FROM compliance_deadlines WHERE id = ?').run(id)
  }

  // Knowledge Items
  getKnowledgeItems(searchQuery = ''): unknown[] {
    if (searchQuery.trim() === '') {
      return this.db.prepare('SELECT * FROM knowledge_items ORDER BY created_at DESC').all()
    }
    const match = `%${searchQuery}%`
    return this.db.prepare(`
      SELECT * FROM knowledge_items 
      WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
      ORDER BY created_at DESC
    `).all(match, match, match)
  }

  insertKnowledgeItem(item: {
    id: string
    title: string
    category: string
    content?: string
    file_path?: string
    tags?: string
    created_by?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO knowledge_items
        (id, title, category, content, file_path, tags, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.title,
      item.category,
      item.content || '',
      item.file_path || '',
      item.tags || '[]',
      item.created_by || ''
    )
  }

  deleteKnowledgeItem(id: string): void {
    this.db.prepare('DELETE FROM knowledge_items WHERE id = ?').run(id)
  }

  // Audit Trail
  getAuditTrail(limit = 100): unknown[] {
    return this.db.prepare('SELECT * FROM audit_trail ORDER BY timestamp DESC LIMIT ?').all(limit)
  }

  insertAuditTrail(log: {
    id: string
    user_name: string
    role: string
    action: string
    client_name?: string
    document_name?: string
    details?: string
  }): void {
    this.db.prepare(`
      INSERT INTO audit_trail
        (id, timestamp, user_name, role, action, client_name, document_name, details)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      log.id,
      log.user_name,
      log.role,
      log.action,
      log.client_name || '',
      log.document_name || '',
      log.details || ''
    )
  }

  // Offline Sync Logs
  getSyncLogs(limit = 50): unknown[] {
    return this.db.prepare('SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT ?').all(limit)
  }

  insertSyncLog(log: {
    id: string
    action: string
    status: string
    conflicts_count?: number
    description?: string
  }): void {
    this.db.prepare(`
      INSERT INTO sync_logs
        (id, action, timestamp, status, conflicts_count, description)
      VALUES (?, ?, datetime('now'), ?, ?, ?)
    `).run(
      log.id,
      log.action,
      log.status,
      log.conflicts_count || 0,
      log.description || ''
    )
  }

  // Phase 7 AI Automation Rules
  getAiAutomationRules(): unknown[] {
    return this.db.prepare('SELECT * FROM ai_automation_rules ORDER BY created_at DESC').all()
  }

  insertAiAutomationRule(rule: {
    id: string
    name: string
    trigger_event: string
    actions: string
    status?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO ai_automation_rules (id, name, trigger_event, actions, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      rule.id,
      rule.name,
      rule.trigger_event,
      rule.actions,
      rule.status || 'active'
    )
  }

  deleteAiAutomationRule(id: string): void {
    this.db.prepare('DELETE FROM ai_automation_rules WHERE id = ?').run(id)
  }

  // Phase 7 AI Suggestions
  getAiSuggestions(): unknown[] {
    return this.db.prepare('SELECT * FROM ai_suggestions ORDER BY confidence DESC, created_at DESC').all()
  }

  insertAiSuggestion(sug: {
    id: string
    client_id?: string
    item_type: string
    original_value: string
    suggested_value: string
    confidence: number
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO ai_suggestions (id, client_id, item_type, original_value, suggested_value, confidence, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      sug.id,
      sug.client_id || '',
      sug.item_type,
      sug.original_value,
      sug.suggested_value,
      sug.confidence
    )
  }

  updateAiSuggestionStatus(id: string, status: string): void {
    this.db.prepare(`
      UPDATE ai_suggestions SET status = ?, approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE NULL END WHERE id = ?
    `).run(status, status, id)
  }

  // Phase 7 AI Working Papers
  getAiWorkingPapers(clientId?: string): unknown[] {
    if (clientId) {
      return this.db.prepare('SELECT * FROM ai_working_papers WHERE client_id = ? ORDER BY created_at DESC').all(clientId)
    }
    return this.db.prepare('SELECT * FROM ai_working_papers ORDER BY created_at DESC').all()
  }

  insertAiWorkingPaper(wp: {
    id: string
    client_id?: string
    document_type: string
    title: string
    generated_content: string
    flagged_sections?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO ai_working_papers (id, client_id, document_type, title, generated_content, flagged_sections)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      wp.id,
      wp.client_id || '',
      wp.document_type,
      wp.title,
      wp.generated_content,
      wp.flagged_sections || '[]'
    )
  }

  deleteAiWorkingPaper(id: string): void {
    this.db.prepare('DELETE FROM ai_working_papers WHERE id = ?').run(id)
  }

  // Phase 7 AI Learning Records
  getAiLearningRecords(): unknown[] {
    return this.db.prepare('SELECT * FROM ai_learning_records ORDER BY created_at DESC').all()
  }

  insertAiLearningRecord(record: {
    id: string
    pattern_type: string
    pattern_key: string
    pattern_value: string
    user_override?: number
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO ai_learning_records (id, pattern_type, pattern_key, pattern_value, user_override)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.pattern_type,
      record.pattern_key,
      record.pattern_value,
      record.user_override || 0
    )
  }

  // Phase 7 AI Pipeline Jobs
  getAiPipelineJobs(limit = 100): unknown[] {
    return this.db.prepare('SELECT * FROM ai_pipeline_jobs ORDER BY created_at DESC LIMIT ?').all(limit)
  }

  insertAiPipelineJob(job: {
    id: string
    title: string
    status?: string
    steps: string
    current_step?: number
    progress?: number
    retry_count?: number
    logs?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO ai_pipeline_jobs (id, title, status, steps, current_step, progress, retry_count, logs, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      job.id,
      job.title,
      job.status || 'pending',
      job.steps,
      job.current_step || 0,
      job.progress || 0,
      job.retry_count || 0,
      job.logs || '[]'
    )
  }

  updateAiPipelineJob(id: string, status: string, currentStep: number, progress: number, logs: string): void {
    this.db.prepare(`
      UPDATE ai_pipeline_jobs
      SET status = ?, current_step = ?, progress = ?, logs = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, currentStep, progress, logs, id)
  }

  // Phase 7 AI QA Validation Flags
  getAiQaFlags(): unknown[] {
    return this.db.prepare('SELECT * FROM ai_qa_flags ORDER BY confidence_score DESC, created_at DESC').all()
  }

  insertAiQaFlag(flag: {
    id: string
    file_id?: string
    file_name?: string
    check_type: string
    message: string
    confidence_score?: number
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO ai_qa_flags (id, file_id, file_name, check_type, message, confidence_score, status)
      VALUES (?, ?, ?, ?, ?, ?, 'flagged')
    `).run(
      flag.id,
      flag.file_id || '',
      flag.file_name || '',
      flag.check_type,
      flag.message,
      flag.confidence_score !== undefined ? flag.confidence_score : 1.0
    )
  }

  updateAiQaFlagStatus(id: string, status: string): void {
    this.db.prepare(`
      UPDATE ai_qa_flags SET status = ? WHERE id = ?
    `).run(status, id)
  }

  // ── Phase 8 Helper Methods ─────────────────────────────────────────────────

  // Backup Records
  getBackupRecords(): unknown[] {
    return this.db.prepare('SELECT * FROM backup_records ORDER BY created_at DESC').all()
  }

  insertBackupRecord(rec: {
    id: string; backup_type: string; file_path: string
    file_size_mb?: number; status?: string; encrypted?: number; notes?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO backup_records (id, backup_type, file_path, file_size_mb, status, encrypted, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(rec.id, rec.backup_type, rec.file_path, rec.file_size_mb ?? 0, rec.status ?? 'pending', rec.encrypted ?? 1, rec.notes ?? '')
  }

  updateBackupRecord(id: string, status: string, completedAt?: string): void {
    this.db.prepare(`UPDATE backup_records SET status = ?, completed_at = ? WHERE id = ?`).run(status, completedAt ?? new Date().toISOString(), id)
  }

  deleteBackupRecord(id: string): void {
    this.db.prepare('DELETE FROM backup_records WHERE id = ?').run(id)
  }

  // License Registry
  getLicenseInfo(): unknown {
    return this.db.prepare('SELECT * FROM license_registry LIMIT 1').get()
  }

  upsertLicense(lic: {
    id: string; license_key: string; edition: string
    status?: string; expires_at?: string; max_users?: number; features?: string; notes?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO license_registry (id, license_key, edition, status, activated_at, expires_at, max_users, features, notes)
      VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
    `).run(lic.id, lic.license_key, lic.edition, lic.status ?? 'active', lic.expires_at ?? '', lic.max_users ?? 1, lic.features ?? '[]', lic.notes ?? '')
  }

  // Plugin Registry
  getPlugins(): unknown[] {
    return this.db.prepare('SELECT * FROM plugin_registry ORDER BY category, name').all()
  }

  upsertPlugin(plg: {
    id: string; name: string; version: string
    author?: string; description?: string; category?: string; status?: string; config?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO plugin_registry (id, name, version, author, description, category, status, config, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(plg.id, plg.name, plg.version, plg.author ?? '', plg.description ?? '', plg.category ?? 'other', plg.status ?? 'inactive', plg.config ?? '{}')
  }

  updatePluginStatus(id: string, status: string): void {
    this.db.prepare(`UPDATE plugin_registry SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id)
  }

  // Error Logs
  getErrorLogs(limit = 200): unknown[] {
    return this.db.prepare('SELECT * FROM error_logs ORDER BY created_at DESC LIMIT ?').all(limit)
  }

  insertErrorLog(log: { id: string; level: string; module?: string; message: string; stack_trace?: string }): void {
    this.db.prepare(`INSERT INTO error_logs (id, level, module, message, stack_trace) VALUES (?, ?, ?, ?, ?)`
    ).run(log.id, log.level, log.module ?? '', log.message, log.stack_trace ?? '')
  }

  resolveErrorLog(id: string): void {
    this.db.prepare('UPDATE error_logs SET resolved = 1 WHERE id = ?').run(id)
  }

  // Performance Metrics
  getPerfMetrics(): unknown[] {
    return this.db.prepare('SELECT * FROM perf_metrics ORDER BY recorded_at DESC').all()
  }

  upsertPerfMetric(m: { id: string; metric_name: string; metric_value: number; unit?: string }): void {
    this.db.prepare(`INSERT OR REPLACE INTO perf_metrics (id, metric_name, metric_value, unit, recorded_at) VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(m.id, m.metric_name, m.metric_value, m.unit ?? '')
  }

  // Document Fingerprints
  getDocumentFingerprints(): unknown[] {
    return this.db.prepare('SELECT * FROM document_fingerprints ORDER BY created_at DESC').all()
  }

  upsertDocumentFingerprint(fp: {
    id: string; document_id: string; file_name: string; hash_sha256: string
    file_size?: number; retention_until?: string; read_only?: number; watermark_enabled?: number
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO document_fingerprints (id, document_id, file_name, hash_sha256, file_size, retention_until, read_only, watermark_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(fp.id, fp.document_id, fp.file_name, fp.hash_sha256, fp.file_size ?? 0, fp.retention_until ?? '', fp.read_only ?? 0, fp.watermark_enabled ?? 0)
  }

  appendDocumentAccessHistory(id: string, entry: object): void {
    const row = this.db.prepare('SELECT access_history FROM document_fingerprints WHERE id = ?').get(id) as { access_history: string } | undefined
    const history = JSON.parse(row?.access_history ?? '[]')
    history.push(entry)
    this.db.prepare('UPDATE document_fingerprints SET access_history = ? WHERE id = ?').run(JSON.stringify(history), id)
  }

  // Update History
  getUpdateHistory(): unknown[] {
    return this.db.prepare('SELECT * FROM update_history ORDER BY updated_at DESC').all()
  }

  insertUpdateRecord(upd: {
    id: string; from_version?: string; to_version: string
    channel?: string; status?: string; release_notes?: string
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO update_history (id, from_version, to_version, channel, status, release_notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(upd.id, upd.from_version ?? '', upd.to_version, upd.channel ?? 'stable', upd.status ?? 'pending', upd.release_notes ?? '')
  }

  // QA Test Results
  getQaTestResults(): unknown[] {
    return this.db.prepare('SELECT * FROM qa_test_results ORDER BY run_at DESC').all()
  }

  insertQaTestResult(r: {
    id: string; suite: string; test_name: string; status: string; duration_ms?: number; error_message?: string
  }): void {
    this.db.prepare(`INSERT INTO qa_test_results (id, suite, test_name, status, duration_ms, error_message) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(r.id, r.suite, r.test_name, r.status, r.duration_ms ?? 0, r.error_message ?? '')
  }

  logAuditEvent(params: {
    module: string
    action: string
    status?: string
    detail?: string
    userId?: string
    userName?: string
    clientId?: string
    executionMs?: number
    metadata?: Record<string, unknown>
  }): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (user_id, user_name, client_id, module, action, status, detail, execution_ms, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        params.userId ?? null,
        params.userName ?? null,
        params.clientId ?? null,
        params.module,
        params.action,
        params.status ?? 'success',
        params.detail ? params.detail.slice(0, 2000) : null,
        params.executionMs ?? null,
        params.metadata ? JSON.stringify(params.metadata) : null
      )
    } catch (err) {
      console.warn('[Database] audit log write failed (non-fatal):', err)
    }
  }

  getAuditLogs(params: {
    limit?: number
    offset?: number
    module?: string
    userId?: string
    search?: string
  } = {}): { total: number; logs: Record<string, unknown>[] } {
    const { limit = 100, offset = 0, module, userId, search } = params
    const clauses: string[] = []
    const args: unknown[] = []
    if (module) { clauses.push('module = ?'); args.push(module) }
    if (userId) { clauses.push('user_id = ?'); args.push(userId) }
    if (search) {
      clauses.push('(action LIKE ? OR detail LIKE ? OR user_name LIKE ?)')
      const like = `%${search}%`
      args.push(like, like, like)
    }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''
    const logs = this.db.prepare(
      `SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    ).all(...args, limit, offset) as Record<string, unknown>[]
    const total = (this.db.prepare(
      `SELECT COUNT(*) as cnt FROM audit_logs ${where}`
    ).get(...args) as { cnt: number }).cnt
    return { total, logs }
  }
}
