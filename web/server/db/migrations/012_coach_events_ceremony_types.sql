-- Migration 012: Extend coach_events to support ceremony event types (Fase 10.5)
-- SQLite doesn't support ALTER CHECK constraint, so we recreate the table

-- 1. Rename old table
ALTER TABLE coach_events RENAME TO coach_events_old;

-- 2. Create new table with expanded event_type CHECK
CREATE TABLE coach_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL CHECK(event_type IN ('generated', 'applied', 'rejected', 'ceremony_shown', 'ceremony_dismissed')),
    rule_id TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT,
    reason TEXT,
    suggested_action TEXT,
    action_result TEXT,
    rejection_reason TEXT,
    data TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Copy data
INSERT INTO coach_events SELECT * FROM coach_events_old;

-- 4. Drop old table
DROP TABLE coach_events_old;
