"""
Unit Tests for CA Copilot Reconciliation Engine.
"""
import pytest
import sqlite3
import tempfile
import json
from pathlib import Path
from database.db import get_db_connection, init_db
from processors.reconciliation_engine import MatchingEngine, detect_duplicates, normalize_ref
from exporters.reconciliation_reports import ReconciliationReportsExporter

@pytest.fixture(autouse=True)
def setup_test_db():
    """Initializes the schema for testing."""
    init_db()
    yield

def test_normalization():
    assert normalize_ref("INV-2026/001") == "INV2026001"
    assert normalize_ref("  00045612-A  ") == "45612A"
    assert normalize_ref("") == ""

def test_reconciliation_workflow():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Create client
    client_id = "test-client-1"
    cursor.execute("INSERT OR REPLACE INTO clients (id, name) VALUES (?, 'Test Client Inc')", (client_id,))
    conn.commit()

    # 2. Insert bank transactions
    # Setup bank statement payment
    cursor.execute("""
        INSERT INTO bank_transactions (id, client_id, bank_name, account_number, date, narration, reference_number, debit, credit, status)
        VALUES ('bt-1', 'test-client-1', 'SBI', '12345678', '2026-07-10', 'UPI/9928128911/MGM-LGS', 'MGM99281', 53100.0, 0.0, 'unmatched')
    """)
    # Setup bank statement receipt
    cursor.execute("""
        INSERT INTO bank_transactions (id, client_id, bank_name, account_number, date, narration, reference_number, debit, credit, status)
        VALUES ('bt-2', 'test-client-1', 'SBI', '12345678', '2026-07-12', 'CASH DEPOSIT MUMB BRANCH', '', 0.0, 95000.0, 'unmatched')
    """)
    # Setup potential duplicate bank txn
    cursor.execute("""
        INSERT INTO bank_transactions (id, client_id, bank_name, account_number, date, narration, reference_number, debit, credit, status)
        VALUES ('bt-3', 'test-client-1', 'SBI', '12345678', '2026-07-12', 'CASH DEPOSIT MUMB BRANCH', '', 0.0, 95000.0, 'unmatched')
    """)

    # 3. Insert ledger entries
    # Corresponding ledger payment (timing diff: recorded on 9th, cleared in bank on 10th)
    cursor.execute("""
        INSERT INTO ledger_entries (id, client_id, ledger_type, date, description, reference_number, debit, credit, total_amount, status)
        VALUES ('lt-1', 'test-client-1', 'bank', '2026-07-09', 'MGM Logistics Services (Transport charge)', 'MGM99281', 0.0, 53100.0, 53100.0, 'unmatched')
    """)
    # Corresponding ledger receipt
    cursor.execute("""
        INSERT INTO ledger_entries (id, client_id, ledger_type, date, description, reference_number, debit, credit, total_amount, status)
        VALUES ('lt-2', 'test-client-1', 'bank', '2026-07-11', 'Petty Cash - Deposit to Bank', 'CASH-DEP', 95000.0, 0.0, 95000.0, 'unmatched')
    """)
    
    conn.commit()

    # 4. Test bank matching engine
    engine = MatchingEngine(client_id)
    bank_results = engine.reconcile_bank_statements()
    
    assert len(bank_results["suggestions"]) >= 2
    
    # Reload and check status
    cursor.execute("SELECT status, matched_ledger_id, match_score FROM bank_transactions WHERE id = 'bt-1'")
    row = cursor.fetchone()
    # High confidence should be matched or pending_review
    assert row["status"] in ("matched", "pending_review")
    assert row["matched_ledger_id"] == "lt-1"

    # 5. Test duplicates detector
    dups = detect_duplicates(client_id)
    assert len(dups["bank"]) >= 1
    assert dups["bank"][0]["record_1_id"] == "bt-2"
    assert dups["bank"][0]["record_2_id"] == "bt-3"

    # 6. Test GST matching engine
    # Insert GST Invoices (GSTR-2B)
    cursor.execute("""
        INSERT INTO gst_invoices (id, client_id, source_type, gstin, vendor_name, invoice_number, invoice_date, taxable_value, cgst, sgst, igst, total_amount, status)
        VALUES ('g-1', 'test-client-1', 'gstr-2b', '27AAAAA1111A1Z1', 'Aditya Birla Chemicals', 'INV-8821', '2026-07-10', 100000.0, 9000.0, 9000.0, 0.0, 118000.0, 'unmatched')
    """)
    # Insert purchase ledger entry
    cursor.execute("""
        INSERT INTO ledger_entries (id, client_id, ledger_type, date, description, reference_number, invoice_number, gstin, debit, credit, amount_taxable, cgst, sgst, igst, total_amount, status)
        VALUES ('lt-3', 'test-client-1', 'purchase', '2026-07-08', 'Aditya Birla Chemicals Ltd (Vendor payment)', '', 'INV-8821', '27AAAAA1111A1Z1', 0.0, 118000.0, 100000.0, 9000.0, 9000.0, 0.0, 118000.0, 'unmatched')
    """)
    conn.commit()

    gst_results = engine.reconcile_gst()
    assert len(gst_results["suggestions"]) >= 1
    assert gst_results["suggestions"][0]["gst_invoice_id"] == "g-1"
    assert gst_results["suggestions"][0]["ledger_entry_id"] == "lt-3"

    # 7. Test Reports generation
    exporter = ReconciliationReportsExporter(client_id, "Test Client Inc")
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        excel_path = Path(tmp_dir) / "bank_reconciliation.xlsx"
        pdf_path = Path(tmp_dir) / "bank_reconciliation.pdf"
        
        # Prepare mock report data
        cursor.execute("SELECT * FROM bank_transactions WHERE client_id = ?", (client_id,))
        txns = [dict(r) for r in cursor.fetchall()]
        report_data = {
            "total_count": len(txns),
            "matched_count": sum(1 for t in txns if t["status"] == "matched"),
            "pending_count": sum(1 for t in txns if t["status"] == "pending_review"),
            "unmatched_count": sum(1 for t in txns if t["status"] == "unmatched"),
            "transactions": txns
        }

        # Export Excel
        exporter.export_excel(report_data, "bank", str(excel_path))
        assert excel_path.exists()

        # Export CSV
        csv_str = exporter.export_csv(report_data, "bank")
        assert "Bank Reconciliation Report" in csv_str
        assert "UPI/9928128911/MGM-LGS" in csv_str

        # Export PDF
        exporter.export_pdf(report_data, "bank", str(pdf_path))
        assert pdf_path.exists()

    conn.close()
