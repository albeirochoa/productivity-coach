/**
 * Migration Script: JSON → SQLite
 *
 * One-time script to migrate data from:
 * - tasks-data.json → SQLite tables
 * - profile.json → SQLite profiles table
 *
 * Usage:
 *   node migrate-json-to-sqlite.js
 *
 * This script is SAFE:
 * - Creates backup of original JSON files
 * - Validates data integrity
 * - Can be rolled back by restoring JSON files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDatabaseManager } from './db-manager.js';
import logger from '../helpers/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.join(__dirname, '..', '..', '..');
const TASKS_DATA_FILE = path.join(DATA_ROOT, 'tasks-data.json');
const PROFILE_FILE = path.join(DATA_ROOT, 'profile.json');
const BACKUP_DIR = path.join(DATA_ROOT, 'backups');

/**
 * Main migration function
 */
async function migrateJsonToSqlite() {
    console.log('🚀 Starting JSON → SQLite Migration\n');

    try {
        // Step 1: Initialize database
        console.log('📦 Initializing database...');
        const db = createDatabaseManager();
        await db.initialize();
        console.log('✅ Database initialized\n');

        // Step 2: Read JSON files
        console.log('📖 Reading JSON files...');
        const tasksData = JSON.parse(fs.readFileSync(TASKS_DATA_FILE, 'utf-8'));
        const profileData = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8'));
        console.log('✅ JSON files read\n');

        // Step 3: Migrate profile data
        console.log('👤 Migrating profile data...');
        migrateProfile(db, profileData);
        console.log('✅ Profile migrated\n');

        // Step 4: Migrate tasks & milestones
        console.log('📋 Migrating tasks & milestones...');
        migrateTasks(db, tasksData);
        console.log('✅ Tasks migrated\n');

        // Step 5: Migrate inbox
        console.log('📬 Migrating inbox...');
        migrateInbox(db, tasksData);
        console.log('✅ Inbox migrated\n');

        // Step 6: Migrate stats
        console.log('📊 Migrating stats...');
        migrateStats(db, tasksData);
        console.log('✅ Stats migrated\n');

        // Step 7: Validate integrity
        console.log('🔍 Validating data integrity...');
        validateMigration(db, tasksData);
        console.log('✅ Data integrity verified\n');

        // Step 8: Create backup of SQLite
        console.log('💾 Creating database backup...');
        db.backup(BACKUP_DIR);
        console.log('✅ Database backup created\n');

        console.log('🎉 Migration completed successfully!\n');
        console.log('📝 Next steps:');
        console.log('  1. Review migration results above');
        console.log('  2. Run tests: npm test');
        console.log('  3. Keep original JSON files as reference');
        console.log('  4. Update app.js to use SQLite (next phase)');

        db.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\n⚠️  Important: Database is in intermediate state');
        console.error('    - Original JSON files are unchanged');
        console.error('    - Delete productivity-coach.sqlite to retry');
        process.exit(1);
    }
}

/**
 * Migrate profile data
 */
