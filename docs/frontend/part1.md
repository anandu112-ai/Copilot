You are a senior Staff Software Engineer.

Your task is to continue building an EXISTING production-grade desktop application named CA Copilot.

IMPORTANT

This project already exists.

DO NOT:

- change architecture
- change folder structure
- replace libraries
- migrate frameworks
- rename modules
- rewrite working code

Instead:

Build on top of the existing codebase.

===========================================================
PROJECT
===========================================================

Name:

CA Copilot

Purpose:

An AI-powered Offline Desktop Platform for Chartered Accountants, Audit Firms, Tax Consultants and Finance Teams.

The application is NOT a chatbot.

It is a complete accounting platform consisting of many independent modules.

Everything must feel like one professional desktop software.

===========================================================
LOCKED TECH STACK
===========================================================

Desktop

Electron 29

Frontend

React 18
TypeScript
Vite
TailwindCSS
Zustand
React Router
Lucide React
Framer Motion

Backend

Python FastAPI

Database

SQLite

Communication

Electron IPC
REST APIs to FastAPI

===========================================================
EXISTING PROJECT STRUCTURE
===========================================================

apps/

desktop/

electron/

src/

components/

common/

layout/

pages/

services/

stores/

types/

features/

processor/

DO NOT MODIFY THIS STRUCTURE.

Extend it.

===========================================================
CODING STANDARDS
===========================================================

Use

React Functional Components

Hooks

TypeScript strict mode

Reusable components

Feature-based organization

No duplicated code

No inline styles

Tailwind utilities only

Reusable hooks

Proper loading states

Proper empty states

Proper error handling

Suspense where appropriate

Memoization where useful

Accessibility

Keyboard navigation

Responsive desktop layouts

Maintain consistent spacing.

===========================================================
STATE MANAGEMENT
===========================================================

Continue using Zustand.

Current stores include:

authStore

documentStore

workspaceStore

settingsStore

If additional stores are needed create them under

stores/

Possible new stores

dashboardStore

clientStore

firmStore

reportStore

reconciliationStore

auditStore

copilotStore

notificationStore

Each store should contain

state

actions

loading

error

selectors

===========================================================
APPLICATION LAYOUT
===========================================================

Use the existing AppLayout.

Structure

----------------------------------------------------

TopBar

Sidebar

Main Content

Status Bar

----------------------------------------------------

Sidebar modules

Dashboard

Clients

Firm Management

Documents

OCR

PDF Viewer

PDF to Excel

AI Document Intelligence

Bank Reconciliation

GST Reconciliation

Ledger Reconciliation

Audit Intelligence

Reports

AI Copilot

Analytics

Compliance Calendar

Search

Settings

Sidebar must support

collapse

expand

active highlighting

icons

nested future menus

===========================================================
TOP BAR
===========================================================

Contains

Workspace selector

Global Search

Notifications

Background Tasks

Theme Toggle

Profile Menu

Settings Shortcut

User Avatar

===========================================================
ROUTING
===========================================================

Implement routes using React Router.

/

/login

/register

/dashboard

/clients

/clients/:id

/firms

/documents

/documents/:id

/pdf-viewer

/pdf-to-excel

/ocr

/document-ai

/reconciliation/bank

/reconciliation/gst

/reconciliation/ledger

/audit

/reports

/search

/copilot

/analytics

/compliance

/settings

Unknown routes

404 page

===========================================================
AUTHENTICATION FLOW
===========================================================

Existing authentication must remain.

Support

Login

Register

Remember Me

Auto Login

Logout

Session Expiration

Protected Routes

Role Guards

Roles

Admin

CA

Staff

Client (future)

===========================================================
LOGIN PAGE
===========================================================

Professional centered card.

Fields

Email

Password

Remember Me

Forgot Password placeholder

Buttons

Login

Create Account

Validation

Password visibility toggle

Loading state

API error display

===========================================================
REGISTER PAGE
===========================================================

Fields

Full Name

Email

Phone

Firm Name

Password

Confirm Password

Role

Validation

Password strength meter

Terms checkbox

Register button

Already have account

===========================================================
DASHBOARD
===========================================================

Dashboard is the home page.

Cards

Recent Clients

Recent Projects

Pending OCR Jobs

Pending Reconciliation

AI Suggestions

Storage Usage

Recent Documents

Conversion Statistics

Charts

Monthly Documents

Reconciliation Progress

GST Summary

Activity Timeline

Quick Actions

Upload Document

Convert PDF

Start OCR

Bank Reconciliation

GST Reconciliation

Generate Report

Open AI Copilot

Every widget should support

loading

empty

refresh

error

===========================================================
COMPONENT LIBRARY
===========================================================

Create reusable components.

Button

Input

Select

SearchInput

Modal

Drawer

Tabs

Card

Table

Badge

Toast

Tooltip

Progress

Spinner

Avatar

StatCard

MetricCard

Timeline

FileUploader

FilePreview

DataGrid

ConfirmDialog

EmptyState

ErrorState

LoadingSkeleton

Every module must reuse these components.

===========================================================
THEME
===========================================================

Dark Mode default.

Light Mode supported.

Remember user preference.

Glassmorphism kept subtle.

Professional accounting software appearance.

No flashy animations.

===========================================================
PERFORMANCE
===========================================================

Lazy load pages.

Virtualize long tables.

Memoize expensive renders.

Avoid unnecessary re-renders.

Use optimistic updates only where appropriate.

===========================================================
DO NOT TOUCH

Electron main process

Python backend

Authentication API contracts

Existing folder structure

Existing stores unless extending them safely

Everything should integrate with the existing application rather than replacing it.

Continue by implementing all remaining accounting modules following the same architecture and design language.