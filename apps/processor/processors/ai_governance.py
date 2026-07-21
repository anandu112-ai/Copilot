"""
AI Governance Logger — CA Copilot
Records every AI action: input sources, processing steps, confidence,
user overrides, and final approval. Provides full explainability.
"""
from __future__ import annotations
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from loguru import logger
from database.db import get_db_connection


def _ensure_table():
    """Create ai_governance_logs table if it does not exist."""
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ai_governance_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT DEFAULT (datetime('now')),
            session_id TEXT,
            user_id TEXT,
            client_id TEXT,
            task_type TEXT NOT NULL,
            model_used TEXT,
            input_summary TEXT,
            processing_steps TEXT,
            raw_output TEXT,
            confidence_score REAL,
            confidence_label TEXT,
            flags TEXT,
            user_override INTEGER DEFAULT 0,
            override_reason TEXT,
            final_approved INTEGER DEFAULT 0,
            approved_by TEXT,
            approved_at TEXT,
            execution_ms INTEGER,
            metadata TEXT
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_gov_task ON ai_governance_logs(task_type)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_gov_client ON ai_governance_logs(client_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_gov_ts ON ai_governance_logs(timestamp DESC)")
    conn.commit()
    conn.close()

_ensure_table()


class AIGovernanceEntry:
    """Builder for a single AI governance log entry."""

    def __init__(self, task_type: str, session_id: str = None, user_id: str = None, client_id: str = None):
        self.id = str(uuid.uuid4())
        self.task_type = task_type
        self.session_id = session_id or str(uuid.uuid4())
        self.user_id = user_id
        self.client_id = client_id
        self.model_used: Optional[str] = None
        self.input_sources: List[str] = []
        self.processing_steps: List[Dict[str, Any]] = []
        self.raw_output: Optional[str] = None
        self.confidence_score: float = 0.0
        self.confidence_label: str = "unknown"
        self.flags: List[str] = []
        self.user_override: bool = False
        self.override_reason: Optional[str] = None
        self.final_approved: bool = False
        self.approved_by: Optional[str] = None
        self.approved_at: Optional[str] = None
        self.execution_ms: Optional[int] = None
        self.metadata: Dict[str, Any] = {}
        self._start_ts = datetime.utcnow()

    def set_model(self, model_name: str) -> 'AIGovernanceEntry':
        self.model_used = model_name
        return self

    def add_input(self, source: str) -> 'AIGovernanceEntry':
        """Record an input source (file path, API, user text, etc.)"""
        self.input_sources.append(source)
        return self

    def add_step(self, step: str, detail: Any = None) -> 'AIGovernanceEntry':
        """Record a processing step with optional detail."""
        self.processing_steps.append({
            'step': step,
            'detail': str(detail) if detail is not None else None,
            'ts': datetime.utcnow().isoformat(),
        })
        return self

    def set_confidence(self, score: float, label: str = None) -> 'AIGovernanceEntry':
        self.confidence_score = round(float(score), 4)
        if label:
            self.confidence_label = label
        elif score >= 0.85:
            self.confidence_label = 'high'
        elif score >= 0.60:
            self.confidence_label = 'medium'
        else:
            self.confidence_label = 'low'
        return self

    def add_flag(self, flag: str) -> 'AIGovernanceEntry':
        """Add an explainability flag (e.g. 'low_confidence', 'missing_field')."""
        self.flags.append(flag)
        return self

    def set_output(self, output: Any) -> 'AIGovernanceEntry':
        self.raw_output = json.dumps(output, default=str)[:4000] if output else None
        return self

    def set_override(self, reason: str, user_id: str = None) -> 'AIGovernanceEntry':
        """Record that a user overrode the AI recommendation."""
        self.user_override = True
        self.override_reason = reason
        if user_id:
            self.user_id = user_id
        self.add_step('user_override', reason)
        return self

    def approve(self, approved_by: str) -> 'AIGovernanceEntry':
        self.final_approved = True
        self.approved_by = approved_by
        self.approved_at = datetime.utcnow().isoformat()
        return self

    def save(self) -> str:
        """Persist to ai_governance_logs. Never raises."""
        try:
            elapsed = int((datetime.utcnow() - self._start_ts).total_seconds() * 1000)
            self.execution_ms = elapsed
            conn = get_db_connection()
            conn.execute("""
                INSERT INTO ai_governance_logs
                (id, session_id, user_id, client_id, task_type, model_used,
                 input_summary, processing_steps, raw_output, confidence_score,
                 confidence_label, flags, user_override, override_reason,
                 final_approved, approved_by, approved_at, execution_ms, metadata)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                self.id, self.session_id, self.user_id, self.client_id,
                self.task_type, self.model_used,
                json.dumps(self.input_sources),
                json.dumps(self.processing_steps),
                self.raw_output,
                self.confidence_score, self.confidence_label,
                json.dumps(self.flags),
                int(self.user_override), self.override_reason,
                int(self.final_approved), self.approved_by, self.approved_at,
                self.execution_ms,
                json.dumps(self.metadata) if self.metadata else None,
            ))
            conn.commit()
            conn.close()
            logger.debug(f"AI governance saved: {self.task_type} id={self.id} confidence={self.confidence_label}")
        except Exception as e:
            logger.warning(f"AI governance log failed (non-fatal): {e}")
        return self.id


def get_governance_logs(
    task_type: str = None,
    client_id: str = None,
    user_id: str = None,
    limit: int = 100,
    offset: int = 0,
) -> Dict[str, Any]:
    """Retrieve AI governance logs with optional filters."""
    conn = get_db_connection()
    clauses, params = [], []
    if task_type:
        clauses.append("task_type = ?")
        params.append(task_type)
    if client_id:
        clauses.append("client_id = ?")
        params.append(client_id)
    if user_id:
        clauses.append("user_id = ?")
        params.append(user_id)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = conn.execute(
        f"SELECT * FROM ai_governance_logs {where} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    total = conn.execute(
        f"SELECT COUNT(*) FROM ai_governance_logs {where}", params
    ).fetchone()[0]
    conn.close()
    return {"total": total, "logs": [dict(r) for r in rows]}