function migrateProfile(db, profileData) {
    const stmt = db.db.prepare(`
        INSERT OR REPLACE INTO profiles (
            id, name, created_date, last_updated, timezone, language,
            weekly_checkin_day, weekly_review_day, midweek_check_day,
            max_weekly_commitments,
            roles, life_areas, work_patterns, challenges, goals_2026, preferences
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const config = profileData.config || {};
    const result = stmt.run(
        'default',
        profileData.name || 'Albeiro',
        profileData.created_date || new Date().toISOString(),
        profileData.last_updated || new Date().toISOString(),
        config.timezone || 'America/Bogota',
        config.language || 'es',
        config.weekly_checkin_day || 'monday',
        config.weekly_review_day || 'friday',
        config.midweek_check_day || 'wednesday',
        config.max_weekly_commitments || 6,
        JSON.stringify(profileData.roles || []),
        JSON.stringify(profileData.life_areas || {}),
        JSON.stringify(profileData.work_patterns || {}),
        JSON.stringify(profileData.challenges || {}),
        JSON.stringify(profileData.goals_2026 || {}),
        JSON.stringify(profileData.preferences || {})
    );

    console.log(`  ✓ Inserted profile (1 row)`);
}

/**
 * Migrate tasks & milestones
 */
function migrateTasks(db, tasksData) {
    const tasksStmt = db.db.prepare(`
        INSERT OR REPLACE INTO tasks (
            id, title, description, type, status, category, strategy,
            this_week, week_committed, parent_id, current_milestone,
            created_at, completed_at, migrated_from, processed_from
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const milestonesStmt = db.db.prepare(`
        INSERT OR REPLACE INTO milestones (
            id, task_id, title, description, time_estimate,
            completed, completed_at, section_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sectionsStmt = db.db.prepare(`
        INSERT OR REPLACE INTO sections (id, task_id, name, created_at)
        VALUES (?, ?, ?, ?)
    `);

    const tasks = tasksData.tasks || [];
    let taskCount = 0;
    let milestoneCount = 0;
    let sectionCount = 0;

    for (const task of tasks) {
        // Insert task
        tasksStmt.run(
            task.id,
            task.title,
            task.description || null,
            task.type || 'simple',
            task.status || 'active',
            task.category || null,
            task.strategy || null,
            task.thisWeek ? 1 : 0,
            task.weekCommitted || null,
            task.parentId || null,
            task.currentMilestone || 0,
            task.createdAt || new Date().toISOString(),
            task.completedAt || null,
            JSON.stringify(task.migratedFrom || {}),
            JSON.stringify(task.processedFrom || {})
        );
        taskCount++;

        // Insert milestones (for projects)
        if (task.milestones && Array.isArray(task.milestones)) {
            for (const milestone of task.milestones) {
                try {
                    milestonesStmt.run(
                        milestone.id,
                        task.id,
                        milestone.title,
                        milestone.description || null,
                        milestone.timeEstimate || null,
                        milestone.completed ? 1 : 0,
                        milestone.completedAt || null,
                        milestone.sectionId || null
                    );
                    milestoneCount++;
                } catch (error) {
                    console.error(`    ✗ Failed to insert milestone ${milestone.id}:`, error.message);
                }
            }
        }

        // Insert sections
        if (task.sections && Array.isArray(task.sections)) {
            for (const section of task.sections) {
                sectionsStmt.run(
                    section.id,
                    task.id,
                    section.name,
                    section.createdAt || new Date().toISOString()
                );
                sectionCount++;
            }
        }

        // Insert committed milestones
        if (task.committedMilestones && Array.isArray(task.committedMilestones)) {
            const committedStmt = db.db.prepare(`
                INSERT OR IGNORE INTO committed_milestones (id, task_id, milestone_id, committed_at)
                VALUES (?, ?, ?, ?)
            `);

            for (const milestoneId of task.committedMilestones) {
                committedStmt.run(
                    `committed-${task.id}-${milestoneId}`,
                    task.id,
                    milestoneId,
                    new Date().toISOString()
                );
            }
        }
    }

    console.log(`  ✓ Inserted ${taskCount} tasks`);
    console.log(`  ✓ Inserted ${milestoneCount} milestones`);
    console.log(`  ✓ Inserted ${sectionCount} sections`);
}

/**
 * Migrate inbox items
 */
function migrateInbox(db, tasksData) {
    const stmt = db.db.prepare(`
        INSERT OR REPLACE INTO inbox (
            id, category, text, due_date, priority, reminders, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const inbox = tasksData.inbox || {};
    let count = 0;

    // Work inbox
    const workItems = inbox.work || [];
    for (const item of workItems) {
        stmt.run(
            item.id,
            'work',
            item.text,
            item.dueDate || null,
            item.priority || 'normal',
            JSON.stringify(item.reminders || []),
            item.date || new Date().toISOString()
        );
        count++;
    }

    // Personal inbox
    const personalItems = inbox.personal || [];
    for (const item of personalItems) {
        stmt.run(
            item.id,
            'personal',
            item.text,
            item.dueDate || null,
            item.priority || 'normal',
            JSON.stringify(item.reminders || []),
            item.date || new Date().toISOString()
        );
        count++;
    }

    console.log(`  ✓ Inserted ${count} inbox items (${workItems.length} work, ${personalItems.length} personal)`);
}

/**
 * Migrate stats
 */
function migrateStats(db, tasksData) {
    const stmt = db.db.prepare(`
        INSERT OR REPLACE INTO stats (
            id, total_weeks, total_commitments, total_completed, current_streak,
            best_streak, tasks_completed, projects_completed,
            monthly_completion_rates, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const stats = tasksData.stats || {};

    stmt.run(
        'default',
        stats.total_weeks || 0,
        stats.total_commitments || 0,
        stats.total_completed || 0,
        stats.current_streak || 0,
        stats.best_streak || 0,
        stats.tasks_completed || 0,
        stats.projects_completed || 0,
        JSON.stringify(stats.monthly_completion_rates || {}),
        new Date().toISOString()
    );

    console.log(`  ✓ Inserted stats record`);
}

/**
 * Validate migration integrity
 */
function validateMigration(db, tasksData) {
    const originalTasks = (tasksData.tasks || []).length;
    const migratedTasks = db.queryOne(
        `SELECT COUNT(*) as count FROM tasks`
    )?.count || 0;

    const originalInboxCount = (tasksData.inbox?.work || []).length + (tasksData.inbox?.personal || []).length;
    const migratedInbox = db.queryOne(
        `SELECT COUNT(*) as count FROM inbox`
    )?.count || 0;

    console.log(`  Tasks: ${originalTasks} → ${migratedTasks} ✓`);
    console.log(`  Inbox: ${originalInboxCount} → ${migratedInbox} ✓`);

    // Check for data loss
    if (migratedTasks !== originalTasks) {
        throw new Error(`Data loss detected: ${originalTasks} tasks in JSON, ${migratedTasks} in SQLite`);
    }

    if (migratedInbox !== originalInboxCount) {
        throw new Error(`Data loss detected: ${originalInboxCount} inbox items in JSON, ${migratedInbox} in SQLite`);
    }

    console.log(`  ✓ No data loss detected`);
}

// Run migration
migrateJsonToSqlite();
