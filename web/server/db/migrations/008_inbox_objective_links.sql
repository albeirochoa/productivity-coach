-- ============================================
-- Migration 008: Inbox links to Objective/KR
-- ============================================
-- Allows strategic linking from capture/creation flow before task conversion.

ALTER TABLE inbox ADD COLUMN objective_id TEXT;
ALTER TABLE inbox ADD COLUMN key_result_id TEXT;

CREATE INDEX IF NOT EXISTS idx_inbox_objective_id ON inbox(objective_id);
CREATE INDEX IF NOT EXISTS idx_inbox_key_result_id ON inbox(key_result_id);
