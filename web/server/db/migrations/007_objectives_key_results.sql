-- ============================================
-- Migration 007: Objectives + Key Results + Strategic Links
-- ============================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  area_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_period ON objectives(period);
CREATE INDEX IF NOT EXISTS idx_objectives_area_id ON objectives(area_id);

CREATE TABLE IF NOT EXISTS key_results (
  id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL,
  title TEXT NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'number',
  start_value REAL NOT NULL DEFAULT 0,
  target_value REAL NOT NULL DEFAULT 100,
  current_value REAL NOT NULL DEFAULT 0,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'on_track',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_key_results_objective_id ON key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_key_results_status ON key_results(status);

ALTER TABLE tasks ADD COLUMN area_id TEXT;
ALTER TABLE tasks ADD COLUMN key_result_id TEXT;
ALTER TABLE tasks ADD COLUMN objective_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_area_id ON tasks(area_id);
CREATE INDEX IF NOT EXISTS idx_tasks_key_result_id ON tasks(key_result_id);
CREATE INDEX IF NOT EXISTS idx_tasks_objective_id ON tasks(objective_id);

-- Backfill canonical area_id from current category field
UPDATE tasks
SET area_id = COALESCE(NULLIF(category, ''), 'general')
WHERE area_id IS NULL;

