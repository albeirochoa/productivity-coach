-- Migration 010: Coach Chat Sessions & Memory (Fase 9 - Asistente Conversacional)
-- Stores chat sessions, messages, pending actions, and user preferences

CREATE TABLE IF NOT EXISTS coach_sessions (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL DEFAULT 'suggest' CHECK(mode IN ('suggest', 'act')),
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    message_count INTEGER DEFAULT 0,
    summary TEXT
);

CREATE TABLE IF NOT EXISTS coach_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'coach')),
    content TEXT NOT NULL,
    tool_name TEXT,
    action_id TEXT,
    action_preview TEXT,
    action_status TEXT CHECK(action_status IN ('pending', 'confirmed', 'cancelled', 'expired')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES coach_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_session ON coach_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_coach_messages_action ON coach_messages(action_id);

CREATE TABLE IF NOT EXISTS coach_memory (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coach_memory_key ON coach_memory(key);
