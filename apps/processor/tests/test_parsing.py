"""
Unit tests for invoice text parsing and validation logic.
"""
import pytest
from parsers.invoice_parser import parse_invoice_document, clean_amount

def test_clean_amount():
    assert clean_amount("12,345.67") == "12345.67"
    assert clean_amount("Rs. 450.00") == "450.00"
    assert clean_amount("  -120.50 ") == "-120.50"
    assert clean_amount("") == ""
    assert clean_amount(None) == ""

def test_parse_invoice_document_basic():
    synthetic_text = """
    TAX INVOICE
    Vendor Name: Acme Corp Private Limited
    Address: 123 Industrial Area, Bangalore
    GSTIN: 29AAAAA1111A1Z1
    PAN: AAAAA1111A
    
    Bill To: Global Tech Solutions
    Customer Address: 456 Tech Park, Hyderabad
    GSTIN: 36BBBBB2222B2Z2
    
    Invoice No: ACME-2026-1049
    Date: 12-07-2026
    Due Date: 12-08-2026
    
    Subtotal: 10,000.00
    CGST: 900.00
    SGST: 900.00
    Grand Total: 11,800.00
    
    Bank Name: HDFC Bank
    Account Number: 501002003004
    IFSC: HDFC0000123
    """

    header, line_items, confidence, warnings = parse_invoice_document(synthetic_text, [], "invoice")
    
    assert header.invoice_number == "ACME-2026-1049"
    assert header.invoice_date == "12-07-2026"
    assert header.due_date == "12-08-2026"
    assert header.vendor_gstin == "29AAAAA1111A1Z1"
    assert header.customer_gstin == "36BBBBB2222B2Z2"
    assert header.vendor_pan == "AAAAA1111A"
    assert header.grand_total == "11800.00"
    assert header.cgst == "900.00"
    assert header.sgst == "900.00"
    assert confidence == "high"
    assert len(warnings) == 0

def test_parse_invoice_document_table():
    synthetic_text = "Grand Total: 1000.00"
    raw_tables = [[
        ["Description", "HSN Code", "Qty", "Rate", "Total"],
        ["Consulting Fees", "998311", "10", "100.00", "1000.00"]
    ]]
    
    header, line_items, confidence, warnings = parse_invoice_document(synthetic_text, raw_tables, "invoice")
    
    assert len(line_items) == 1
    item = line_items[0]
    assert item.description == "Consulting Fees"
    assert item.hsn_sac == "998311"
    assert item.quantity == "10"
    assert item.rate == "100.00"
    assert item.total == "1000.00"
