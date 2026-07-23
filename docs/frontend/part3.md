===========================================================
CA COPILOT FRONTEND MASTER PROMPT
PART 3 — ADVANCED ACCOUNTING MODULES + FINAL REQUIREMENTS
===========================================================

Continue from Part 1 and Part 2.

The application is an existing production desktop platform.

Do not rewrite existing architecture.

Extend the existing React + TypeScript + Electron application.

===========================================================
BANK RECONCILIATION MODULE
===========================================================

Route

/reconciliation/bank


Purpose

Allow users to reconcile bank statements with accounting records.


Main Workflow

Import Data

↓

Transaction Processing

↓

Automatic Matching

↓

Review Suggestions

↓

Manual Adjustment

↓

Finalize Reconciliation


Screens


1. Bank Reconciliation Dashboard

Display:

- Active reconciliations
- Completed reconciliations
- Pending matches
- Exceptions
- Success percentage


Widgets:

Total Transactions

Matched

Unmatched

AI Suggested Matches

Exceptions


2. New Reconciliation


Steps:

Select Client

Select Bank Account

Upload Statement

Select Ledger Source

Start Processing


3. Matching Workspace


Layout:

------------------------------------------------

Bank Transactions | Ledger Entries

------------------------------------------------


Features:

- Side-by-side comparison
- Match suggestions
- Confidence score
- Match reason
- Date comparison
- Amount comparison
- Narration similarity


Actions:

Accept Match

Reject Match

Manual Match

Split Match

Ignore

Add Note


Filters:

Matched

Unmatched

High Confidence

Low Confidence

Amount Difference

Date Difference


4. Exceptions Panel


Display:

Missing Entries

Duplicate Transactions

Wrong Amount

Wrong Date

Unknown Transactions


===========================================================
GST RECONCILIATION MODULE
===========================================================


Route

/reconciliation/gst


Purpose

Compare GST records and identify mismatches.


Workflow

Upload

↓

Process

↓

Compare

↓

Review Exceptions

↓

Generate Report


Data Sources:

Purchase Register

GSTR-2B

GSTR-1

Sales Register


Dashboard


Cards:

Invoices Compared

Matched

Missing

Tax Difference

GST Difference


Comparison Table


Columns:

Invoice Number

Supplier

GSTIN

Invoice Date

Taxable Value

GST Amount

Status

Difference


Statuses:

Matched

Missing

Mismatch

Duplicate

Invalid GSTIN


AI Suggestions:

Explain mismatch

Suggest correction

Prioritize issues


===========================================================
LEDGER RECONCILIATION MODULE
===========================================================


Route

/reconciliation/ledger


Purpose

Compare accounting ledger data.


Compare:

General Ledger

Bank Entries

Invoices

Payments

Journal Entries


Features:

Mismatch detection

Duplicate posting detection

Missing entries

Incorrect classification


Workspace:

Ledger List

Transaction Viewer

Exception Panel

Resolution Panel


===========================================================
AUDIT INTELLIGENCE MODULE
===========================================================


Route

/audit


Purpose

Assist auditors with intelligent review.


Dashboard


Display:

Audit Projects

Risk Score

Findings

Pending Reviews

Completed Checks


Modules:

Duplicate Invoice Detection

Suspicious Transactions

Vendor Analysis

Journal Review

Vouching Assistant

Risk Analysis


Risk Card


Show:

Risk Level

Reason

Affected Transactions

Evidence


Severity:

Low

Medium

High

Critical


===========================================================
VOUCHING ASSISTANT
===========================================================


Inside:

/audit/vouching


Workflow:

Select Transaction

↓

Find Supporting Documents

↓

Compare Values

↓

Generate Result


Compare:

Invoice

Voucher

Ledger Entry

Bank Entry

GST Entry


Results:

Verified

Mismatch

Missing Document

Duplicate

Needs Review


===========================================================
REPORTING MODULE
===========================================================


Route

/reports


Report Types:


Audit Report

