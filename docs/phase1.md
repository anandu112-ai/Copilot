# CA Copilot V2 – Hybrid Offline + Cloud Architecture Implementation

You are a senior software architect and full-stack engineer.

I already have an existing CA Copilot application.

**Do NOT rewrite the project from scratch.**
Extend and integrate with the existing codebase while preserving current functionality.

---

## Project Overview

CA Copilot is an AI-powered desktop application for Chartered Accountants.

Current stack:

* Electron
* React 18
* TypeScript
* Tailwind CSS
* FastAPI (Python)
* SQLite

The application currently supports local AI processing, document management, OCR, PDF processing, reconciliation, and related accounting workflows.

The goal is to transform it into an enterprise-grade application for CA firms with multiple employees while maintaining offline functionality.

---

# Primary Architecture

Implement an **Offline-First Hybrid Architecture**.

```
Electron Desktop
        │
        ▼
React + TypeScript
        │
        ▼
FastAPI Local Engine
        │
        ▼
SQLite Local Database
        │
Automatic Sync Engine
        │
        ▼
Supabase Cloud
```

The desktop application must always function without internet.

Internet should only be required for:

* Authentication
* Cloud synchronization
* Team collaboration
* Cloud backup
* Notifications

If internet is unavailable:

* Continue using SQLite.
* Queue all changes.
* Synchronize automatically when internet returns.

---

# Database Architecture

## Local Database

Continue using SQLite.

Store:

* Clients
* Companies
* Documents
* OCR Results
* AI Responses
* Reconciliation Data
* User Preferences
* Cached Cloud Data
* Sync Queue
* Local Logs

SQLite remains the primary working database.

---

## Cloud Database

Integrate Supabase PostgreSQL.

Store:

* Users
* Organizations
* Teams
* Clients
* Shared Documents
* Shared Reconciliation Data
* Audit Logs
* Subscription Information
* Cloud Backups
* Application Settings

---

# Authentication

Use Supabase Authentication.

Support:

* Email & Password
* Google Login
* Microsoft Login
* Password Reset
* Email Verification
* Session Refresh

Persist login securely.

---

# Organization System

A user can create an Organization.

Example:

ABC Chartered Accountants

Organization contains:

* Employees
* Clients
* Documents
* Permissions
* Branches

---

# Employee Management

Allow organization admin to invite employees.

Roles:

* Super Admin
* Partner
* Manager
* Auditor
* CA
* Article Assistant
* Data Entry Operator
* Read Only

Implement Role Based Access Control (RBAC).

---

# Client Management

Clients belong to Organizations.

Support:

* Assign client to employee
* Multiple employees on one client
* Client permissions
* Shared documents
* Shared audit notes

---

# Cloud Storage

Use Supabase Storage.

Store:

* PDF
* Excel
* Images
* GST Files
* Bank Statements
* Audit Files
* AI Reports

Local copies remain cached.

---

# Sync Engine

Create a background synchronization service.

Responsibilities:

* Detect internet connection
* Upload pending changes
* Download remote updates
* Resolve conflicts
* Retry failed sync
* Background execution
* Show sync status

Implement queue-based synchronization.

Never lose user data.

---

# Conflict Resolution

When two users edit the same record:

Use:

Last Modified Timestamp

If conflict occurs:

Show comparison dialog.

Allow:

* Keep Local
* Keep Cloud
* Merge

---

# Offline Mode

Application must continue working if:

* Internet unavailable
* Supabase unavailable

Display:

Offline Mode

Automatically sync later.

---

# Audit Log

Track:

* Login
* Logout
* Upload
* Delete
* Edit
* AI Processing
* Export
* Import

Store:

* User
* Time
* Action
* Device
* IP (when available)

---

# Notifications

Implement notification system.

Notify:

* Assigned client
* Document uploaded
* Reconciliation completed
* Audit completed
* Employee invitation
* Sync failure

---

# Security

Implement:

* Row Level Security
* JWT Authentication
* Encrypted Local Storage
* Secure Tokens
* SQL Injection Protection
* Input Validation
* CSRF Protection where applicable

---

# Settings

Allow configuration for:

* Sync Interval
* Offline Cache Size
* Theme
* Language
* Organization
* Backup Frequency

---

# Desktop Packaging

Prepare production builds.

Generate:

* Windows Installer (.exe)
* Auto Update Support
* Application Icons
* Installer Configuration

---

# Folder Structure

Keep existing structure.

Add:

apps/
├── desktop/
│   ├── components/
│   ├── pages/
│   ├── services/
│   │    ├── sync/
│   │    ├── auth/
│   │    ├── supabase/
│   │    ├── sqlite/
│   │    └── notifications/
│   ├── hooks/
│   ├── contexts/
│   └── types/
│
└── processor/

Do not break existing modules.

---

# Code Quality

* TypeScript strict mode
* Modular architecture
* SOLID principles
* Reusable components
* Proper error handling
* Logging
* Documentation
* Clean folder structure

---

# Migration Strategy

Do NOT replace SQLite.

Instead:

1. Preserve all current SQLite functionality.
2. Integrate Supabase alongside it.
3. Add synchronization layer.
4. Migrate existing local users and data when needed.
5. Keep backward compatibility.

---

# Deliverables

Implement incrementally.

Phase 1:

* Supabase setup
* Authentication
* Organization model

Phase 2:

* Sync engine
* Cloud storage
* Background synchronization

Phase 3:

* Multi-user collaboration
* RBAC
* Notifications

Phase 4:

* Auto updates
* Installer
* Performance optimization
* Production readiness

Before modifying any code, analyze the existing project structure and reuse current components and services wherever possible. Avoid unnecessary rewrites.
