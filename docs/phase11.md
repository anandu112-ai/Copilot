# CA Copilot V2 – Billing, Subscription & SaaS Business Platform

You are a senior SaaS architect specializing in subscription-based enterprise software.

Analyze the existing CA Copilot architecture before implementation.

Do NOT rewrite existing modules.

Extend the current system.

---

# Objective

Build a complete subscription and billing system for CA Copilot.

The platform should support:

* Individual CAs
* Small CA firms
* Medium CA firms
* Enterprise accounting organizations

---

# Subscription Model

Create subscription plans.

Example:

## Free Trial

Features:

* Limited documents
* Limited AI usage
* Single user
* Basic OCR

## Professional

For individual CAs.

Features:

* More AI processing
* Client management
* Reconciliation
* Reports

## Firm Plan

For CA offices.

Features:

* Multiple employees
* Team collaboration
* Cloud sync
* Workflow management

## Enterprise

For large firms.

Features:

* Unlimited users
* Advanced security
* Dedicated support
* Custom deployment

---

# Subscription Management

Implement:

Create subscription

Upgrade plan

Downgrade plan

Cancel subscription

Renew subscription

Pause subscription

Trial expiration

---

# Payment Integration

Prepare architecture for:

* Razorpay
* Stripe
* Other payment providers

Support:

Monthly billing

Annual billing

Invoices

Payment receipts

Refund handling

---

# Organization Billing

Billing belongs to organization.

Example:

ABC Chartered Accountants

↓

Professional Firm Plan

↓

10 Employees

---

# Usage Tracking

Track:

AI requests

Document processing count

OCR pages

Storage usage

Users

API usage

Exports

Example:

Monthly limit:

500 AI requests

Current usage:

350

Remaining:

150

---

# Feature Access Control

Subscription controls features.

Example:

Free:

❌ AI Chat

Professional:

✅ AI Chat

Firm:

✅ Team Collaboration

Enterprise:

✅ Advanced Analytics

---

# License Integration

Connect with:

License System

Authentication

Organization Management

Flow:

User Login

↓

Check Subscription

↓

Load Allowed Features

↓

Enable/Disable Modules

---

# Trial System

Implement:

Trial creation

Trial duration

Trial reminders

Trial expiration

Conversion to paid plan

---

# Customer Dashboard

Create:

Account Overview

Current Plan

Usage

Billing History

Invoices

Payment Methods

Team Members

---

# Admin Billing Dashboard

For CA Copilot company.

Track:

Customers

Revenue

Subscriptions

Churn

Active users

Usage analytics

---

# Notifications

Notify users:

Trial ending

Payment successful

Payment failed

Subscription renewed

Usage limit reached

Plan upgrade available

---

# Database Design

Create:

plans

subscriptions

subscription_features

payments

invoices

usage_records

customers

billing_events

payment_methods

Include:

organization_id

user_id

timestamps

status

---

# Security

Protect:

Payment information

Customer data

Subscription status

Invoices

Never store sensitive payment details directly.

Use payment provider tokens.

---

# UI Screens

Create:

Pricing Page

Plan Comparison

Checkout Screen

Subscription Dashboard

Billing History

Invoice Viewer

Usage Dashboard

Upgrade Modal

---

# Analytics

Track:

Monthly Recurring Revenue (MRR)

Annual Recurring Revenue (ARR)

Customer Growth

Conversion Rate

Trial Conversion

Churn Rate

Feature Usage

---

# Deliverables

Implement in phases.

## Phase 1

Subscription Database

Plan Management

## Phase 2

Payment Integration

## Phase 3

Feature Access Control

## Phase 4

Usage Tracking

## Phase 5

Customer Billing Dashboard

Before coding:

1. Analyze existing authentication and organization systems.
2. Design billing architecture.
3. Define subscription workflow.
4. Then implement step-by-step.

The final system should support CA Copilot as a scalable SaaS product with recurring revenue.