GST Report

Bank Reconciliation Report

Exception Report

Risk Report

Financial Summary

Management Report


Report Builder


Steps:

Select Report

↓

Select Client

↓

Select Date Range

↓

Configure Filters

↓

Preview

↓

Export


Exports:

Excel

PDF

CSV

JSON

XML

ZIP


Features:

Templates

Save Configuration

Recent Reports

Scheduled Reports (future)


===========================================================
ANALYTICS MODULE
===========================================================


Route

/analytics


Dashboard


Charts:

Document Processing

Conversion Trends

GST Status

Reconciliation Progress

Audit Completion

Financial Metrics


Filters:

Client

Financial Year

Date Range


===========================================================
COMPLIANCE CALENDAR
===========================================================


Route

/compliance


Purpose:

Track compliance deadlines.


Events:

GST Filing

Income Tax

TDS

Audit Dates

Custom Reminders


Features:

Calendar View

Timeline View

Notifications

Due Status

Assigned User


===========================================================
AI COPILOT MODULE
===========================================================


Route

/copilot


Purpose:

Provide an intelligent assistant across the application.


UI


Dockable panel.

Available globally.


Components:


Conversation Area

Input Box

Suggestions

Context Indicator

Actions


Example Requests:


"Find unmatched bank transactions."


"Show duplicate invoices."


"Generate audit summary."


"Explain this ledger."


"Convert these documents to Excel."


Features:

Conversation History

Clear Chat

Export Chat

Context Awareness

Suggested Actions


Future Ready:

Tool Calling

Agent Workflows

Memory

RAG

Multi Model Routing


===========================================================
AI RESULT DESIGN RULES
===========================================================


Every AI result must show:


Recommendation

Confidence

Reason

Source Data

Action Options


Actions:


Accept

Reject

Modify

Ignore


Never silently modify accounting data.


===========================================================
GLOBAL UX REQUIREMENTS
===========================================================


All modules must include:


Loading State

Empty State

Error State

Success Feedback

Confirmation Dialogs


Never show blank screens.


===========================================================
ACCESSIBILITY
===========================================================


Support:

Keyboard Navigation

Focus Indicators

Screen Reader Labels

Proper Contrast

ARIA Attributes

Accessible Forms


===========================================================
DESKTOP EXPERIENCE
===========================================================


Optimize for:


Windows Desktop First


Support:

1920x1080

1366x768

Large Monitors


Features:

Resizable Windows

Multi Window Ready

Keyboard Shortcuts

Context Menus


===========================================================
PERFORMANCE REQUIREMENTS
===========================================================


Implement:


Lazy Loading

Code Splitting

Virtualized Tables

Memoized Components

Optimized Rendering


Large datasets should remain responsive.


===========================================================
ERROR HANDLING
===========================================================


Every API call must handle:


Loading

Success

Failure


Errors should display:

User friendly message

Retry action

Technical details option


===========================================================
SECURITY REQUIREMENTS
===========================================================


Frontend must:


Never store passwords.

Never bypass backend permissions.

Never expose secrets.

Validate user actions.

Respect role permissions.


Electron:


Use secure IPC only.

Do not access Node APIs directly from renderer.


===========================================================
FINAL ACCEPTANCE CRITERIA
===========================================================


The completed frontend should:


✓ Feel like professional accounting software

✓ Support CA workflows

✓ Work completely offline

✓ Integrate with FastAPI backend

✓ Maintain existing Electron architecture

✓ Use TypeScript correctly

✓ Use reusable components

✓ Support future AI modules

✓ Handle large financial datasets

✓ Provide transparent AI assistance

✓ Never replace deterministic accounting logic


===========================================================
FINAL INSTRUCTION TO CODING AGENT
===========================================================


Build CA Copilot as a production-grade desktop accounting platform.

Prioritize:

Reliability

Clarity

Security

Maintainability

Professional UX

Accounting workflow efficiency


Do not build a demo.

Build the foundation of an enterprise application.