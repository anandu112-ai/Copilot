# db_er.md

# CA Copilot — Database & Entity Relationship Design

## Database Strategy

CA Copilot uses a modular SQLite architecture to separate responsibilities while remaining fully offline.

### Primary Databases

### 1. `ca_copilot.db`

Core application database.

Contains:

* Users
* Firms
* Clients
* Documents
* Projects
* Reports
* Settings
* Dashboard metadata
* Activities

---

### 2. `reconciliation.db`

Dedicated reconciliation engine.

Contains:

* Bank reconciliation
* GST reconciliation
* Ledger reconciliation
* Match history
* AI suggestions
* Exception records

---

### Future Databases

### `ai_cache.db`

* Prompt cache
* LLM responses
* Embeddings
* Semantic search index
* Conversation memory
* Model metadata

---

### `audit_history.db`

* Audit observations
* Risk scoring
* Fraud detection history
* Working papers
* Audit logs

---

# Core Entities

---

## Users

Stores authentication and profile information.

### Fields

* id (UUID)
* name
* email
* phone
* password_hash
* role
* firm_id
* status
* last_login
* created_at
* updated_at

### Constraints

Unique

* email

Indexes

* email
* firm_id
* role

---

## Firms

Represents an accounting firm.

### Fields

* id
* firm_name
* registration_number
* gst_number
* pan
* address
* contact_email
* phone
* logo_path
* created_at

Indexes

* gst_number
* registration_number

---

## Clients

Represents client organizations.

### Fields

* id
* firm_id
* client_name
* gstin
* pan
* business_type
* financial_year
* address
* email
* phone
* notes
* created_at

Indexes

* gstin
* pan
* client_name
* firm_id

Unique

* gstin (where applicable)

---

## Projects

Represents work assignments.

### Fields

* id
* client_id
* project_type
* title
* status
* assigned_user
* start_date
* due_date
* completed_at

Indexes

* client_id
* assigned_user
* status

---

## Documents

Stores uploaded files.

### Fields

* id
* client_id
* project_id
* filename
* original_filename
* file_type
* category
* storage_path
* checksum
* size
* upload_date
* uploaded_by
* processing_status

Indexes

* client_id
* project_id
* category
* checksum
* processing_status

Unique

* checksum

---

## OCR Results

Stores extracted text.

### Fields

* id
* document_id
* engine
* extracted_text
* confidence_score
* processing_time
* created_at

Indexes

* document_id

---

## Document Metadata

Stores structured extraction.

### Fields

* id
* document_id
* document_type
* invoice_number
* gstin
* pan
* vendor
* customer
* invoice_date
* taxable_amount
* gst_amount
* total_amount

Indexes

* document_id
* document_type
* gstin
* invoice_number

---

## PDF to Excel Jobs

Tracks conversion history.

### Fields

* id
* document_id
* status
* sheet_count
* exported_file
* processing_time
* created_by
* created_at

Indexes

* status
* document_id

---

## Reports

Generated reports.

### Fields

* id
* client_id
* report_type
* generated_by
* export_format
* file_path
* created_at

Indexes

* client_id
* report_type

---

## Activities

Audit trail of application activity.

### Fields

* id
* user_id
* activity_type
* entity_type
* entity_id
* description
* created_at

Indexes

* user_id
* activity_type
* created_at

---

## Settings

Stores application configuration.

### Fields

* id
* user_id
* theme
* ai_provider
* ai_model
* ocr_engine
* export_defaults
* backup_path
* updated_at

Indexes

* user_id

---

# Reconciliation Database

---

## Bank Accounts

Fields

* id
* client_id
* account_name
* account_number
* bank_name
* ifsc
* created_at

Indexes

* client_id
* account_number

---

## Bank Transactions

Fields

* id
* account_id
* txn_date
* narration
* reference_number
* debit
* credit
* balance
* source_document

Indexes

* account_id
* txn_date
* reference_number

---

## Ledger Entries

Fields

* id
* client_id
* voucher_number
* ledger_name
* txn_date
* debit
* credit
* narration

Indexes

* client_id
* voucher_number
* txn_date

---

## GST Records

Fields

* id
* client_id
* gst_type
* gstin
* invoice_number
* invoice_date
* taxable_value
* tax_amount
* source

Indexes

* client_id
* gstin
* invoice_number

---

## Reconciliation Sessions

Each reconciliation run.

Fields

* id
* client_id
* reconciliation_type
* created_by
* status
* started_at
* completed_at

Indexes

* client_id
* reconciliation_type
* status

---

## Match Results

Stores reconciliation matches.

Fields

* id
* session_id
* left_record_id
* right_record_id
* confidence
* match_type
* ai_suggested
* accepted_by_user

Indexes

* session_id
* confidence
* ai_suggested

---

## Exceptions

Stores unmatched items.

Fields

* id
* session_id
* record_type
* reason
* severity
* resolved
* resolved_by
* resolved_at

Indexes

* session_id
* severity
* resolved

---

# Entity Relationships

```
Firm
 ├── Users
 ├── Clients
 │     ├── Projects
 │     │      ├── Documents
 │     │      │      ├── OCR Results
 │     │      │      ├── Document Metadata
 │     │      │      └── PDF→Excel Jobs
 │     │      ├── Reports
 │     │      └── Activities
 │     │
 │     ├── Bank Accounts
 │     │      └── Bank Transactions
 │     │
 │     ├── Ledger Entries
 │     ├── GST Records
 │     └── Reconciliation Sessions
 │             ├── Match Results
 │             └── Exceptions
 │
 └── Settings
```

# Indexing Strategy

High-frequency indexes include:

* email
* gstin
* pan
* invoice_number
* voucher_number
* checksum
* client_id
* project_id
* document_id
* reconciliation session IDs
* transaction dates
* upload dates
* activity timestamps

# Design Principles

* Use UUIDs for primary keys to simplify future synchronization and cross-database references.
* Store immutable document files on disk; persist only metadata and file paths in SQLite.
* Separate reconciliation data into its own database to isolate high-volume transactional operations.
* Keep AI-generated outputs (summaries, embeddings, cached responses) outside the core application database to avoid unnecessary growth.
* Enforce foreign-key constraints and transactional writes to maintain data integrity across related entities.
* Design entities to support future enterprise features such as multi-firm deployments, plugin modules, optional encrypted cloud synchronization, and local AI indexing without requiring major schema redesign.
