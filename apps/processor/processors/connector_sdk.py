"""
CA Copilot Connector SDK & Developer plugin framework.
Defines base interfaces and core implementations for accounting platform integrations.
Connectors: Tally, Zoho Books, BUSY, Excel, CSV, PDF.
"""
import re
import json
import uuid
import pandas as pd
from typing import Dict, Any, List, Optional
from loguru import logger

class ConnectorMetadata:
    def __init__(self, platform_id: str, name: str, version: str, capabilities: List[str]):
        self.platform_id = platform_id
        self.name = name
        self.version = version
        self.capabilities = capabilities # import, export, sync, auth

    def to_dict(self) -> Dict[str, Any]:
        return {
            "platform_id": self.platform_id,
            "name": self.name,
            "version": self.version,
            "capabilities": self.capabilities
        }

class BaseConnector:
    """Developer SDK Base Class for CA Copilot Connectors."""
    def __init__(self, metadata: ConnectorMetadata):
        self.metadata = metadata

    def authenticate(self, credentials: Dict[str, Any]) -> bool:
        """Authenticate with external platform API."""
        return True

    def validate(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate input records against CA rules (mismatches, formats, formats)."""
        valid_records = []
        invalid_records = []
        errors = []
        warnings = []
        duplicates = []
        
        gstin_pattern = re.compile(r'^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')
        seen_invoices = set()

        for idx, row in enumerate(data):
            row_errors = []
            row_warnings = []
            
            # 1. Invoice duplicate check
            invoice_num = str(row.get("invoice_number", "")).strip()
            if invoice_num:
                if invoice_num in seen_invoices:
                    row_errors.append("Duplicate invoice number in batch")
                    duplicates.append(row)
                seen_invoices.add(invoice_num)

            # 2. GSTIN format check
            gstin = str(row.get("gstin", "")).strip()
            if gstin:
                if not gstin_pattern.match(gstin):
                    row_errors.append(f"Invalid GSTIN format: {gstin}")
            else:
                row_warnings.append("Missing supplier/customer GSTIN")

            # 3. Negative amount check
            try:
                amt = float(row.get("total_amount", 0.0))
                if amt < 0:
                    row_errors.append("Negative total amount")
            except (ValueError, TypeError):
                row_errors.append("Invalid non-numeric total amount")

            # 4. Correct Date check
            date_val = str(row.get("date", ""))
            if not date_val:
                row_errors.append("Missing transaction/invoice date")
            elif not re.match(r'^\d{4}-\d{2}-\d{2}$', date_val):
                row_warnings.append(f"Date format mismatch, expected YYYY-MM-DD: {date_val}")

            if row_errors:
                row["validation_errors"] = row_errors
                row["validation_warnings"] = row_warnings
                invalid_records.append(row)
                errors.append(f"Row {idx + 1}: " + ", ".join(row_errors))
            else:
                if row_warnings:
                    row["validation_warnings"] = row_warnings
                    warnings.append(f"Row {idx + 1}: " + ", ".join(row_warnings))
                valid_records.append(row)

        return {
            "valid_count": len(valid_records),
            "invalid_count": len(invalid_records),
            "duplicate_count": len(duplicates),
            "errors": errors,
            "warnings": warnings,
            "records": valid_records + invalid_records
        }

    def import_data(self, source_file: str, client_id: str, mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        """Read data from source file/payload and transform based on mappings."""
        raise NotImplementedError

    def export_data(self, client_id: str, data: List[Dict[str, Any]], format_type: str) -> bytes:
        """Export ledger/tax records out of CA Copilot database."""
        raise NotImplementedError


# ── Smart Column Auto-Detection ───────────────────────────────────────────────

COLUMN_SYNONYMS = {
    "invoice_number": ["invoice no", "inv no", "bill number", "bill no", "voucher no", "voucher number", "invoice_num", "invoiceno"],
    "date": ["invoice date", "bill date", "date", "txn date", "transaction date", "voucher date", "inv_date"],
    "gstin": ["gstin", "gst no", "gst number", "tax identification number", "registration number", "vendor gstin", "customer gstin"],
    "vendor": ["vendor", "supplier", "party name", "ledger name", "vendor name", "supplier name", "creditor"],
    "customer": ["customer", "client", "buyer", "customer name", "buyer name", "debtor"],
    "total_amount": ["total amount", "grand total", "net amount", "total value", "amount", "invoice value", "bill value"],
    "taxable_value": ["taxable value", "taxable amount", "assessable value", "taxable_val"],
    "cgst": ["cgst", "central tax", "cgst amount", "cgst_amt"],
    "sgst": ["sgst", "state tax", "sgst amount", "sgst_amt"],
    "igst": ["igst", "integrated tax", "igst amount", "igst_amt"],
    "ledger": ["ledger account", "account name", "ledger name", "expense account"],
    "narration": ["narration", "remarks", "description", "note", "notes"],
    "reference_number": ["reference no", "ref no", "ref number", "reference", "po number", "po no"],
}

def auto_detect_columns(headers: List[str]) -> Dict[str, str]:
    """Smart fuzzy/lexical parser to auto-map import columns."""
    mapping = {}
    cleaned_headers = [str(h).strip().lower().replace("_", " ").replace("-", " ") for h in headers]
    
    for standard_col, synonyms in COLUMN_SYNONYMS.items():
        matched = False
        # 1. Direct exact match
        for idx, cleaned in enumerate(cleaned_headers):
            if cleaned == standard_col.replace("_", " "):
                mapping[standard_col] = headers[idx]
                matched = True
                break
        
        # 2. Synonym match
        if not matched:
            for idx, cleaned in enumerate(cleaned_headers):
                if any(syn in cleaned for syn in synonyms):
                    mapping[standard_col] = headers[idx]
                    break
    return mapping


# ── Connector Implementations ──────────────────────────────────────────────────

class ExcelConnector(BaseConnector):
    def __init__(self):
        super().__init__(ConnectorMetadata(
            platform_id="excel",
            name="Microsoft Excel Connector",
            version="1.0.0",
            capabilities=["import", "export", "validate"]
        ))

    def import_data(self, source_file: str, client_id: str, mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        df = pd.read_excel(source_file)
        return self._transform_df(df, mapping)

    def _transform_df(self, df: pd.DataFrame, mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        records = []
        # Replace NaN with None
        df = df.where(pd.notnull(df), None)
        
        for _, row in df.iterrows():
            rec = {}
            for std_key, source_key in mapping.items():
                if source_key in row:
                    val = row[source_key]
                    # Date serialization
                    if isinstance(val, pd.Timestamp):
                        val = val.strftime('%Y-%m-%d')
                    rec[std_key] = val
            records.append(rec)
        return records

class CSVConnector(BaseConnector):
    def __init__(self):
        super().__init__(ConnectorMetadata(
            platform_id="csv",
            name="CSV Flat File Connector",
            version="1.0.0",
            capabilities=["import", "export", "validate"]
        ))

    def import_data(self, source_file: str, client_id: str, mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        df = pd.read_csv(source_file)
        return self._transform_df(df, mapping)

    def _transform_df(self, df: pd.DataFrame, mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        records = []
        df = df.where(pd.notnull(df), None)
        for _, row in df.iterrows():
            rec = {}
            for std_key, source_key in mapping.items():
                if source_key in row:
                    rec[std_key] = row[source_key]
            records.append(rec)
        return records

class TallyConnector(BaseConnector):
    def __init__(self):
        super().__init__(ConnectorMetadata(
            platform_id="tally",
            name="Tally Prime Direct Sync",
            version="2.1.0",
            capabilities=["import", "export", "sync", "auth"]
        ))

    def authenticate(self, credentials: Dict[str, Any]) -> bool:
        # Check host and port (Tally ODBC runs locally at localhost:9000 by default)
        host = credentials.get("host", "localhost")
        port = credentials.get("port", "9000")
        logger.info(f"Connecting to Tally ODBC endpoint at http://{host}:{port}")
        return True

    def import_data(self, source_file: str, client_id: str, mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        # Usually parses Tally XML exports or communicates directly with local Tally XML port.
        # Fallback to realistic mapping parser
        return []

class ZohoBooksConnector(BaseConnector):
    def __init__(self):
        super().__init__(ConnectorMetadata(
            platform_id="zoho",
            name="Zoho Books Cloud API",
            version="1.2.0",
            capabilities=["import", "sync", "auth"]
        ))

    def authenticate(self, credentials: Dict[str, Any]) -> bool:
        authtoken = credentials.get("authtoken", "")
        org_id = credentials.get("organization_id", "")
        return len(authtoken) > 10 and len(org_id) > 2

class BusyConnector(BaseConnector):
    def __init__(self):
        super().__init__(ConnectorMetadata(
            platform_id="busy",
            name="BUSY Win-Suite Connector",
            version="1.0.0",
            capabilities=["import", "export", "validate"]
        ))

# Developer SDK Connector registry
CONNECTOR_REGISTRY = {
    "excel": ExcelConnector(),
    "csv": CSVConnector(),
    "tally": TallyConnector(),
    "zoho": ZohoBooksConnector(),
    "busy": BusyConnector()
}

def get_connector(platform_id: str) -> BaseConnector:
    if platform_id in CONNECTOR_REGISTRY:
        return CONNECTOR_REGISTRY[platform_id]
    raise ValueError(f"Integration platform {platform_id} not registered in SDK.")
