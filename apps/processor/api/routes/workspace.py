"""
CA Copilot Workspace Session Management API Route Handler.
FastAPI router providing session snapshot save/restore for desktop client.
"""
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import APIRouter, Form, HTTPException, Header
from loguru import logger

from database.db import get_db_connection

router = APIRouter(prefix="/workspace", tags=["Workspace Memory"])

# ── JWT verification (same pattern as firm.py) ───────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict]:
    """Extract user from JWT token if present. Returns None if not authenticated."""
    if not authorization or not authorization.startswith('Bearer '):
        return None
    token = authorization.replace('Bearer ', '')
    from api.routes.firm import JWT_SECRET, JWT_ALGORITHM
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {
            'id': payload.get('sub'),
            'email': payload.get('email'),
            'name': payload.get('name'),
        }
    except JWTError:
        return None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post('/snapshots')
async def save_workspace_snapshot(
    user_id: str = Form(...),
    session_data: str = Form(...),  # JSON-serialized WorkspaceSession
    label: str = Form(default='Auto-save'),
    authorization: Optional[str] = Header(None),
):
    """
    Save a workspace session snapshot.
    Called by the desktop client's auto-save mechanism.
    """
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail='Authentication required')

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Create snapshots table if not exists
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspace_snapshots (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            label TEXT,
            session_data TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """)
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_workspace_user_created
        ON workspace_snapshots(user_id, created_at DESC)
        """)

        snapshot_id = f'ws-snap-{uuid.uuid4().hex}'
        cursor.execute(
            """
            INSERT INTO workspace_snapshots (id, user_id, label, session_data)
            VALUES (?, ?, ?, ?)
            """,
            (snapshot_id, user_id, label, session_data),
        )

        # Keep only the 5 most recent snapshots per user
        cursor.execute(
            """
            DELETE FROM workspace_snapshots
            WHERE user_id = ?
            AND id NOT IN (
                SELECT id FROM workspace_snapshots
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 5
            )
            """,
            (user_id, user_id),
        )

        conn.commit()
        logger.info(f'Workspace snapshot saved: {snapshot_id} for user {user_id}')
        return {'success': True, 'snapshot_id': snapshot_id}

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f'Failed to save workspace snapshot: {e}')
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get('/snapshots')
async def list_workspace_snapshots(
    user_id: str,
    limit: int = 5,
    authorization: Optional[str] = Header(None),
):
    """
    List recent workspace snapshots for a user.
    Returns most recent first.
    """
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail='Authentication required')

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Ensure table exists
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspace_snapshots (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            label TEXT,
            session_data TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """)

        rows = cursor.execute(
            """
            SELECT id, label, session_data, created_at
            FROM workspace_snapshots
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()

        snapshots = []
        for row in rows:
            snapshots.append({
                'id': row['id'],
                'label': row['label'],
                'session_data': json.loads(row['session_data']),
                'created_at': row['created_at'],
            })

        return {'snapshots': snapshots, 'count': len(snapshots)}

    except Exception as e:
        logger.error(f'Failed to list workspace snapshots: {e}')
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get('/snapshots/{snapshot_id}')
async def get_workspace_snapshot(
    snapshot_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Retrieve a specific workspace snapshot by ID.
    """
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail='Authentication required')

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspace_snapshots (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            label TEXT,
            session_data TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """)

        row = cursor.execute(
            """
            SELECT id, label, session_data, created_at, user_id
            FROM workspace_snapshots
            WHERE id = ?
            """,
            (snapshot_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail='Snapshot not found')

        # Verify ownership
        if row['user_id'] != user['id']:
            raise HTTPException(status_code=403, detail='Access denied')

        return {
            'id': row['id'],
            'label': row['label'],
            'session_data': json.loads(row['session_data']),
            'created_at': row['created_at'],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Failed to retrieve workspace snapshot: {e}')
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.delete('/snapshots/{snapshot_id}')
async def delete_workspace_snapshot(
    snapshot_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Delete a workspace snapshot.
    """
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail='Authentication required')

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify ownership before deleting
        row = cursor.execute(
            'SELECT user_id FROM workspace_snapshots WHERE id = ?',
            (snapshot_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail='Snapshot not found')

        if row['user_id'] != user['id']:
            raise HTTPException(status_code=403, detail='Access denied')

        cursor.execute('DELETE FROM workspace_snapshots WHERE id = ?', (snapshot_id,))
        conn.commit()

        logger.info(f'Workspace snapshot deleted: {snapshot_id}')
        return {'success': True}

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f'Failed to delete workspace snapshot: {e}')
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
