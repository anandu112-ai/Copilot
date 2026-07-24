# CA Copilot V2 – Authentication, Organization & Multi-Tenant System

You are a senior software architect building an enterprise-grade accounting platform.

Analyze the existing CA Copilot project before making changes.

Current Stack:

* Electron
* React 18
* TypeScript
* Tailwind CSS
* FastAPI
* SQLite
* Supabase (already integrated)

Do NOT rewrite existing modules.

Extend the current architecture.

---

# Goal

Transform CA Copilot from a single-user application into a multi-tenant enterprise platform.

One installation should support:

* Multiple CA Firms
* Multiple Branches
* Multiple Employees
* Multiple Clients
* Role Based Access Control

---

# Authentication

Use Supabase Authentication.

Implement:

* Email Login
* Password Login
* Google Login
* Microsoft Login
* Email Verification
* Forgot Password
* Password Reset
* Refresh Tokens
* Remember Me
* Secure Session Management

Persist login securely.

Desktop application should automatically restore the session.

---

# Organization System

First login creates:

Organization

Example:

ABC Chartered Accountants

Organization contains:

* Employees
* Branches
* Clients
* Documents
* Audit Data
* AI Processing
* Reports
* Settings

One user may belong to multiple organizations.

Allow organization switching.

---

# Branch Management

Each organization can have:

Unlimited branches.

Example:

ABC CA

↓

Trivandrum Branch

↓

Kochi Branch

↓

Calicut Branch

Each branch has:

* Employees
* Clients
* Documents

---

# Employee Management

Allow Admin to:

Invite employee by email.

Pending invitation.

Accept invitation.

Assign employee to branch.

Deactivate employee.

Suspend employee.

Remove employee.

Restore employee.

---

# User Roles

Implement RBAC.

Roles:

Super Admin

Partner

Manager

Senior Auditor

CA

Article Assistant

Data Entry Operator

Viewer

Each role has configurable permissions.

Permission examples:

Create Client

Delete Client

Upload Documents

View Reports

Export Excel

Run AI

Approve Audit

Manage Employees

Manage Billing

---

# Permission Engine

Create centralized permission middleware.

Frontend

Backend

API

Database

Everything should check permissions.

Never trust frontend permissions.

---

# User Profile

Every user has:

Profile Photo

Full Name

Designation

Employee ID

Phone

Email

Branch

Department

Skills

Working Status

Last Login

Devices

---

# Client Assignment

Managers can assign:

Client

↓

Employee

↓

Team

Support:

One client

↓

Many employees

Track assignment history.

---

# Team Management

Create Teams.

Example:

GST Team

Audit Team

Tax Team

Internal Audit Team

Each team has:

Leader

Members

Permissions

Assigned Clients

---

# Device Management

Track desktop installations.

Each login records:

Device ID

Machine Name

OS

Application Version

Last Sync

Last Login

Allow Admin to:

View devices

Deactivate devices

Force logout

---

# Security

Implement:

Session timeout

JWT validation

Secure token storage

Multi-device login

Maximum device limit

Failed login protection

Audit logging

Optional Two-Factor Authentication

---

# Organization Settings

Allow organization admin to configure:

Firm Name

GST Number

PAN

Logo

Address

Branches

Working Hours

Fiscal Year

Currency

Time Zone

Language

---

# UI

Create modern desktop interfaces for:

Login

Register

Forgot Password

Organization Creation

Organization Switcher

Employee Dashboard

Invitation Management

Branch Management

Team Management

Role Management

Profile Management

Settings

Follow the existing design system.

---

# API

Create services for:

Authentication

Organizations

Branches

Employees

Roles

Permissions

Invitations

Teams

Profiles

Devices

---

# Deliverables

Analyze the existing project first.

Then implement incrementally:

Phase 1

Authentication

Organizations

Session Management

Phase 2

Branches

Employees

Invitations

Phase 3

Roles

Permissions

Teams

Phase 4

Device Management

Security

Audit Logs

Reuse existing code wherever possible.

Do not break current functionality.

Maintain offline-first architecture with SQLite and synchronize all identity and organization data with Supabase when online.
