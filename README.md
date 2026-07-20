# CA Copilot — AI-powered Accounting & Automation Platform

CA Copilot is a local-first, highly secure desktop application designed specifically for Chartered Accountants, audit firms, tax professionals, and corporate finance teams. It simplifies and automates repetitive tasks like data extraction, vouching assistance, tax audits, and compliance checks, with a strong focus on absolute document privacy.

## Features

1. **PDF to Excel Converter (Fully Working)**
   * Local Drag & Drop uploading of PDFs (invoices, statements, receipts, ledgers).
   * Validates document file structure, encryption, size.
   * Selection page for 13 distinct financial document formats.
   * Smart regex-based metadata extraction (GSTINs, PANs, Totals, Dates).
   * Dynamic column-header mapping & normalization heuristics.
   * Interactive review grid to view, search, edit, delete, or add line items.
   * Native Save dialog exporting formatted, multi-sheet `.xlsx` files with formulas.
   * Comprehensive Conversion History database.
2. **Skeletons for future AI & Audit workflows**
   * Dashboard showing real-time conversion & client statistics.
   * Skeletons for Client Manager, Vouching, Audit Assistant, Reconciliation, GST Assistant, Tax Assistant, Reports & Analytics, and App Settings.

---

## Technical Stack

* **Desktop Shell:** Electron 29
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Zustand
* **Database:** SQLite (local better-sqlite3)
* **Backend Processing:** Python 3.11, FastAPI, Uvicorn, PyMuPDF, pdfplumber, Tesseract OCR, openpyxl, pandas

---

## Installation & Setup

### Prerequisites

1. **Node.js**: Install Node.js v18.0.0 or later.
2. **Python**: Install Python 3.11.x (ensure it's added to your PATH).
3. **Tesseract OCR (Optional, for scanned PDFs):**
   * Download and run the installer from: [Tesseract at UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki).
   * Add the Tesseract installation folder (usually `C:\Program Files\Tesseract-OCR`) to your system PATH.

### 1. Python Environment Setup

Navigate to the `apps/processor` directory and run:

```bash
cd apps/processor
python -m venv .venv
# Activate venv:
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
.venv\Scripts\activate.bat

# Install dependencies:
pip install -r requirements.txt
```

### 2. Node.js Dependency Installation

From the workspace root directory, run:

```bash
npm install
```

---

## Running the Application Locally (Dev Mode)

Start both Vite development server and Electron shell with a single command from the root workspace:

```bash
npm run dev
```

This will:
1. Fire up Vite on `http://localhost:5173`.
2. Discover a random free port for Python.
3. Spawn the Python service (`apps/processor/main.py`) inside a child process.
4. Open the Electron desktop window.
5. Gracefully terminate the Python child process upon closing Electron.

---

## Testing

### Backend Unit Tests

Ensure your virtual environment is active in `apps/processor`, then run:

```bash
pytest
```

---

## Packaging the Application

To build the project into a standalone Windows installer (`.exe`), run:

```bash
npm run build:win
```

This script compiles the React code via Vite, compiles the Electron main files, packages all assets and the SQLite DB initialization script, and builds the installer in the `apps/desktop/release` directory using `electron-builder`.

*Note: For production distribution, the Python environment can be bundled using PyInstaller or embedded as a virtual environment inside the extraResources build step as defined in `apps/desktop/package.json`.*
