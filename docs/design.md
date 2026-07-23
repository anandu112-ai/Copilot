# design.md

# CA Copilot — Product Design Specification

## Design Philosophy

CA Copilot is a professional desktop application designed for accountants and auditors who spend long hours working with financial data. The interface should prioritize clarity, efficiency, and consistency over visual novelty.

The design principles are:

* Professional and enterprise-grade
* Minimal learning curve
* Fast access to common workflows
* Information-dense where appropriate
* AI integrated naturally into workflows
* Keyboard-friendly
* Offline-first experience
* Accessible and scalable for large datasets

---

# Visual Language

## Theme

* Default: Dark Mode
* Optional: Light Mode
* Neutral color palette with restrained accent colors
* Consistent spacing using an 8px grid

## Typography

* Clean sans-serif font
* Clear hierarchy:

  * Page titles
  * Section headings
  * Card titles
  * Body text
  * Metadata
* Tabular numbers for financial values

## Iconography

Use **Lucide React** icons consistently.

Examples:

* Dashboard
* Clients
* Documents
* OCR
* PDF to Excel
* GST
* Bank
* Ledger
* Audit
* Reports
* Settings
* AI Copilot

---

# Overall Layout

```
+------------------------------------------------------+
| Top Navigation Bar                                   |
+---------+--------------------------------------------+
|         |                                            |
| Sidebar |              Main Workspace                |
|         |                                            |
|         |                                            |
|         |                                            |
|         |                                            |
+---------+--------------------------------------------+
| Status Bar                                           |
+------------------------------------------------------+
```

---

# Primary Navigation

## Sidebar

Sections:

* Dashboard
* Clients
* Firm Management
* Documents
* OCR
* PDF to Excel
* AI Document Intelligence
* Bank Reconciliation
* GST Reconciliation
* Ledger Reconciliation
* Audit Intelligence
* Reports
* AI Copilot
* Search
* Settings

The sidebar should support:

* Collapse/expand
* Keyboard navigation
* Favorites (future)
* Recently used modules (future)

---

# Top Navigation

Contains:

* Workspace selector
* Global search
* Notifications
* Background task indicator
* User profile
* Theme switch
* Settings shortcut

---

# Dashboard

Purpose:

Provide a quick operational overview.

Widgets include:

* Recent Projects
* Recent Clients
* Pending Reconciliations
* Pending OCR Jobs
* AI Recommendations
* Audit Alerts
* Compliance Calendar
* Storage Usage
* Conversion Statistics
* Activity Timeline

---

# Client Management

Features:

* Client list
* Search
* Filters
* Tags
* Client profile
* Financial years
* Assigned staff
* Uploaded documents
* Notes
* Timeline

---

# Document Management

Main workspace includes:

Left panel:

* Folder tree
* Categories
* Tags

Center:

* Document grid/list

Right panel:

* Metadata
* AI summary
* OCR results
* Version history

Toolbar:

* Upload
* Rename
* Delete
* Preview
* Export
* Search

---

# PDF to Excel Workspace

Workflow:

Upload
↓

Preview

↓

Auto Extraction

↓

Review Grid

↓

Validation

↓

Excel Export

The review grid supports:

* Inline editing
* Add/delete rows
* Search
* Filters
* Sorting
* Duplicate highlighting
* Validation warnings

---

# OCR Workspace

Displays:

* Original document
* OCR text
* Confidence score
* Extraction progress
* Editable results
* Export options

---

# Reconciliation Workspace

Three-step workflow:

Import

↓

Matching

↓

Review

↓

Export

Features:

* Side-by-side comparison
* AI suggestions
* Match confidence
* Manual overrides
* Exception filters
* Summary statistics

---

# Audit Workspace

Sections:

* Audit checklist
* Risk indicators
* Findings
* Exceptions
* Working papers
* Supporting documents
* AI observations

Risk items should be visually prioritized without overwhelming the user.

---

# AI Copilot

Dockable assistant panel available throughout the application.

Capabilities:

* Context-aware chat
* Workflow execution
* Document explanation
* Report generation
* Natural language search
* AI recommendations

The assistant should always reference the user's current workspace when appropriate.

---

# Reports

Report builder includes:

* Report type
* Filters
* Date range
* Client selection
* Preview
* Export options

Supported exports:

* Excel
* PDF
* CSV
* JSON
* XML
* ZIP

---

# Search Experience

Global search should return:

* Clients
* Documents
* Reports
* Transactions
* Reconciliations
* Audit findings
* AI conversations (future)

Search results should support filtering by module and document type.

---

# Background Processing

Long-running tasks (OCR, PDF conversion, reconciliation, AI analysis) should execute asynchronously.

Users should be able to:

* Continue working
* View progress
* Pause or cancel supported operations
* Review completed jobs from a centralized task panel

---

# Error Handling

Errors should be presented with:

* Clear explanation
* Suggested corrective action
* Relevant logs (advanced users)
* Retry options where applicable

Technical details should remain hidden by default but be available for troubleshooting.

---

# Responsive Desktop Behavior

Although desktop-focused, the interface should adapt gracefully to:

* Standard HD displays
* Large monitors
* High-DPI screens
* Window resizing
* Multi-monitor setups

---

# UX Principles

* Minimize clicks for frequent accounting tasks.
* Preserve user context across workflows.
* Favor deterministic automation with transparent AI assistance.
* Make every AI-generated recommendation reviewable before acceptance.
* Keep navigation consistent across all modules.
* Design every screen to handle large datasets efficiently, including virtualization where appropriate.
