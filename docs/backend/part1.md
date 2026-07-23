===========================================================
CA COPILOT BACKEND MASTER PROMPT
===========================================================

You are a senior backend engineer responsible for building the backend of an existing production desktop application named CA Copilot.

IMPORTANT:

The frontend is already built and complete.

DO NOT:

- Modify the frontend folder.
- Restructure the React application.
- Change frontend components.
- Change frontend stores.
- Rewrite Electron code.
- Replace existing frontend architecture.

Only build the backend alongside the existing frontend and connect to it.

===========================================================
PROJECT CONTEXT
===========================================================

CA Copilot is an offline-first AI-powered accounting platform for:

- Chartered Accountants
- Audit Firms
- Tax Consultants
- Finance Teams

The platform automates:

- Document processing
- OCR
- PDF to Excel conversion
- GST reconciliation
- Bank reconciliation
- Ledger reconciliation
- Audit workflows
- Reporting
- AI-assisted accounting workflows

All sensitive financial data remains local.

===========================================================
LOCKED TECHNOLOGY STACK
===========================================================

Backend:

Python 3.11

FastAPI

Uvicorn


Database:

SQLite


Processing:

Pandas

NumPy

OpenPyXL

PyMuPDF

pdfplumber

Tesseract OCR


Authentication:

JWT

bcrypt password hashing


Frontend communication:

REST API over localhost


===========================================================
EXISTING PROJECT STRUCTURE
===========================================================

CA-Copilot/

apps/

    desktop/
        (EXISTING FRONTEND)
        DO NOT TOUCH

    processor/

        api/
        ai/
        ocr/
        reconciliation/
        audit/
        reports/
        models/
        database/


Build only inside:

apps/processor/


===========================================================
BACKEND ARCHITECTURE
===========================================================

Create a modular FastAPI backend.

Structure:


apps/processor/

    main.py

    api/
        auth.py
        users.py
        firms.py
        clients.py
        documents.py
        ocr.py
        pdf_excel.py
        reconciliation.py
        audit.py
        copilot.py
        reports.py
        search.py
        settings.py

    core/

        config.py
        security.py
        database.py
        logging.py

    models/

        user.py
        firm.py
        client.py
        document.py
        reconciliation.py

    services/

        auth_service.py
        document_service.py
        ocr_service.py
        excel_service.py
        ai_service.py

    ocr/

    ai/

    reconciliation/

    audit/

    reports/

    database/

    tests/


===========================================================
DATABASE IMPLEMENTATION
===========================================================

Implement the database design from db_er.md.


Databases:


1.

ca_copilot.db


Contains:

Users

Firms

Clients

Projects

Documents

OCR metadata

Reports

Settings

Activities


2.

reconciliation.db


Contains:

Bank transactions

Ledger entries

GST records

Matching sessions

Match results

Exceptions


Use:

SQLite

SQLAlchemy or equivalent ORM

Migration support if appropriate.

For this desktop scale:

Use lightweight migrations.

Do not introduce unnecessary enterprise infrastructure.

===========================================================
AUTHENTICATION
===========================================================

Implement:


Registration

Login

Logout

Current user

Password change

Session validation


Security:


bcrypt hashing

JWT tokens

Token expiration

Role checking


Roles:


Admin

CA

Staff

Client


Create middleware/dependencies:


get_current_user()

require_role()


===========================================================
API IMPLEMENTATION
===========================================================

Implement routes from api.md.


Required modules:


AUTH

POST /api/v1/auth/register

POST /api/v1/auth/login

POST /api/v1/auth/logout

GET /api/v1/auth/me


CLIENTS

GET /api/v1/clients

POST /api/v1/clients

GET /api/v1/clients/{id}

PUT /api/v1/clients/{id}

DELETE /api/v1/clients/{id}


DOCUMENTS

POST /api/v1/documents/upload

GET /api/v1/documents

GET /api/v1/documents/{id}

DELETE /api/v1/documents/{id}


OCR

POST /api/v1/ocr/process/{documentId}

GET /api/v1/ocr/results/{documentId}


PDF TO EXCEL

POST /api/v1/pdf-to-excel/convert

GET /api/v1/pdf-to-excel/jobs/{id}

GET /api/v1/pdf-to-excel/history


RECONCILIATION

Bank

GST

Ledger


Implement:

Create session

Process data

Generate matches

Return exceptions

Accept/reject matches


AUDIT

POST /api/v1/audit/analyze


REPORTS

