"""
Generates structured and beautifully formatted Excel workbooks from parsed extraction data.
"""
from typing import Dict, Any
from pathlib import Path
from loguru import logger
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

from models.schemas import ExtractionResult, InvoiceHeader, LineItem

class ExcelExporter:
    def __init__(self, result: ExtractionResult, output_path: str, document_type: str):
        self.result = result
        self.output_path = output_path
        self.document_type = document_type
        
        # Style Definitions
        self.font_family = "Segoe UI"
        self.title_font = Font(name=self.font_family, size=16, bold=True, color="1E293B")
        self.header_font = Font(name=self.font_family, size=11, bold=True, color="FFFFFF")
        self.section_font = Font(name=self.font_family, size=12, bold=True, color="334155")
        self.bold_font = Font(name=self.font_family, size=10, bold=True, color="1E293B")
        self.regular_font = Font(name=self.font_family, size=10, color="334155")
        
        self.header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid") # Indigo Brand Color
        self.section_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        
        # Borders
        self.thin_border_side = Side(border_style="thin", color="CBD5E1")
        self.double_border_side = Side(border_style="double", color="334155")
        
        self.cell_border = Border(
            left=self.thin_border_side,
            right=self.thin_border_side,
            top=self.thin_border_side,
            bottom=self.thin_border_side
        )
        self.total_border = Border(
            top=self.thin_border_side,
            bottom=self.double_border_side
        )

    async def generate(self) -> str:
        logger.info(f"Exporter: Creating Excel file at {self.output_path}")
        
        # Ensure directory exists
        Path(self.output_path).parent.mkdir(parents=True, exist_ok=True)
        
        wb = openpyxl.Workbook()
        
        # Sheet 1: Summary
        ws_summary = wb.active
        ws_summary.title = "Invoice Summary"
        self._populate_summary_sheet(ws_summary)
        
        # Sheet 2: Line Items
        ws_lines = wb.create_sheet(title="Line Items")
        self._populate_line_items_sheet(ws_lines)
        
        # Sheet 3: Tax Summary
        ws_tax = wb.create_sheet(title="Tax Summary")
        self._populate_tax_sheet(ws_tax)
        
        wb.save(self.output_path)
        logger.info("Exporter: Excel file saved successfully.")
        return self.output_path

    def _populate_summary_sheet(self, ws):
        ws.views.sheetView[0].showGridLines = True
        
        # Title block
        ws["A1"] = "CA Copilot — Invoice Summary"
        ws["A1"].font = self.title_font
        ws.row_dimensions[1].height = 30
        
        h = self.result.header
        
        sections = [
            ("Document Details", [
                ("Invoice Number", h.invoice_number),
                ("Invoice Date", h.invoice_date),
                ("Due Date", h.due_date),
                ("Place of Supply", h.place_of_supply),
                ("Currency", h.currency),
                ("Payment Terms", h.payment_terms),
            ]),
            ("Seller Details", [
                ("Vendor Name", h.vendor_name),
                ("Vendor GSTIN", h.vendor_gstin),
                ("Vendor PAN", h.vendor_pan),
                ("Vendor Address", h.vendor_address),
            ]),
            ("Buyer Details", [
                ("Customer Name", h.customer_name),
                ("Customer GSTIN", h.customer_gstin),
                ("Customer Address", h.customer_address),
            ]),
            ("Bank Details", [
                ("Bank Name", h.bank_name),
                ("Account Number", h.account_number),
                ("IFSC Code", h.ifsc),
                ("UPI ID", h.upi),
            ])
        ]
        
        curr_row = 3
        for section_title, fields in sections:
            # Header
            ws.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=2)
            cell = ws.cell(row=curr_row, column=1, value=section_title)
            cell.font = self.section_font
            cell.fill = self.section_fill
            ws.row_dimensions[curr_row].height = 22
            curr_row += 1
            
            # Key-values
            for label, value in fields:
                c1 = ws.cell(row=curr_row, column=1, value=label)
                c2 = ws.cell(row=curr_row, column=2, value=value or "—")
                
                c1.font = self.bold_font
                c2.font = self.regular_font
                
                c1.border = self.cell_border
                c2.border = self.cell_border
                
                curr_row += 1
            curr_row += 1 # spacer row
            
        self._auto_fit_columns(ws)

    def _populate_line_items_sheet(self, ws):
        ws.views.sheetView[0].showGridLines = True
        
        # Headers
        headers = [
            "S.No", "Description", "HSN/SAC", "Quantity", "Rate", 
            "Taxable Value", "CGST Rate", "CGST Amount", 
            "SGST Rate", "SGST Amount", "IGST Rate", "IGST Amount", "Total"
        ]
        
        ws.row_dimensions[1].height = 25
        for col_idx, text in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=text)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            
        # Freeze Pane (Keep first row frozen)
        ws.freeze_panes = "A2"
        
        # Data
        for row_idx, item in enumerate(self.result.line_items, 2):
            # Parse rate/total numbers for formatting if possible
            row_data = [
                item.sr_no,
                item.description,
                item.hsn_sac,
                self._safe_float(item.quantity),
                self._safe_float(item.rate),
                self._safe_float(item.taxable_value),
                item.cgst_rate,
                self._safe_float(item.cgst_amount),
                item.sgst_rate,
                self._safe_float(item.sgst_amount),
                item.igst_rate,
                self._safe_float(item.igst_amount),
                self._safe_float(item.total)
            ]
            
            ws.row_dimensions[row_idx].height = 20
            for col_idx, val in enumerate(row_data, 1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = self.regular_font
                cell.border = self.cell_border
                
                # Alignments and formatting
                if col_idx in [1, 3]:
                    cell.alignment = Alignment(horizontal="center")
                elif col_idx in [4, 5, 6, 8, 10, 12, 13]:
                    cell.alignment = Alignment(horizontal="right")
                    cell.number_format = '#,##0.00'
                    
        # Total Row
        total_row_idx = len(self.result.line_items) + 2
        ws.cell(row=total_row_idx, column=2, value="Total").font = self.bold_font
        ws.cell(row=total_row_idx, column=2).alignment = Alignment(horizontal="right")
        
        # Excel formulas for summing columns
        sum_columns = [(6, "F"), (8, "H"), (10, "J"), (12, "L"), (13, "M")]
        for col_idx, col_letter in sum_columns:
            cell = ws.cell(
                row=total_row_idx, 
                column=col_idx, 
                value=f"=SUM({col_letter}2:{col_letter}{total_row_idx-1})"
            )
            cell.font = self.bold_font
            cell.number_format = '#,##0.00'
            cell.border = self.total_border
            
        self._auto_fit_columns(ws)

    def _populate_tax_sheet(self, ws):
        ws.views.sheetView[0].showGridLines = True
        
        ws["A1"] = "Tax Breakdown"
        ws["A1"].font = self.title_font
        
        h = self.result.header
        
        rows = [
            ("Taxable Value", self._safe_float(h.taxable_amount)),
            ("Central Tax (CGST)", self._safe_float(h.cgst)),
            ("State Tax (SGST)", self._safe_float(h.sgst)),
            ("Integrated Tax (IGST)", self._safe_float(h.igst)),
            ("Cess", self._safe_float(h.cess)),
            ("Round Off", self._safe_float(h.round_off)),
            ("Grand Total", self._safe_float(h.grand_total)),
        ]
        
        curr_row = 3
        for label, val in rows:
            c1 = ws.cell(row=curr_row, column=1, value=label)
            c2 = ws.cell(row=curr_row, column=2, value=val)
            
            c1.font = self.bold_font if label == "Grand Total" else self.regular_font
            c2.font = self.bold_font if label == "Grand Total" else self.regular_font
            
            c1.border = self.total_border if label == "Grand Total" else self.cell_border
            c2.border = self.total_border if label == "Grand Total" else self.cell_border
            
            c2.number_format = '#,##0.00'
            curr_row += 1
            
        self._auto_fit_columns(ws)

    def _safe_float(self, val: str):
        if not val:
            return ""
        try:
            return float(val.replace(",", ""))
        except ValueError:
            return val

    def _auto_fit_columns(self, ws):
        for col in ws.columns:
            max_len = 0
            for cell in col:
                val = str(cell.value or '')
                if val.startswith("="): # Skip formulas length estimation
                    val = "123,456.78"
                max_len = max(max_len, len(val))
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)
