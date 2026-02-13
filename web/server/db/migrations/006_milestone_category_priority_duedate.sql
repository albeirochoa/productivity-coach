-- ============================================
-- Migration 006: Add category, priority, due_date to milestones
-- ============================================

ALTER TABLE milestones ADD COLUMN category TEXT;
ALTER TABLE milestones ADD COLUMN priority TEXT DEFAULT 'normal';
ALTER TABLE milestones ADD COLUMN due_date TEXT;
