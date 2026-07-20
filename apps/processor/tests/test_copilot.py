"""
Unit Tests for CA Copilot AI Conversational Copilot & Agentic Workflow.
"""
import pytest
import json
from database.db import get_db_connection, init_db
from api.routes.copilot import classify_intent, find_knowledge, tool_find_duplicates, tool_cash_analysis, tool_vendor_intelligence

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield

def test_intent_classification():
    # Test intent matching logic
    assert classify_intent("Show duplicate payment vouchers") == "find_duplicates"
    assert classify_intent("reconcile SBI statement with purchase ledger") == "bank_reconciliation"
    assert classify_intent("compare GSTR-2B with purchase register") == "gst_reconciliation"
    assert classify_intent("check cash payments under section 40a") == "cash_violations"
    assert classify_intent("invalid vendor gstin and risk report") == "vendor_intelligence"
    assert classify_intent("what is blocked input tax credit under 17(5)") == "itc_analysis"
    assert classify_intent("run comprehensive ai audit scan") == "audit_scan"
    assert classify_intent("find all invoices above 10 lakh") == "invoice_search"
    assert classify_intent("show unmatched bank transactions") == "unmatched_transactions"
    assert classify_intent("what is the legal citation for rule 42") == "tax_knowledge"

def test_tax_knowledge_lookup():
    # Test knowledge base search
    hits17 = find_knowledge("blocked credit under 17(5)")
    assert len(hits17) > 0
    assert "17(5)" in hits17[0]["section"]
    assert "Blocked Input Tax Credit" in hits17[0]["title"]

    hits40a = find_knowledge("cash payments limit section 40a(3)")
    assert len(hits40a) > 0
    assert "40A(3)" in hits40a[0]["section"]
    assert "Cash Payment Disallowance" in hits40a[0]["title"]

def test_copilot_tool_executors():
    conn = get_db_connection()
    cursor = conn.cursor()

    client_id = "copilot-test-client"
    cursor.execute("INSERT OR REPLACE INTO clients (id, name) VALUES (?, 'Copilot Testing Client Ltd')", (client_id,))
    
    # Insert two very similar purchase records (for duplicate check test)
    cursor.execute("""
        INSERT INTO ledger_entries (id, client_id, ledger_type, date, description, reference_number, debit, total_amount, status)
        VALUES ('l-dup1', 'copilot-test-client', 'purchase', '2026-07-01', 'Om Packaging Paper Roll', 'INV-D1', 50000.0, 50000.0, 'unmatched')
    """)
    cursor.execute("""
        INSERT INTO ledger_entries (id, client_id, ledger_type, date, description, reference_number, debit, total_amount, status)
        VALUES ('l-dup2', 'copilot-test-client', 'purchase', '2026-07-02', 'Om Packaging Paper Roll', 'INV-D2', 50000.0, 50000.0, 'unmatched')
    """)

    # Insert a cash transaction over 10000 limit
    cursor.execute("""
        INSERT INTO bank_transactions (id, client_id, bank_name, date, narration, debit, payment_mode, status)
        VALUES ('b-cash1', 'copilot-test-client', 'SBI', '2026-07-10', 'CASH withdrawal self', 15000.0, 'CASH', 'unmatched')
    """)

    # Insert vendor invoices with structured and invalid gstin
    cursor.execute("""
        INSERT INTO gst_invoices (id, client_id, source_type, gstin, vendor_name, total_amount, status)
        VALUES ('gst-i1', 'copilot-test-client', 'gstr-1', 'INVALID-GST', 'Poor Supplier Inc', 100000.0, 'unmatched')
    """)

    conn.commit()

    # Verify duplicate tool
    dup_res = tool_find_duplicates(client_id)
    assert dup_res["found"] >= 1
    assert any("Om Packaging" in d["description"] for d in dup_res["duplicates"])

    # Verify cash violation tool
    cash_res = tool_cash_analysis(client_id)
    assert len(cash_res["violations"]) >= 1
    assert cash_res["violations"][0]["amount"] == 15000.0
    assert cash_res["total_disallowed"] >= 15000.0

    # Verify vendor intelligence tool
    vendor_res = tool_vendor_intelligence(client_id)
    assert vendor_res["invalid_count"] >= 1
    assert any(v["gstin"] == "INVALID-GST" and not v["gstin_valid"] for v in vendor_res["vendors"])

    conn.close()
