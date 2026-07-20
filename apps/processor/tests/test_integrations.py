"""
Unit Tests for CA Copilot Enterprise Integrations & Connector SDK.
"""
import pytest
import json
from pathlib import Path
from database.db import get_db_connection, init_db
from processors.connector_sdk import get_connector, auto_detect_columns

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield

def test_column_auto_detection():
    headers = ["Inv No", "Invoice Date", "Supplier GSTIN", "Grand Total", "Remarks"]
    mapping = auto_detect_columns(headers)
    assert mapping.get("invoice_number") == "Inv No"
    assert mapping.get("date") == "Invoice Date"
    assert mapping.get("gstin") == "Supplier GSTIN"
    assert mapping.get("total_amount") == "Grand Total"
    assert mapping.get("narration") == "Remarks"

def test_connector_validation():
    connector = get_connector("excel")
    
    # 1. Test clean records
    clean_records = [
        {"invoice_number": "INV-1001", "date": "2026-07-20", "gstin": "27AAAAB0101N1Z5", "total_amount": 15000.0},
        {"invoice_number": "INV-1002", "date": "2026-07-21", "gstin": "27AAAAB0101N1Z5", "total_amount": 25000.0}
    ]
    val_res = connector.validate(clean_records)
    assert val_res["valid_count"] == 2
    assert val_res["invalid_count"] == 0
    assert len(val_res["errors"]) == 0

    # 2. Test dirty records (duplicate invoices, invalid gstin, negative amount, wrong date format)
    dirty_records = [
        {"invoice_number": "INV-1001", "date": "2026-07-20", "gstin": "27AAAAB0101N1Z5", "total_amount": 15000.0},
        # Duplicate
        {"invoice_number": "INV-1001", "date": "2026-07-20", "gstin": "27AAAAB0101N1Z5", "total_amount": 15000.0},
        # Invalid GSTIN
        {"invoice_number": "INV-1003", "date": "2026-07-21", "gstin": "INVALID-FORMAT", "total_amount": 5000.0},
        # Negative Amount
        {"invoice_number": "INV-1004", "date": "2026-07-22", "gstin": "27AAAAB0101N1Z5", "total_amount": -100.0},
        # Date format mismatch
        {"invoice_number": "INV-1005", "date": "20/07/2026", "gstin": "27AAAAB0101N1Z5", "total_amount": 350.0}
    ]
    val_res2 = connector.validate(dirty_records)
    assert val_res2["valid_count"] == 2
    assert val_res2["invalid_count"] == 3
    assert val_res2["duplicate_count"] == 1
    assert len(val_res2["errors"]) > 0

def test_db_model_routing():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clean up and insert
    cursor.execute("DELETE FROM ai_model_routing WHERE task_type = ?", ("ocr_custom_test",))
    cursor.execute("""
        INSERT INTO ai_model_routing (task_type, provider, model_name, confidence_threshold, requires_approval)
        VALUES (?, ?, ?, ?, ?)
    """, ("ocr_custom_test", "local_llama", "Llama-Vision-OCR", 0.88, 1))
    conn.commit()

    # Query
    cursor.execute("SELECT * FROM ai_model_routing WHERE task_type = ?", ("ocr_custom_test",))
    row = cursor.fetchone()
    conn.close()
    
    assert row is not None
    assert row["provider"] == "local_llama"
    assert row["model_name"] == "Llama-Vision-OCR"
    assert row["confidence_threshold"] == 0.88
    assert row["requires_approval"] == 1

def test_db_client_groups_and_cost_centres():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Setup client
    cursor.execute("INSERT OR IGNORE INTO clients (id, name) VALUES (?, ?)", ("client-test-id", "Test Corporation"))
    
    # Test Client Groups
    cursor.execute("DELETE FROM client_groups WHERE client_id = ?", ("client-test-id",))
    cursor.execute("""
        INSERT INTO client_groups (id, client_id, group_name, parent_group, nature)
        VALUES (?, ?, ?, ?, ?)
    """, ("group-1", "client-test-id", "Office Expenses", "Indirect Expenses", "Expense"))
    
    # Test Cost Centres
    cursor.execute("DELETE FROM client_cost_centres WHERE client_id = ?", ("client-test-id",))
    cursor.execute("""
        INSERT INTO client_cost_centres (id, client_id, name, category)
        VALUES (?, ?, ?, ?)
    """, ("centre-1", "client-test-id", "Sales Dept Mumbai", "Marketing"))
    
    conn.commit()

    # Verify Groups
    cursor.execute("SELECT * FROM client_groups WHERE id = ?", ("group-1",))
    grp = cursor.fetchone()
    assert grp is not None
    assert grp["group_name"] == "Office Expenses"
    assert grp["nature"] == "Expense"

    # Verify Cost Centres
    cursor.execute("SELECT * FROM client_cost_centres WHERE id = ?", ("centre-1",))
    cc = cursor.fetchone()
    conn.close()
    
    assert cc is not None
    assert cc["name"] == "Sales Dept Mumbai"
    assert cc["category"] == "Marketing"

