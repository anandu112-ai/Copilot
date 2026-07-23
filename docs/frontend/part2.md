===========================================================
CA COPILOT FRONTEND MASTER PROMPT
PART 2 — BUSINESS MODULES
===========================================================

Continue using the existing project.

Never replace existing modules.

Only extend them.

===========================================================
CLIENT MANAGEMENT MODULE
===========================================================

Create a complete Client Management workspace.

Route

/clients

Views

• Client List
• Client Details
• Client Timeline
• Documents
• Financial Years
• Notes
• Assigned Staff

Toolbar

New Client

Import

Export

Search

Filter

Sort

Bulk Actions

Table Columns

Client Name

GSTIN

PAN

Business Type

Financial Year

Assigned Staff

Status

Last Activity

Created Date

Actions

Features

Pagination

Column Sorting

Column Resize

Saved Filters

Quick Search

Row Selection

Context Menu

Archive

Restore

Delete (soft delete)

Client Details Page

Tabs

Overview

Documents

Projects

Reports

Reconciliations

Audit

Notes

Activity

Display

GST

PAN

Address

Phone

Email

Business Type

Financial Year

Tags

Relationships

===========================================================
FIRM MANAGEMENT
===========================================================

Route

/firms

Sections

Firm Profile

Partners

Employees

Branches

Permissions

Branding

Templates

Settings

Branding

Upload Logo

Letterhead

Invoice Templates

Report Templates

Watermarks

Permissions

Role Matrix

Admin

CA

Staff

Client

Future Permission Editor

===========================================================
DOCUMENT MANAGEMENT
===========================================================

Route

/documents

Layout

------------------------------------------------

Folders

Document List

Preview Panel

------------------------------------------------

Supported Files

PDF

Excel

CSV

Word

Images

ZIP

Features

Drag & Drop

Multiple Upload

Rename

Delete

Restore

Favorite

Tags

Categories

Version History

Metadata

Duplicate Detection

Checksum Display

AI Summary

OCR Status

Search

Filters

Date

Type

Client

Project

Tags

Status

Processing Queue

Preview

Use split layout

Document metadata

Right panel

Preview

PDF Preview

Image Preview

Excel Preview

Text Preview

Toolbar

Upload

Download

Delete

Rename

Share (future)

Export

===========================================================
PDF VIEWER
===========================================================

Route

/pdf-viewer

Capabilities

Zoom

Rotate

Fit Width

Fit Height

Search Text

Page Navigation

Thumbnail Sidebar

Bookmark Placeholder

Selection

Highlight

Copy Text

Open OCR

Open AI Analysis

Open Convert to Excel

===========================================================
OCR MODULE
===========================================================

Route

/ocr

Workflow

Upload

↓

OCR Processing

↓

Confidence

↓

Editable Text

↓

Save

↓

Export

Display

Original Document

Recognized Text

Confidence %

Engine Used

Processing Time

Features

Retry

Copy

Download

Search

Replace

Find

Side-by-side comparison

===========================================================
AI DOCUMENT UNDERSTANDING
===========================================================

Route

/document-ai

Display

Detected Type

Confidence

Extracted Metadata

Invoice Number

GSTIN

PAN

Vendor

Customer

Invoice Date

Items

Taxes

Totals

AI Summary

Suggested Actions

Confidence Indicator

Editable Metadata Grid

Actions

Accept

Reject

Edit

Re-run AI

===========================================================
PDF TO EXCEL
===========================================================

Route

/pdf-to-excel

Workflow

Upload PDF

↓

Auto Detect Tables

↓

Extraction

↓

Review Grid

↓

Validation

↓

Export

Review Grid Features

Editable Cells

Insert Rows

Delete Rows

Merge

Split

Search

Filter

Undo

Redo

Duplicate Detection

Validation Errors

Excel Export Options

Single Sheet

Multiple Sheets

Formatting

Formula Generation

Totals

Conditional Formatting

History

Show previous conversions

Re-download exports

===========================================================
GLOBAL SEARCH
===========================================================

Route

/search

Search Across

Clients

Documents

Invoices

GST

Reports

Transactions

Audit Findings

Reconciliation

AI Conversations (future)

Display

Grouped Results

Highlight Matches

Filters

Date

Module

Type

Client

Sort

Recent Searches

===========================================================
SETTINGS
===========================================================

Route

/settings

Sections

General

Appearance

AI

OCR

Export

Security

Backup

Database

About

General

Language

Timezone

Date Format

Currency

Appearance

Dark

Light

System

Accent Color

Density

AI

Provider

Model

Temperature

Context Size

Memory

OCR

Default Engine

Language Packs

Confidence Threshold

Export

Excel

CSV

PDF

Default Folder

Security

Password

Sessions

Auto Lock

Database

Optimization

Integrity Check

Vacuum

Backup

Backup Folder

Auto Backup

Restore

Schedule

About

Version

Electron Version

Python Version

Database Version

License

===========================================================
TABLE COMPONENT STANDARD
===========================================================

Every data table should support

Sorting

Filtering

Pagination

Column Visibility

Column Resize

Sticky Header

Keyboard Navigation

Row Selection

Bulk Actions

Export

CSV

Excel

Print

Virtual Scrolling

Loading Skeleton

Empty State

Error State

===========================================================
FORM STANDARDS
===========================================================

Every form should support

Validation

Dirty State

Autosave where appropriate

Reset

Cancel

Loading

Success Toast

Error Toast

Keyboard Navigation

Accessible Labels

===========================================================
NOTIFICATIONS
===========================================================

Create a notification center.

Supports

Success

Warning

Information

Error

Background Jobs

Dismiss

Mark All Read

Persistent Notifications

===========================================================
BACKGROUND TASKS
===========================================================

Create a task manager panel.

Display

OCR Jobs

PDF Conversion

AI Analysis

Reconciliation

Exports

Status

Queued

Running

Completed

Failed

Cancelled

Allow

Retry

Cancel

View Logs

===========================================================
END OF PART 2

Continue using existing architecture.

Never replace working components.

Everything must integrate cleanly with the existing codebase.