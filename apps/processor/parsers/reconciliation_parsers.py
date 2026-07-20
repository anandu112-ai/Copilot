"""
Reconciliation Parsers for CA Copilot.
Extracts data from Excel and CSV uploads for bank statements, general ledgers, and GST registers.
"""
import io
import re
import pandas as pd
from typing import List, Dict, Any
from loguru import logger

def clean_amount(val: Any) -> float:
    """Clean string values and convert to float."""
    if pd.isna(val) or val is None:
        return 0.0
    val_str = str(val).strip()
    # Remove currency symbols and commas
    val_str = re.sub(r'[^\d.\-]', '', val_str)
    try:
        return float(val_str) if val_str else 0.0
    except ValueError:
        return 0.0

def clean_string(val: Any) -> str:
    """Normalize string values."""
    if pd.isna(val) or val is None:
        return ""
    return str(val).strip()

def clean_date(val: Any) -> str:
    """Standardize date strings to YYYY-MM-DD."""
    if pd.isna(val) or val is None:
        return ""
    val_str = str(val).strip()
    # If date is datetime, format it
    if isinstance(val, pd.Timestamp) or hasattr(val, 'strftime'):
        return val.strftime('%Y-%m-%d')
    # Try common regex formats
    try:
        # Check standard formats
        for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d', '%d-%b-%Y'):
            try:
                return pd.to_datetime(val_str, format=fmt).strftime('%Y-%m-%d')
            except:
                continue
        # General datetime parsing
        return pd.to_datetime(val_str).strftime('%Y-%m-%d')
    except Exception:
        # Fallback to returning original string
        return val_str

