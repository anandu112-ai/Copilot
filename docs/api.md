# api.md

# CA Copilot — API Specification

## Overview

CA Copilot uses a **local FastAPI backend** launched by the Electron main process. The backend binds to an available localhost port, which is communicated to the React frontend during application startup.

The frontend **never communicates directly with external services** for core accounting workflows. All communication occurs over localhost, with Electron IPC reserved for native desktop functionality such as filesystem access, application updates, printing, backup/restore, and operating system integrations.

**Locked Technology Stack**

* Backend: Python 3.11 + FastAPI + Uvicorn
* Frontend: React + TypeScript
* Desktop: Electron
* Database: SQLite (`ca_copilot.db`, `reconciliation.db`)
* Authentication: JWT + bcrypt password hashing
* Response Format: JSON
* File Uploads: Multipart/Form-Data
* API Version: `/api/v1`

---

# Authentication

## Public Endpoints

### POST `/api/v1/auth/register`

Create a new local user.

**Request**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "StrongPassword123!",
  "firmName": "ABC & Co."
}
```

**Response**

```json
{
  "success": true,
  "userId": "...",
  "message": "Registration successful"
}
```

---

### POST `/api/v1/auth/login`

Authenticate a user.

Returns:

* JWT
* Refresh token (future)
* User profile
* Role
* Session expiry

---

### POST `/api/v1/auth/logout`

Invalidate current session.

---

### POST `/api/v1/auth/change-password`

**Authentication:** Logged-in User

---

### GET `/api/v1/auth/me`

Returns currently logged-in user.

**Authentication:** Logged-in User

---

# Dashboard

## GET `/api/v1/dashboard`

Returns:

* Recent projects
* Pending reconciliations
* Recent uploads
* AI recommendations
* Activity timeline
* KPI cards
* Storage usage

**Authentication:** Logged-in User

---

# Users

## GET `/api/v1/users`

List users.

**Authentication:** Admin

---

## POST `/api/v1/users`

Create staff user.

**Authentication:** Admin

---

## PUT `/api/v1/users/{id}`

Update user.

**Authentication:** Admin

---

## DELETE `/api/v1/users/{id}`

Deactivate user.

**Authentication:** Admin

---

# Firms

## GET `/api/v1/firms/me`

Current firm profile.

**Authentication:** Logged-in User

---

## PUT `/api/v1/firms/me`

Update firm information.

**Authentication:** Admin

---

# Clients

## GET `/api/v1/clients`

List clients.

Supports:

* Search
* Pagination
* Tags
* Financial year
* Business type

**Authentication:** Logged-in User

---

## POST `/api/v1/clients`

Create client.

**Authentication:** Logged-in User

---

## GET `/api/v1/clients/{id}`

Client details.

---

## PUT `/api/v1/clients/{id}`

Update client.

---

## DELETE `/api/v1/clients/{id}`

Archive client.

---

# Projects

## GET `/api/v1/projects`

List projects.

---

## POST `/api/v1/projects`

Create project.

---

## GET `/api/v1/projects/{id}`

Project details.

---

## PUT `/api/v1/projects/{id}`

Update project.

---

## DELETE `/api/v1/projects/{id}`

Archive project.

---

# Documents

## POST `/api/v1/documents/upload`

Upload one or more files.

Supported:

* PDF
* Excel
* CSV
* Images
* ZIP

Returns:

* Document IDs
* Upload status
* Processing queue status

---

## GET `/api/v1/documents`

List uploaded documents.

Supports:

* Search
* Tags
* Categories
* Pagination

---

## GET `/api/v1/documents/{id}`

Retrieve document metadata.

---

## DELETE `/api/v1/documents/{id}`

Soft delete document.

---

## POST `/api/v1/documents/{id}/rename`

Rename document.

---

## GET `/api/v1/documents/{id}/preview`

Returns preview metadata or rendered pages.

---

# OCR

## POST `/api/v1/ocr/process/{documentId}`

Run OCR.

Returns:

* Status
* Progress ID

---

## GET `/api/v1/ocr/results/{documentId}`

Returns:

* Extracted text
* Confidence
* Processing metadata

---

# AI Document Intelligence

## POST `/api/v1/ai/classify`

Classify uploaded document.

Returns:

* Document type
* Confidence
* Suggested workflow

---

## POST `/api/v1/ai/extract`

Extract structured financial data.

Returns:

* Vendor
* Customer
* GSTIN
* PAN
* Invoice details
* Amounts
* Tables

---

## POST `/api/v1/ai/summarize`

Generate document summary.

---

# PDF to Excel

## POST `/api/v1/pdf-to-excel/convert`

Start conversion.

Returns:

* Job ID
* Queue status

---

## GET `/api/v1/pdf-to-excel/jobs/{jobId}`

Conversion status.

---

## GET `/api/v1/pdf-to-excel/history`

Conversion history.

---

## GET `/api/v1/pdf-to-excel/download/{jobId}`

Download generated workbook.

---

# Bank Reconciliation

## POST `/api/v1/reconciliation/bank/start`

Create reconciliation session.

---

## GET `/api/v1/reconciliation/bank/{sessionId}`

Retrieve reconciliation status.

---

## POST `/api/v1/reconciliation/bank/{sessionId}/match`

Apply manual match.

---

## POST `/api/v1/reconciliation/bank/{sessionId}/suggestions`

Generate AI-assisted suggestions.

---

## POST `/api/v1/reconciliation/bank/{sessionId}/complete`

Finalize reconciliation.

---

# GST Reconciliation

## POST `/api/v1/reconciliation/gst/start`

---

## GET `/api/v1/reconciliation/gst/{sessionId}`

---

## POST `/api/v1/reconciliation/gst/{sessionId}/suggestions`

---

## POST `/api/v1/reconciliation/gst/{sessionId}/complete`

---

# Ledger Reconciliation

## POST `/api/v1/reconciliation/ledger/start`

---

## GET `/api/v1/reconciliation/ledger/{sessionId}`

---

## POST `/api/v1/reconciliation/ledger/{sessionId}/suggestions`

---

## POST `/api/v1/reconciliation/ledger/{sessionId}/complete`

---

# Audit Intelligence

## POST `/api/v1/audit/analyze`

Run audit analysis.

Returns:

* Risk score
* Findings
* Duplicate invoices
* Fraud indicators
* AI observations

---

## GET `/api/v1/audit/reports/{projectId}`

Retrieve audit report.

---

# AI Copilot

## POST `/api/v1/copilot/chat`

Natural language interaction.

Example:

```json
{
  "message": "Show all unmatched bank transactions."
}
```

Future capabilities:

* Tool calling
* Multi-step planning
* Context awareness
* Multi-document reasoning
* Provider routing

---

# Reports

## POST `/api/v1/reports/generate`

Generate report.

Supported:

* Audit
* GST
* Reconciliation
* Financial summary
* Risk
* Management

---

## GET `/api/v1/reports`

List generated reports.

---

## GET `/api/v1/reports/{id}/download`

Download report.

---

# Search

## GET `/api/v1/search`

Parameters:

* query
* module
* client
* dateRange
* tags

Returns unified search results across supported modules.

---

# Settings

## GET `/api/v1/settings`

Retrieve user settings.

---

## PUT `/api/v1/settings`

Update settings.

Supports:

* Theme
* OCR engine
* AI provider
* AI model
* Backup configuration
* Export defaults

---

# Backup

## POST `/api/v1/backup/create`

Create local backup.

---

## POST `/api/v1/backup/restore`

Restore application backup.

---

# Health & Diagnostics

## GET `/api/v1/health`

Returns:

* API status
* Database connectivity
* Processor status
* Application version

Public endpoint used by Electron during startup.

---

## GET `/api/v1/system/info`

Returns diagnostic information including:

* Python version
* SQLite version
* OCR availability
* Installed AI providers
* Disk usage
* Application configuration

**Authentication:** Admin

---

# Authentication Matrix

| Module             | Public | Logged-in | Admin |
| ------------------ | :----: | :-------: | :---: |
| Authentication     |    ✅   |     ✅     |   ✅   |
| Dashboard          |    ❌   |     ✅     |   ✅   |
| Clients            |    ❌   |     ✅     |   ✅   |
| Projects           |    ❌   |     ✅     |   ✅   |
| Documents          |    ❌   |     ✅     |   ✅   |
| OCR                |    ❌   |     ✅     |   ✅   |
| AI Processing      |    ❌   |     ✅     |   ✅   |
| PDF to Excel       |    ❌   |     ✅     |   ✅   |
| Reconciliation     |    ❌   |     ✅     |   ✅   |
| Audit Intelligence |    ❌   |     ✅     |   ✅   |
| Reports            |    ❌   |     ✅     |   ✅   |
| Search             |    ❌   |     ✅     |   ✅   |
| Settings           |    ❌   |     ✅     |   ✅   |
| User Management    |    ❌   |     ❌     |   ✅   |
| Firm Management    |    ❌   |     ❌     |   ✅   |
| Backup & Restore   |    ❌   |     ❌     |   ✅   |
| System Diagnostics |    ❌   |     ❌     |   ✅   |

# API Design Principles

* RESTful endpoints grouped by business domain.
* Long-running operations (OCR, AI analysis, reconciliation, PDF conversion) execute asynchronously and expose job/session status endpoints.
* Deterministic accounting logic remains separate from AI-assisted endpoints.
* All write operations validate permissions and execute within SQLite transactions.
* API responses use consistent success/error envelopes with structured validation errors.
* The backend remains modular (`api/`, `ocr/`, `reconciliation/`, `audit/`, `ai/`, `reports/`) to match the project's folder structure and support future plugin-based expansion.
