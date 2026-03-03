-- Migration 009: Coach Events (Fase 8 - Motor de Decisiones)
-- Stores coach recommendation events: generated, applied, rejected

CREATE TABLE IF NOT EXISTS coach_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL CHECK(event_type IN ('generated', 'applied', 'rejected')),
    rule_id TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT,
    reason TEXT,
    suggested_action TEXT,          -- JSON: {type, label, payload}
    action_result TEXT,             -- JSON: result of execution (if applied)
    rejection_reason TEXT,          -- User-provided reason (if rejected)
    data TEXT,                      -- JSON: rule-specific data snapshot
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coach_events_type ON coach_events(event_type);
CREATE INDEX IF NOT EXISTS idx_coach_events_rule ON coach_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_coach_events_created ON coach_events(created_at);
