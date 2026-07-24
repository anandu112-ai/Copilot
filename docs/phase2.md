# CA Copilot V2 – Database Architecture & Supabase Integration

You are a senior database architect.

Analyze the existing CA Copilot project before making any changes.

Current stack:

* Electron
* React 18
* TypeScript
* FastAPI
* SQLite

Do NOT remove SQLite.

Implement a hybrid database architecture using SQLite (offline) and Supabase PostgreSQL (cloud).

## Objectives

Design a scalable enterprise-grade database for Chartered Accountant firms.

Support:

* Single user
* Multiple employees
* Multiple organizations
* Multiple branches
* Thousands of clients
* Millions of accounting records

The system must remain offline-first.

---

## SQLite Database

SQLite remains the primary working database.

Store locally:

* Clients
* Companies
* Documents
* OCR Results
* AI Responses
* GST Data
* Bank Statements
* Ledger Data
* Reconciliation Results
* Cached User Data
* Local Settings
* Notification Cache
* Sync Queue
* Failed Sync Queue
* Local Logs

Every table should contain:

* local_id
* cloud_id
* sync_status
* created_at
* updated_at
* deleted_at
* last_synced_at

Support soft delete.

---

## Supabase Database

Design PostgreSQL schema.

Create normalized tables.

Users

Organizations

Branches

Employees

Clients

Companies

Projects

Documents

OCR Results

Invoices

Bank Statements

Ledger Entries

GST Returns

Audit Reports

Tasks

Comments

Notifications

Subscriptions

Audit Logs

User Sessions

Device Registry

System Settings

Every table should include:

UUID primary key

created_at

updated_at

created_by

updated_by

organization_id

deleted_at

version_number

---

## Relationships

One Organization

↓

Many Branches

↓

Many Employees

↓

Many Clients

↓

Many Documents

↓

Many AI Processing Results

Implement proper foreign keys.

---

## Row Level Security

Implement Supabase Row Level Security.

Rules:

Users can only access their organization.

Managers can access their branch.

Partners can access everything.

Articles only access assigned clients.

Read-only users cannot modify data.

---

## Sync Tables

Design synchronization metadata.

Track:

* Upload pending
* Download pending
* Conflict detected
* Sync success
* Retry count
* Last sync time

---

## Indexes

Create indexes for:

organization_id

client_id

document_id

employee_id

branch_id

sync_status

created_at

updated_at

Search performance should remain excellent even with millions of records.

---

## File Storage

Use Supabase Storage.

Buckets:

documents

bank-statements

gst-files

audit-reports

images

exports

Each file should have metadata stored in PostgreSQL.

---

## Security

Encrypt sensitive local data.

Never store plaintext passwords.

Use JWT authentication.

Enable Row Level Security.

Validate all input.

---

## Deliverables

Generate:

1. Complete Entity Relationship Diagram (ERD)
2. PostgreSQL schema
3. SQLite schema
4. Migration strategy
5. Synchronization strategy
6. API contract
7. Folder structure
8. SQL migration files
9. Supabase initialization code
10. Database service layer

Do not implement immediately.

First analyze the current project and produce the complete database architecture for review before writing code.
