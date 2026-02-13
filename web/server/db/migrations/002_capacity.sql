-- ============================================
-- Migration 002: Capacity Planning
-- ============================================
-- Adds capacity planning fields to profiles table

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- ALTER PROFILES TABLE - Capacity Configuration
-- ============================================

-- Add capacity planning columns to profiles
ALTER TABLE profiles ADD COLUMN work_hours_per_day INTEGER DEFAULT 8;
ALTER TABLE profiles ADD COLUMN buffer_percentage INTEGER DEFAULT 20;
ALTER TABLE profiles ADD COLUMN break_minutes_per_day INTEGER DEFAULT 60;
ALTER TABLE profiles ADD COLUMN work_days_per_week INTEGER DEFAULT 5;

-- Note: work_hours_per_day = total productive hours (e.g., 8)
-- buffer_percentage = % of time reserved for unexpected work (e.g., 20% = 1.6h out of 8h)
-- break_minutes_per_day = lunch + coffee breaks (e.g., 60 min)
-- work_days_per_week = typically 5 (Monday-Friday)

-- ============================================
-- CAPACITY CALCULATION REFERENCE
-- ============================================
-- Available capacity per day = (work_hours_per_day * 60) - break_minutes_per_day
-- Usable capacity per day = available_capacity * (1 - buffer_percentage/100)
--
-- Example with defaults:
-- - Available: (8 * 60) - 60 = 420 minutes
-- - Usable: 420 * (1 - 0.20) = 336 minutes (5.6 hours)
--
-- This means if you have 8h work days with 1h breaks and 20% buffer,
-- you can realistically commit to ~5.6 hours of tasks per day.
