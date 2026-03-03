-- Migration 011: Conversation State (Fase 10.3A - AR-001)
-- Persists conversation state for multi-turn flows and slot filling

CREATE TABLE IF NOT EXISTS conversation_state (
    session_id TEXT PRIMARY KEY,
    intent TEXT,
    pending_action_id TEXT,
    required_slots TEXT,  -- JSON array of slot names
    collected_slots TEXT, -- JSON object of slot name -> value
    last_user_goal TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES coach_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_state_pending ON conversation_state(pending_action_id);
CREATE INDEX IF NOT EXISTS idx_conversation_state_updated ON conversation_state(updated_at);
