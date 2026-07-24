# CA Copilot V2 – Enterprise Offline Sync Engine

You are a Principal Distributed Systems Engineer.

Analyze the existing CA Copilot project before implementing changes.

Current Technology Stack

Frontend

* Electron
* React 18
* TypeScript
* Tailwind CSS

Backend

* FastAPI
* Python

Local Database

* SQLite

Cloud

* Supabase PostgreSQL
* Supabase Storage
* Supabase Authentication

The application is Offline First.

Never remove offline support.

---

# Objective

Implement a production-grade synchronization engine similar to:

Microsoft OneDrive

Dropbox

Notion

Figma

Linear

The application should automatically synchronize data between SQLite and Supabase.

Users should never manually click Sync.

Everything happens automatically.

---

# Synchronization Rules

SQLite is the local working database.

Supabase is the cloud collaboration database.

When offline:

Save everything locally.

When internet returns:

Automatically synchronize.

Never lose user data.

---

# Sync Engine

Create a dedicated Sync Service.

Responsibilities:

Detect internet connectivity.

Detect authentication state.

Monitor SQLite changes.

Monitor Supabase changes.

Upload pending records.

Download remote updates.

Resolve conflicts.

Retry failed uploads.

Run continuously in the background.

Support cancellation and recovery.

---

# Change Tracking

Every database operation should generate a sync event.

Track:

Insert

Update

Delete

Restore

File Upload

AI Result

Notification

Comment

Task

Every event should have:

Operation ID

Record ID

Table

User

Timestamp

Version

Device ID

Sync Status

Retry Count

Priority

---

# Synchronization Queue

Implement queue-based synchronization.

States:

Pending

Uploading

Downloading

Synced

Conflict

Failed

Retrying

Cancelled

Persist queue locally.

Queue should survive application restart.

---

# Conflict Resolution

Detect concurrent edits.

If two users edit the same record:

Show comparison UI.

Allow:

Keep Local

Keep Cloud

Merge Fields

Create Duplicate

Store conflict history.

---

# Versioning

Every synchronized record should include:

Version Number

Last Modified

Modified By

Device ID

Hash

Previous Version

Support optimistic concurrency.

---

# Background Worker

Create background worker.

Runs every few seconds.

Responsibilities:

Retry failures.

Upload pending changes.

Download updates.

Refresh notifications.

Refresh assignments.

Check subscriptions.

Refresh user permissions.

Should consume minimal CPU.

---

# Realtime Collaboration

Use Supabase Realtime.

Synchronize instantly:

Clients

Documents

Tasks

Comments

Notifications

Assignments

Status Changes

Show live updates.

---

# File Synchronization

Synchronize:

PDF

Excel

Images

Invoices

GST Files

Audit Reports

Use chunk uploads for large files.

Resume interrupted uploads.

Validate checksum after upload.

Store local cache.

---

# Offline Cache

Cache:

Recent Clients

Recent Documents

Assigned Tasks

Notifications

User Profile

Settings

AI Responses

Implement automatic cache cleanup.

---

# Sync Dashboard

Create UI.

Display:

Internet Status

Sync Status

Pending Uploads

Pending Downloads

Conflicts

Storage Usage

Last Sync

Current Activity

Failed Items

Retry Button

---

# Notifications

Notify users when:

Sync Complete

Sync Failed

Conflict Detected

Internet Restored

Cloud Updated

New Assignment

---

# Logging

Maintain detailed logs.

Track:

Sync Duration

Data Size

Errors

Retries

Performance

Network Latency

Store logs locally.

Upload diagnostic logs only with user permission.

---

# Performance

Support:

100,000+ Clients

Millions of Transactions

Large PDF Collections

Thousands of Concurrent Sync Operations

Minimize:

Memory Usage

CPU Usage

Network Usage

Battery Consumption

---

# Security

Encrypt local sync metadata.

Validate JWT before every cloud request.

Protect against duplicate uploads.

Prevent replay attacks.

Validate file integrity.

Never expose organization data to other tenants.

---

# Deliverables

Analyze the existing project first.

Then implement incrementally.

Phase 1

Sync Framework

Queue

Background Worker

Phase 2

SQLite ↔ Supabase Sync

Realtime Updates

Conflict Detection

Phase 3

Conflict Resolution UI

Sync Dashboard

Notifications

Phase 4

Performance Optimization

Stress Testing

Production Hardening

Reuse existing services wherever possible.

Do not break current application behavior.

The final implementation should provide seamless offline-first synchronization suitable for enterprise CA firms with hundreds of employees.
