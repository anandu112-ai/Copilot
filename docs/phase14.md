# CA Copilot – Repository Implementation Blueprint

You are a senior full-stack architect.

Analyze my existing CA Copilot repository.

Do NOT create a new project.

Work with the existing monorepo structure.

---

# Current Architecture

Expected structure:

```
CA-Copilot/

apps/

 ├── desktop/
 │
 │    ├── Electron
 │    ├── React
 │    ├── TypeScript
 │    ├── Tailwind CSS
 │    └── SQLite

 │
 └── processor/
      
      ├── FastAPI
      ├── Python
      ├── OCR
      ├── AI Processing
      └── Document Processing
```

---

# Goal

Convert the current application into a production-ready AI accounting platform.

Implement features incrementally.

Do not break existing functionality.

---

# Phase 1 – Desktop Foundation

## apps/desktop/src

Create:

```
src/

├── components/

│   ├── common/
│   ├── ui/
│   ├── dashboard/
│   ├── documents/
│   ├── clients/
│   └── ai/


├── pages/

│   ├── Dashboard/
│   ├── Clients/
│   ├── Documents/
│   ├── AIChat/
│   └── Settings/


├── layouts/

│   └── MainLayout/


├── services/

│   ├── api/
│   ├── database/
│   ├── sync/
│   ├── auth/
│   └── ai/


├── hooks/

├── store/

│   └── Zustand/


├── types/

├── utils/

└── routes/
```

---

# Phase 2 – SQLite Database Layer

Create:

```
electron/database/

├── connection.ts

├── migrations/

│   ├── clients.sql
│   ├── documents.sql
│   ├── users.sql
│   └── sync.sql


├── repositories/

│   ├── clientRepository.ts
│   ├── documentRepository.ts
│   └── userRepository.ts
```

---

# Required Local Tables

Create:

users

clients

companies

documents

document_chunks

ai_history

transactions

reconciliation_results

sync_queue

settings

audit_logs

Every table must contain:

id

created_at

updated_at

sync_status

cloud_id

---

# Phase 3 – FastAPI Backend

Structure:

```
processor/

app/

├── main.py

├── api/

│   ├── documents.py
│   ├── clients.py
│   ├── ai.py
│   └── reconciliation.py


├── services/

│   ├── ocr/
│   ├── ai/
│   ├── extraction/
│   └── reports/


├── models/

├── database/

├── utils/

└── tests/
```

---

# Phase 4 – First MVP Features

Implement in this order:

## 1. Client Management

Frontend:

* Client list
* Add client
* Edit client
* Client details

Backend:

CRUD APIs

Database:

clients table

---

## 2. Document Management

Features:

Upload PDF

Store metadata

Preview document

Delete document

Search

Backend:

Document API

Processing:

OCR pipeline

---

## 3. AI Processing

Create AI service layer:

```
services/ai/

├── provider.py

├── openai_provider.py

├── local_provider.py

└── prompts/
```

Support multiple AI models.

---

# Phase 5 – AI Chat System

Create:

Frontend:

```
components/ai/

ChatWindow.tsx

Message.tsx

ContextPanel.tsx
```

Backend:

```
api/ai.py

services/rag/

├── embeddings.py

├── retrieval.py

└── generation.py
```

---

# Phase 6 – Supabase Integration

Add:

```
services/supabase/

├── client.ts

├── auth.ts

├── storage.ts

└── sync.ts
```

Implement:

Authentication

Cloud storage

Database sync

---

# Phase 7 – Sync Engine

Create:

```
services/sync/

├── SyncManager.ts

├── QueueManager.ts

├── ConflictResolver.ts

└── NetworkMonitor.ts
```

Features:

Offline mode

Background sync

Conflict handling

Retry system

---

# Development Rules

Before coding any module:

1. Analyze existing files.
2. Explain changes.
3. Create implementation plan.
4. Modify only required files.
5. Test after every feature.

---

# Code Quality Rules

Use:

TypeScript strict mode

Python type hints

Clean architecture

Reusable services

Error handling

Logging

Documentation

Avoid:

Duplicate code

Large components

Hardcoded values

Breaking existing APIs

---

# First Implementation Task

Start with:

1. Analyze current repository structure.
2. Identify completed features.
3. Identify missing modules.
4. Create Phase 1 implementation plan.
5. Wait for approval before writing code.

```
```
