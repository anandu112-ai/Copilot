"""
Unit Tests for CA Copilot AI Audit Intelligence Engine.
"""
import pytest
import tempfile
from pathlib import Path
from database.db import get_db_connection, init_db
from processors.audit_intelligence import AuditIntelligenceEngine, get_vendor_profiles
from exporters.audit_reports import AuditReportsExporter

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield

def test_audit_anomalies_and_custom_rules():
    conn = get_db_connection()
    cursor = conn.cursor()

    client_id = "audit-test-client"
    cursor.execute("INSERT OR REPLACE INTO clients (id, name) VALUES (?, 'Audit Testing Client Inc')", (client_id,))
    
    # 1. Round number anomaly + cash payment limit
    cursor.execute("""
        INSERT INTO ledger_entries (id, client_id, ledger_type, date, description, reference_number, debit, credit, total_amount, status)
        VALUES ('v-1', 'audit-test-client', 'purchase', '2026-07-15', 'Cash payment to consultant - round number', 'REF-001', 30000.0, 0.0, 30000.0, 'unmatched')
    """)

    # 2. Weekend transaction on a Sunday (2026-07-12 was a Sunday)
    cursor.execute("""
        INSERT INTO bank_transactions (id, client_id, bank_name, account_number, date, narration, reference_number, debit, credit, status)
        VALUES ('b-v1', 'audit-test-client', 'SBI', '1234', '2026-07-12', 'UPI/9928128911/MGM-LGS', 'MGM99281', 53100.0, 0.0, 'unmatched')
    """)

    # 3. Trigger custom rule (High value payment > 500000)
    cursor.execute("""
        INSERT INTO ledger_entries (id, client_id, ledger_type, date, description, reference_number, debit, credit, total_amount, status)
        VALUES ('v-2', 'audit-test-client', 'purchase', '2026-07-16', 'Major Capital Expense', 'REF-002', 650000.0, 0.0, 650000.0, 'unmatched')
    """)

    # 4. GST invoice check
    cursor.execute("""
        INSERT INTO gst_invoices (id, client_id, source_type, gstin, vendor_name, invoice_number, invoice_date, taxable_value, cgst, sgst, igst, total_amount, status)
        VALUES ('gst-v1', 'audit-test-client', 'gstr-2b', 'INVALID-GSTIN-ABC', 'Aditya Chemicals', 'INV-5510', '2026-07-10', 10000.0, 900.0, 900.0, 0.0, 11800.0, 'unmatched')
    """)

    conn.commit()

    # Run audit checks
    engine = AuditIntelligenceEngine(client_id)
    count = engine.run_all_audits()
    assert count >= 4

    # Verify database results
    cursor.execute("SELECT title, category, severity FROM audit_findings WHERE client_id = ?", (client_id,))
    rows = cursor.fetchall()
    titles = [r["title"] for r in rows]

    assert any("Round Number" in t for t in titles)
    assert any("40A(3)" in t for t in titles)
    assert any("Weekend" in t for t in titles)
    assert any("Rule Triggered: High Value Payments" in t for t in titles)
    assert any("Invalid GSTIN" in t for t in titles)

    # Test vendor profile aggregation
    profiles = get_vendor_profiles(client_id)
    assert len(profiles) >= 1
    assert profiles[0]["vendor_name"] == "Aditya Chemicals"
    assert profiles[0]["risk_level"] == "High"  # due to invalid GSTIN

    # Test reports generation
    exporter = AuditReportsExporter(client_id, "Audit Testing Client Inc")
    with tempfile.TemporaryDirectory() as tmp_dir:
        excel_path = Path(tmp_dir) / "audit_findings.xlsx"
        pdf_path = Path(tmp_dir) / "audit_findings.pdf"

        cursor.execute("SELECT * FROM audit_findings WHERE client_id = ?", (client_id,))
        findings = [dict(r) for r in cursor.fetchall()]

        exporter.export_excel(findings, str(excel_path))
        assert excel_path.exists()

        csv_str = exporter.export_csv(findings)
        assert "AI Audit Intelligence Findings" in csv_str
        assert "40A(3)" in csv_str

        exporter.export_pdf(findings, str(pdf_path))
        assert pdf_path.exists()

    conn.close()