POST /api/v1/reports/generate

GET /api/v1/reports


SEARCH

GET /api/v1/search


SETTINGS

GET /api/v1/settings

PUT /api/v1/settings


HEALTH

GET /api/v1/health


===========================================================
DOCUMENT PROCESSING
===========================================================

Implement document pipeline:


Upload

↓

Validate file

↓

Store metadata

↓

Calculate checksum

↓

Queue processing

↓

Extract information


Support:


PDF

Excel

CSV

Images


Store:

Filename

Path

Checksum

Size

Type

Status


===========================================================
OCR ENGINE
===========================================================

Implement OCR service.


Support:


Text PDFs:

PyMuPDF

pdfplumber


Scanned PDFs:

Tesseract


Return:


Extracted text

Confidence

Processing time

Metadata


===========================================================
PDF TO EXCEL ENGINE
===========================================================

Implement:


PDF table extraction

Column detection

Data cleaning

Normalization

Excel generation


Generate:


.xlsx files

Multiple sheets

Formatted output


Use:

pandas

openpyxl


===========================================================
RECONCILIATION ENGINE
===========================================================

Create modular reconciliation services.


Bank reconciliation:


Match using:

Date

Amount

Reference

Narration


Support:


Exact matches

Partial matches

Duplicate detection

AI suggestions placeholder


GST reconciliation:


Compare:

Purchase register

GSTR data

Sales data


Detect:


Missing invoices

Tax mismatch

GSTIN mismatch

Duplicate claims


Ledger reconciliation:


Compare:

Ledger

Bank

Invoices

Payments


Return:

Matched records

Exceptions

Confidence scores


===========================================================
AI SERVICE LAYER
===========================================================

Create an AI abstraction layer.


Do not directly couple application logic to one provider.


Structure:


ai/

    provider.py

    local_provider.py

    cloud_provider.py


Support future:


OpenAI

Gemini

Claude

Ollama


Current implementation:

Create interfaces and placeholder services.


AI can assist with:


Classification

Summaries

Suggestions

Risk explanations


AI must NOT:

Automatically modify accounting data.

Post entries.

Approve reconciliations.


===========================================================
REPORT GENERATION
===========================================================

Implement report services.


Generate:


Excel

PDF

CSV


Reports:


Audit report

GST report

Reconciliation report

Exception report

Financial summary


===========================================================
CORS AND FRONTEND CONNECTION
===========================================================

Configure FastAPI CORS.


Allow:

localhost Vite development server

Electron localhost communication


Add environment configuration:


API_HOST

API_PORT

DATABASE_PATH

JWT_SECRET

STORAGE_PATH


The frontend should communicate through:

localhost REST APIs.


===========================================================
BACKGROUND PROCESSING
===========================================================

Long-running tasks:


OCR

PDF conversion

AI processing

Reconciliation


Should not block API requests.


Use lightweight background tasks appropriate for desktop scale.

Do not introduce unnecessary distributed queues.

===========================================================
LOGGING
===========================================================

Implement:


Application logs

Error logs

Processing logs

Security events


Never log:

Passwords

JWT tokens

Client financial documents

Sensitive extracted data

===========================================================
SECURITY REQUIREMENTS
===========================================================

Implement:


Prepared database operations

Input validation

File validation

Role checks

Secure authentication

Safe file paths

Checksum verification


Follow offline-first principles.

No external transmission of client data.

===========================================================
TESTING
===========================================================

Add basic tests for:


Authentication

Database operations

Client CRUD

Document upload

Health endpoint


Focus on reliable core workflows.

Do not create excessive testing infrastructure.

===========================================================
END-TO-END EXAMPLE
===========================================================

Implement one complete working flow:


User logs in

↓

Uploads PDF invoice

↓

Backend stores document

↓

OCR extracts text

↓

Metadata extracted

↓

PDF converted to Excel

↓

Frontend receives result

↓

User downloads generated file


===========================================================
FINAL IMPLEMENTATION RULES
===========================================================

The backend must:

- Work locally.
- Support Electron startup.
- Respect existing frontend APIs.
- Remain modular.
- Be production oriented.
- Keep accounting logic deterministic.
- Use AI only as assistance.
- Avoid unnecessary complexity.

Most importantly:

NEVER TOUCH THE EXISTING FRONTEND FOLDER.

Build alongside it and connect through APIs.

===========================================================

That's the backend, fully specified in one prompt. Come back anytime to revise a document or regenerate a prompt.