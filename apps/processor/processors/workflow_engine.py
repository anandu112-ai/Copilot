"""
Workflow Engine — CA Copilot
Configurable multi-stage approval workflows with SLA tracking, escalation, and audit trail.
"""
from __future__ import annotations
import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from loguru import logger
from database.db import get_db_connection, log_audit_event


# ── Table init ──────────────────────────────────────────────────────────────

def _ensure_tables():
    conn = get_db_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS workflow_templates (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            stages TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_by TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS workflow_instances (
            id TEXT PRIMARY KEY,
            template_id TEXT,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            client_id TEXT,
            title TEXT NOT NULL,
            current_stage TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            started_by TEXT,
            started_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT,
            due_date TEXT,
            priority TEXT DEFAULT 'medium',
            metadata TEXT
        );
        CREATE TABLE IF NOT EXISTS workflow_stage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            instance_id TEXT NOT NULL,
            stage_name TEXT NOT NULL,
            action TEXT NOT NULL,
            acted_by TEXT,
            acted_at TEXT DEFAULT (datetime('now')),
            comments TEXT,
            sla_hours INTEGER,
            sla_breached INTEGER DEFAULT 0,
            FOREIGN KEY (instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_wf_instances_entity ON workflow_instances(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_wf_instances_client ON workflow_instances(client_id);
        CREATE INDEX IF NOT EXISTS idx_wf_instances_status ON workflow_instances(status);
        CREATE INDEX IF NOT EXISTS idx_wf_logs_instance ON workflow_stage_logs(instance_id);
    """)
    conn.commit()
    conn.close()
    _seed_default_templates()


DEFAULT_TEMPLATES = [
    {
        'id': 'wf-invoice-approval',
        'name': 'Invoice Approval',
        'description': 'Standard invoice approval workflow',
        'stages': [
            {'name': 'uploaded', 'label': 'Uploaded', 'sla_hours': 24, 'role': 'any'},
            {'name': 'junior_review', 'label': 'Junior Review', 'sla_hours': 24, 'role': 'junior'},
            {'name': 'senior_review', 'label': 'Senior Review', 'sla_hours': 48, 'role': 'senior'},
            {'name': 'partner_approval', 'label': 'Partner Approval', 'sla_hours': 48, 'role': 'partner'},
            {'name': 'completed', 'label': 'Completed', 'sla_hours': None, 'role': None},
        ],
        'created_by': 'system',
    },
    {
        'id': 'wf-audit-report',
        'name': 'Audit Report',
        'description': 'Audit report preparation and sign-off',
        'stages': [
            {'name': 'draft', 'label': 'Draft', 'sla_hours': 48, 'role': 'any'},
            {'name': 'internal_review', 'label': 'Internal Review', 'sla_hours': 48, 'role': 'senior'},
            {'name': 'partner_sign_off', 'label': 'Partner Sign-off', 'sla_hours': 72, 'role': 'partner'},
            {'name': 'issued', 'label': 'Issued', 'sla_hours': None, 'role': None},
        ],
        'created_by': 'system',
    },
    {
        'id': 'wf-gst-filing',
        'name': 'GST Filing',
        'description': 'GST return preparation and filing workflow',
        'stages': [
            {'name': 'data_collection', 'label': 'Data Collection', 'sla_hours': 72, 'role': 'any'},
            {'name': 'reconciliation', 'label': 'Reconciliation', 'sla_hours': 48, 'role': 'junior'},
            {'name': 'review', 'label': 'Review', 'sla_hours': 24, 'role': 'senior'},
            {'name': 'client_approval', 'label': 'Client Approval', 'sla_hours': 48, 'role': 'partner'},
            {'name': 'filed', 'label': 'Filed', 'sla_hours': None, 'role': None},
        ],
        'created_by': 'system',
    },
]


def _seed_default_templates():
    conn = get_db_connection()
    for tpl in DEFAULT_TEMPLATES:
        existing = conn.execute(
            'SELECT id FROM workflow_templates WHERE id=?', (tpl['id'],)
        ).fetchone()
        if not existing:
            conn.execute(
                'INSERT INTO workflow_templates (id,name,description,stages,created_by) VALUES (?,?,?,?,?)',
                (tpl['id'], tpl['name'], tpl['description'],
                 json.dumps(tpl['stages']), tpl['created_by'])
            )
    conn.commit()
    conn.close()


_ensure_tables()


# ── Public API ────────────────────────────────────────────────────────────

def create_workflow(
    entity_type: str,
    entity_id: str,
    title: str,
    template_id: str = 'wf-invoice-approval',
    client_id: str = None,
    started_by: str = None,
    due_date: str = None,
    priority: str = 'medium',
    metadata: dict = None,
) -> str:
    """Start a new workflow instance. Returns instance_id."""
    conn = get_db_connection()
    tpl = conn.execute(
        'SELECT * FROM workflow_templates WHERE id=?', (template_id,)
    ).fetchone()
    if not tpl:
        conn.close()
        raise ValueError(f'Workflow template not found: {template_id}')

    stages = json.loads(tpl['stages'])
    first_stage = stages[0]['name'] if stages else 'start'
    instance_id = str(uuid.uuid4())

    conn.execute(
        'INSERT INTO workflow_instances '
        '(id,template_id,entity_type,entity_id,client_id,title,current_stage,'
        'started_by,due_date,priority,metadata) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        (instance_id, template_id, entity_type, entity_id, client_id, title,
         first_stage, started_by, due_date, priority,
         json.dumps(metadata) if metadata else None)
    )
    conn.execute(
        'INSERT INTO workflow_stage_logs (instance_id,stage_name,action,acted_by,comments) '
        'VALUES (?,?,?,?,?)',
        (instance_id, first_stage, 'started', started_by, f'Workflow started: {title}')
    )
    conn.commit()
    conn.close()
    log_audit_event(module='workflow', action='created',
                    detail=f'{title} [{entity_type}:{entity_id}]',
                    user_id=started_by, client_id=client_id)
    logger.info(f'Workflow created: {instance_id} template={template_id}')
    return instance_id


def advance_workflow(
    instance_id: str,
    action: str,
    acted_by: str,
    comments: str = '',
) -> Dict[str, Any]:
    """
    Advance a workflow to the next stage (action='approve') or
    reject it back one stage (action='reject').
    Returns updated instance dict.
    """
    conn = get_db_connection()
    inst = conn.execute(
        'SELECT * FROM workflow_instances WHERE id=?', (instance_id,)
    ).fetchone()
    if not inst:
        conn.close()
        raise ValueError(f'Workflow instance not found: {instance_id}')

    tpl = conn.execute(
        'SELECT stages FROM workflow_templates WHERE id=?', (inst['template_id'],)
    ).fetchone()
    stages = json.loads(tpl['stages']) if tpl else []
    stage_names = [s['name'] for s in stages]
    current_idx = stage_names.index(inst['current_stage']) if inst['current_stage'] in stage_names else 0

    if action == 'approve':
        if current_idx < len(stage_names) - 1:
            next_stage = stage_names[current_idx + 1]
            is_final = current_idx + 1 == len(stage_names) - 1
            new_status = 'completed' if is_final else 'active'
            completed_at = datetime.utcnow().isoformat() if is_final else None
        else:
            next_stage = inst['current_stage']
            new_status = 'completed'
            completed_at = datetime.utcnow().isoformat()
    elif action == 'reject':
        next_stage = stage_names[max(0, current_idx - 1)]
        new_status = 'active'
        completed_at = None
    elif action == 'escalate':
        next_stage = stage_names[min(len(stage_names) - 1, current_idx + 1)]
        new_status = 'escalated'
        completed_at = None
    else:
        conn.close()
        raise ValueError(f'Unknown action: {action}')

    # Check SLA breach
    stage_cfg = stages[current_idx] if current_idx < len(stages) else {}
    sla_hours = stage_cfg.get('sla_hours')
    sla_breached = 0
    if sla_hours:
        last_log = conn.execute(
            'SELECT acted_at FROM workflow_stage_logs WHERE instance_id=? ORDER BY id DESC LIMIT 1',
            (instance_id,)
        ).fetchone()
        if last_log:
            try:
                entered = datetime.fromisoformat(last_log['acted_at'])
                elapsed_hours = (datetime.utcnow() - entered).total_seconds() / 3600
                sla_breached = 1 if elapsed_hours > sla_hours else 0
            except Exception:
                pass

    conn.execute(
        'UPDATE workflow_instances SET current_stage=?, status=?, completed_at=? WHERE id=?',
        (next_stage, new_status, completed_at, instance_id)
    )
    conn.execute(
        'INSERT INTO workflow_stage_logs (instance_id,stage_name,action,acted_by,comments,sla_hours,sla_breached) '
        'VALUES (?,?,?,?,?,?,?)',
        (instance_id, next_stage, action, acted_by, comments, sla_hours, sla_breached)
    )
    conn.commit()

    updated = dict(conn.execute(
        'SELECT * FROM workflow_instances WHERE id=?', (instance_id,)
    ).fetchone())
    conn.close()

    log_audit_event(module='workflow', action=action,
                    detail=f'Instance {instance_id} -> {next_stage}',
                    user_id=acted_by)
    return updated


def get_workflow_instance(instance_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM workflow_instances WHERE id=?', (instance_id,)).fetchone()
    if not row:
        conn.close()
        return None
    result = dict(row)
    logs = conn.execute(
        'SELECT * FROM workflow_stage_logs WHERE instance_id=? ORDER BY id',
        (instance_id,)
    ).fetchall()
    result['stage_logs'] = [dict(l) for l in logs]
    conn.close()
    return result


def get_pending_workflows(client_id: str = None, entity_type: str = None) -> List[Dict]:
    conn = get_db_connection()
    clauses, params = ["status IN ('active','escalated')"], []
    if client_id:
        clauses.append('client_id = ?')
        params.append(client_id)
    if entity_type:
        clauses.append('entity_type = ?')
        params.append(entity_type)
    where = 'WHERE ' + ' AND '.join(clauses)
    rows = conn.execute(
        f'SELECT * FROM workflow_instances {where} ORDER BY started_at DESC',
        params
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