def test_db_inventory_items():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("INSERT OR IGNORE INTO clients (id, name) VALUES (?, ?)", ("client-test-id", "Test Corporation"))
    cursor.execute("DELETE FROM inventory_items WHERE client_id = ?", ("client-test-id",))
    
    cursor.execute("""
        INSERT INTO inventory_items (id, client_id, sku, name, hsn_sac, uom, opening_qty, opening_rate, current_qty, valuation_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("item-1", "client-test-id", "SKU-STEEL-45", "Steel Rods 12mm", "7214", "MT", 10.0, 45000.0, 15.0, "FIFO"))
    conn.commit()

    cursor.execute("SELECT * FROM inventory_items WHERE id = ?", ("item-1",))
    row = cursor.fetchone()
    conn.close()
    
    assert row is not None
    assert row["sku"] == "SKU-STEEL-45"
    assert row["name"] == "Steel Rods 12mm"
    assert row["opening_qty"] == 10.0
    assert row["current_qty"] == 15.0
    assert row["valuation_method"] == "FIFO"

def test_db_vouchers_and_approvals():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("INSERT OR IGNORE INTO clients (id, name) VALUES (?, ?)", ("client-test-id", "Test Corporation"))
    cursor.execute("DELETE FROM voucher_approval_logs WHERE voucher_id = ?", ("v-1",))
    cursor.execute("DELETE FROM vouchers WHERE id = ?", ("v-1",))
    
    # 1. Create a Voucher
    cursor.execute("""
        INSERT INTO vouchers (id, client_id, voucher_number, voucher_type, date, ledger_name_debit, ledger_name_credit, amount, narration, approval_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("v-1", "client-test-id", "VCH-001", "purchase", "2026-07-20", "Purchase A/c", "Apex Steel", 50000.0, "AI extracted raw invoice", "pending_junior"))
    
    # 2. Add Approval Logs (Junior Review -> Senior Review)
    cursor.execute("""
        INSERT INTO voucher_approval_logs (voucher_id, stage_from, stage_to, action_by, comments)
        VALUES (?, ?, ?, ?, ?)
    """, ("v-1", "pending_junior", "pending_senior", "CA Junior John", "Ledger mappings look correct. Verified GSTIN."))
    
    cursor.execute("UPDATE vouchers SET approval_status = ? WHERE id = ?", ("pending_senior", "v-1"))
    conn.commit()

    # Query & Assert
    cursor.execute("SELECT * FROM vouchers WHERE id = ?", ("v-1",))
    v = cursor.fetchone()
    assert v["approval_status"] == "pending_senior"

    cursor.execute("SELECT * FROM voucher_approval_logs WHERE voucher_id = ? ORDER BY id DESC", ("v-1",))
    log = cursor.fetchone()
    conn.close()
    
    assert log is not None
    assert log["stage_from"] == "pending_junior"
    assert log["stage_to"] == "pending_senior"
    assert log["action_by"] == "CA Junior John"
    assert "Verified GSTIN" in log["comments"]

def test_db_compliance_deadlines():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("INSERT OR IGNORE INTO clients (id, name) VALUES (?, ?)", ("client-test-id", "Test Corporation"))
    cursor.execute("DELETE FROM client_compliance_deadlines WHERE client_id = ?", ("client-test-id",))
    
    # Insert compliance deadline
    cursor.execute("""
        INSERT INTO client_compliance_deadlines (id, client_id, compliance_type, due_date, status, assigned_user, reference_law)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("dl-1", "client-test-id", "GST GSTR-3B", "2026-07-20", "Pending", "CA Junior John", "Section 39(1) of CGST Act, 2017"))
    conn.commit()

    cursor.execute("SELECT * FROM client_compliance_deadlines WHERE id = ?", ("dl-1",))
    row = cursor.fetchone()
    conn.close()
    
    assert row is not None
    assert row["compliance_type"] == "GST GSTR-3B"
    assert row["due_date"] == "2026-07-20"
    assert row["status"] == "Pending"
    assert "Section 39(1)" in row["reference_law"]

