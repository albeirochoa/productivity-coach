-- ============================================
-- Migration 001: Initial Schema
-- ============================================
-- Creates base tables for Productivity Coach MVP

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL,
  created_date TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/Bogota',
  language TEXT DEFAULT 'es',
  weekly_checkin_day TEXT DEFAULT 'monday',
  weekly_review_day TEXT DEFAULT 'friday',
  midweek_check_day TEXT DEFAULT 'wednesday',
  max_weekly_commitments INTEGER DEFAULT 6,
  -- JSON columns for complex data
  roles TEXT,
  life_areas TEXT,
  work_patterns TEXT,
  challenges TEXT,
  goals_2026 TEXT,
  preferences TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT,
  strategy TEXT,
  this_week BOOLEAN DEFAULT 0,
  week_committed TEXT,
  parent_id TEXT,
  current_milestone INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  migrated_from TEXT,
  processed_from TEXT,
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_this_week ON tasks(this_week);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_estimate INTEGER,
  completed BOOLEAN DEFAULT 0,
  completed_at TEXT,
  section_id TEXT,
  PRIMARY KEY (id, task_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_milestones_task_id ON milestones(task_id);
CREATE INDEX IF NOT EXISTS idx_milestones_completed ON milestones(completed);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sections_task_id ON sections(task_id);

CREATE TABLE IF NOT EXISTS committed_milestones (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  milestone_id TEXT NOT NULL,
  committed_at TEXT NOT NULL,
  UNIQUE(task_id, milestone_id),
  FOREIGN KEY (task_id, milestone_id) REFERENCES milestones(task_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_committed_milestones_task_id ON committed_milestones(task_id);

-- ============================================
-- INBOX TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS inbox (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  due_date TEXT,
  priority TEXT,
  reminders TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inbox_category ON inbox(category);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON inbox(created_at);

-- ============================================
-- STATS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS stats (
  id TEXT PRIMARY KEY DEFAULT 'default',
  total_weeks INTEGER DEFAULT 0,
  total_commitments INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  projects_completed INTEGER DEFAULT 0,
  monthly_completion_rates TEXT,
  last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS streak_history (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  completed_count INTEGER,
  task_ids TEXT,
  created_at TEXT NOT NULL
);

-- ============================================
-- METADATA TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  executed_at TEXT NOT NULL,
  execution_time_ms INTEGER,
  status TEXT DEFAULT 'success'
);

CREATE TABLE IF NOT EXISTS backup_metadata (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  created_at TEXT NOT NULL,
  size_bytes INTEGER,
  checksum TEXT,
  status TEXT DEFAULT 'success'
);

-- ============================================
-- VIEWS (Optional for simplifying queries)
-- ============================================

CREATE VIEW IF NOT EXISTS this_week_expanded AS
SELECT
  t.id,
  t.title,
  t.type,
  t.status,
  CASE WHEN t.type = 'project'
    THEN (SELECT COUNT(*) FROM milestones WHERE task_id = t.id)
    ELSE 0
  END as milestone_count,
  CASE WHEN t.type = 'project'
    THEN (SELECT COUNT(*) FROM milestones WHERE task_id = t.id AND completed = 1)
    ELSE 0
  END as milestones_completed
FROM tasks t
WHERE t.this_week = 1 AND t.status = 'active';
