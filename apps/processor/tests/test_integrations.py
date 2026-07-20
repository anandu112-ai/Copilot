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
