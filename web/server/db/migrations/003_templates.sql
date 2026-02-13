-- Migration 003: Add templates support
-- Created: 2026-02-12
-- Description: Add templates table for storing reusable project templates

CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    strategy TEXT NOT NULL,
    milestones TEXT NOT NULL, -- JSON array of milestone objects
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
