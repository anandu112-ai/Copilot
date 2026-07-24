# CA Copilot V2 – UI/UX Design System & Figma Implementation Guide

You are a senior product designer and frontend architect.

Analyze the existing CA Copilot frontend before making changes.

Do NOT rewrite the application UI completely.

Extend the existing React + TypeScript + Tailwind architecture.

---

# Objective

Create a professional enterprise desktop interface for CA Copilot.

Design inspiration:

* Tally Prime
* Zoho Books
* Microsoft Office
* Linear
* Notion
* Modern AI assistants

The interface should feel:

* Professional
* Trustworthy
* Fast
* Simple
* Accounting-focused

---

# Design System

Create a reusable design system.

Define:

## Colors

Primary:

Brand color

Secondary:

Actions

Success:

Completed states

Warning:

Attention required

Danger:

Errors

---

## Typography

Define:

Heading styles

Body text

Labels

Table text

Numbers

Optimize for accounting dashboards.

---

## Spacing System

Create consistent:

Padding

Margins

Card spacing

Grid spacing

---

# Component Library

Create reusable components.

Location:

```
apps/desktop/src/components/ui
```

Components:

Button

Input

Select

Dropdown

Modal

Dialog

Card

Badge

Table

Tabs

Tooltip

Avatar

Progress Bar

Toast

Date Picker

Search Bar

---

# Application Layout

Create desktop-first layout.

Structure:

```
Main Application

├── Sidebar

├── Top Header

├── Workspace

└── Status Bar
```

---

# Sidebar

Features:

Logo

Dashboard

Clients

Documents

Bank Reconciliation

GST

Ledger

AI Assistant

Tasks

Reports

Settings

Support:

Collapsed mode

Expanded mode

Active state

Permission-based menu

---

# Dashboard Design

Create CA firm dashboard.

Include:

## Overview Cards

Clients

Documents

Pending Tasks

AI Processing

Reconciliation Status

---

## Recent Activity

Display:

Document uploads

AI actions

Employee actions

Sync status

---

## AI Insights Panel

Example:

"5 invoices require review"

"GST mismatch detected"

"3 compliance deadlines approaching"

---

# Client Workspace

Create client-centric interface.

Layout:

```
Client Profile

├── Overview

├── Documents

├── Transactions

├── GST

├── Bank

├── Audit

├── AI Assistant

└── Activity
```

---

# Document Management UI

Create:

Document list

Upload area

Preview panel

AI extraction panel

Review section

Features:

Drag and drop

File status

Processing progress

Confidence score

Approval actions

---

# AI Assistant UI

Create ChatGPT-style interface.

Components:

Chat window

Message bubbles

File references

AI suggestions

Action buttons

Example:

AI:

"Found 12 unmatched transactions."

Buttons:

Review

Generate Report

Export

---

# Accounting Screens

Create professional tables.

Bank Reconciliation:

Columns:

Date

Description

Amount

Match Status

AI Confidence

Action

GST:

Invoice

GSTIN

Tax Amount

Difference

Status

Ledger:

Account

Debit

Credit

Balance

---

# Workflow UI

Create:

Task board

Calendar

Employee workload

Approval workflow

Use:

Cards

Kanban boards

Timeline views

---

# Settings UI

Sections:

Profile

Organization

Employees

Security

AI Settings

Integrations

Subscription

Backup

---

# Figma Integration Workflow

When Figma MCP is available:

1. Read Figma components.

2. Extract:

   * Colors
   * Typography
   * Spacing
   * Assets
   * Components

3. Convert into React components.

Do not blindly copy screenshots.

Convert designs into reusable code.

---

# Frontend Architecture

Use:

React 18

TypeScript

Tailwind CSS

Zustand

React Router

React Query

---

# State Management

Create stores:

```
store/

authStore.ts

clientStore.ts

documentStore.ts

aiStore.ts

syncStore.ts

settingsStore.ts
```

---

# Performance

Optimize:

Large tables

Document lists

AI conversations

Search

Rendering

Use:

Virtual scrolling

Lazy loading

Memoization

---

# Accessibility

Support:

Keyboard navigation

Readable contrast

Screen readers

Focus management

---

# Deliverables

Implement in phases.

## Phase 1

Design system

Layout

Navigation

## Phase 2

Dashboard

Client workspace

## Phase 3

Documents

AI interface

## Phase 4

Accounting modules

## Phase 5

Polish and animations

Before coding:

1. Analyze current frontend.
2. Create component map.
3. Define design tokens.
4. Then implement screen-by-screen.

The final UI should look like a professional accounting AI platform ready for CA firms.