def parse_excel_or_csv(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Read bytes into a Pandas DataFrame based on file type."""
    if filename.endswith('.csv'):
        # Try UTF-8 first, fallback to latin-1
        try:
            return pd.read_csv(io.BytesIO(file_bytes))
        except UnicodeDecodeError:
            return pd.read_csv(io.BytesIO(file_bytes), encoding='latin-1')
    elif filename.endswith(('.xlsx', '.xls')):
        return pd.read_excel(io.BytesIO(file_bytes))
    else:
        raise ValueError("Unsupported file format. Please upload Excel (.xlsx, .xls) or CSV (.csv).")

def parse_ledger_upload(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Parse general ledger, cash book, or registers.
    Normalizes columns like: Date, Description, Ref, Debit, Credit, GSTIN, Invoice Number.
    """
    df = parse_excel_or_csv(file_bytes, filename)
    logger.info(f"Loaded ledger DataFrame from {filename}. Shape: {df.shape}")
    
    # Lowercase all headers for comparison
    df.columns = [str(c).lower().strip() for c in df.columns]
    
    # Define column mapping heuristics
    col_mapping = {
        "date": ["date", "txn date", "transaction date", "posting date", "inv date", "invoice date"],
        "description": ["description", "particulars", "narration", "remarks", "party name", "account"],
        "reference_number": ["ref", "reference", "ref no", "vouch no", "voucher no", "doc no", "document number"],
        "invoice_number": ["invoice no", "inv no", "invoice number", "bill no", "bill number"],
        "debit": ["debit", "dr", "payment", "withdrawal", "debit amount"],
        "credit": ["credit", "cr", "receipt", "deposit", "credit amount"],
        "gstin": ["gstin", "gst id", "gstin/uin", "tax id"],
        "amount_taxable": ["taxable value", "taxable amount", "taxable val", "assessable value"],
        "cgst": ["cgst", "cgst amount", "central tax"],
        "sgst": ["sgst", "sgst amount", "state tax", "utgst"],
        "igst": ["igst", "igst amount", "integrated tax"],
        "cess": ["cess", "cess amount"],
        "total_amount": ["total", "total amount", "grand total", "net amount", "invoice amount"]
    }

    records = []
    
    # Find matching columns
    matched_cols = {}
    for standard_name, possible_names in col_mapping.items():
        for col in df.columns:
            if col in possible_names:
                matched_cols[standard_name] = col
                break

    # If essential columns (debit/credit/amount) are not found, let's search by prefix
    if "debit" not in matched_cols:
        for col in df.columns:
            if "debit" in col or "dr" in col or "withdrawal" in col:
                matched_cols["debit"] = col
                break
    if "credit" not in matched_cols:
        for col in df.columns:
            if "credit" in col or "cr" in col or "deposit" in col:
                matched_cols["credit"] = col
                break

    for _, row in df.iterrows():
        # Get values using mapping
        date_val = clean_date(row.get(matched_cols.get("date")))
        desc_val = clean_string(row.get(matched_cols.get("description")))
        ref_val = clean_string(row.get(matched_cols.get("reference_number")))
        inv_val = clean_string(row.get(matched_cols.get("invoice_number")))
        
        debit_val = clean_amount(row.get(matched_cols.get("debit")))
        credit_val = clean_amount(row.get(matched_cols.get("credit")))
        
        gstin_val = clean_string(row.get(matched_cols.get("gstin")))
        taxable_val = clean_amount(row.get(matched_cols.get("amount_taxable")))
        cgst_val = clean_amount(row.get(matched_cols.get("cgst")))
        sgst_val = clean_amount(row.get(matched_cols.get("sgst")))
        igst_val = clean_amount(row.get(matched_cols.get("igst")))
        cess_val = clean_amount(row.get(matched_cols.get("cess")))
        total_val = clean_amount(row.get(matched_cols.get("total_amount")))

        if not date_val and not desc_val and debit_val == 0.0 and credit_val == 0.0:
            continue  # Skip empty rows

        records.append({
            "date": date_val,
            "description": desc_val,
            "reference_number": ref_val,
            "invoice_number": inv_val,
            "debit": debit_val,
            "credit": credit_val,
            "gstin": gstin_val,
            "amount_taxable": taxable_val,
            "cgst": cgst_val,
            "sgst": sgst_val,
            "igst": igst_val,
            "cess": cess_val,
            "total_amount": total_val or (debit_val if debit_val > 0 else credit_val)
        })

    return records

def parse_gst_upload(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Parse GST Invoice reports (GSTR-1 or GSTR-2B Excel/CSV).
    """
    df = parse_excel_or_csv(file_bytes, filename)
    df.columns = [str(c).lower().strip() for c in df.columns]
    
    col_mapping = {
        "gstin": ["gstin", "gstin of supplier", "gstin of counterparty", "supplier gstin", "ctin", "gstin/uin"],
        "vendor_name": ["trade name", "legal name", "supplier name", "vendor name", "party name", "vendor"],
        "invoice_number": ["invoice number", "invoice no", "inv no", "invoice no.", "doc no", "document number"],
        "invoice_date": ["invoice date", "inv date", "date", "doc date", "document date"],
        "taxable_value": ["taxable value", "taxable value (rs.)", "taxable amt", "taxable amount"],
        "cgst": ["cgst", "cgst (rs.)", "central tax"],
        "sgst": ["sgst", "sgst (rs.)", "state tax", "state/ut tax"],
        "igst": ["igst", "igst (rs.)", "integrated tax"],
        "cess": ["cess", "cess (rs.)"],
        "total_amount": ["invoice value", "total value", "total amount", "inv amount", "grand total"]
    }

    matched_cols = {}
    for standard_name, possible_names in col_mapping.items():
        for col in df.columns:
            if col in possible_names or any(p in col for p in possible_names):
                matched_cols[standard_name] = col
                break

    records = []
    for _, row in df.iterrows():
        gstin_val = clean_string(row.get(matched_cols.get("gstin")))
        vendor_val = clean_string(row.get(matched_cols.get("vendor_name")))
        inv_no = clean_string(row.get(matched_cols.get("invoice_number")))
        date_val = clean_date(row.get(matched_cols.get("invoice_date")))
        taxable_val = clean_amount(row.get(matched_cols.get("taxable_value")))
        cgst_val = clean_amount(row.get(matched_cols.get("cgst")))
        sgst_val = clean_amount(row.get(matched_cols.get("sgst")))
        igst_val = clean_amount(row.get(matched_cols.get("igst")))
        cess_val = clean_amount(row.get(matched_cols.get("cess")))
        total_val = clean_amount(row.get(matched_cols.get("total_amount")))

        if not inv_no and taxable_val == 0.0:
            continue

        records.append({
            "gstin": gstin_val,
            "vendor_name": vendor_val,
            "invoice_number": inv_no,
            "invoice_date": date_val,
            "taxable_value": taxable_val,
            "cgst": cgst_val,
            "sgst": sgst_val,
            "igst": igst_val,
            "cess": cess_val,
            "total_amount": total_val or (taxable_val + cgst_val + sgst_val + igst_val)
        })

    return records
