import { createDatabaseManager } from '../db/db-manager.js';
import logger from './logger.js';

/**
 * Database Store
 *
 * Drop-in replacement for json-store.js
 * Same interface (readJson/writeJson) but backed by SQLite.
 *
 * readJson('tasks-data.json') → reconstructs JSON from SQLite tables
 * writeJson('tasks-data.json', data) → writes changes back to SQLite
 * readJson('profile.json') → reads from profiles table
 */
export function createDbStore() {
    const dbManager = createDatabaseManager();

    // Initialize on first use
    let initialized = false;
    async function ensureInit() {
        if (!initialized) {
            await dbManager.initialize();

            // Ensure templates table exists (in case migration hasn't run)
            try {
                dbManager.query(`SELECT 1 FROM templates LIMIT 1`);
            } catch {
                dbManager.db.exec(`
                    CREATE TABLE IF NOT EXISTS templates (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL,
                        strategy TEXT NOT NULL,
                        milestones TEXT NOT NULL,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                logger.info('Created templates table on-the-fly');
            }

            // Ensure calendar_blocks table exists (in case migration hasn't run)
            try {
                dbManager.query(`SELECT 1 FROM calendar_blocks LIMIT 1`);
            } catch {
                dbManager.db.exec(`
                    CREATE TABLE IF NOT EXISTS calendar_blocks (
                        id TEXT PRIMARY KEY,
                        task_id TEXT NOT NULL,
                        date TEXT NOT NULL,
                        start_time TEXT NOT NULL,
                        end_time TEXT NOT NULL,
                        duration_minutes INTEGER NOT NULL,
                        status TEXT NOT NULL DEFAULT 'scheduled',
                        notes TEXT,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
                    );
                    CREATE INDEX IF NOT EXISTS idx_blocks_task_id ON calendar_blocks(task_id);
                    CREATE INDEX IF NOT EXISTS idx_blocks_date ON calendar_blocks(date);
                    CREATE INDEX IF NOT EXISTS idx_blocks_date_time ON calendar_blocks(date, start_time);
                    CREATE INDEX IF NOT EXISTS idx_blocks_status ON calendar_blocks(status);
                `);
                logger.info('Created calendar_blocks table on-the-fly');
            }

            initialized = true;
        }
    }

    /**
     * Read "file" - reconstructs JSON structure from SQLite
     */
    async function readJson(filename) {
        await ensureInit();

        if (filename === 'tasks-data.json') {
            return readTasksData();
        } else if (filename === 'profile.json') {
            return readProfile();
        }

        throw new Error(`Unknown file: ${filename}`);
    }

    /**
     * Write "file" - updates SQLite tables from JSON structure
     */
    async function writeJson(filename, data) {
        await ensureInit();

        if (filename === 'tasks-data.json') {
            return writeTasksData(data);
        } else if (filename === 'profile.json') {
            return writeProfile(data);
        }

        throw new Error(`Unknown file: ${filename}`);
    }

    // ============================================
    // READ OPERATIONS
    // ============================================

    function readTasksData() {
        const tasks = readAllTasks();
        const inbox = readInbox();
        const stats = readStats();
        const config = readConfig();
        const templates = readTemplates();
        const migration = { version: '3.0', migrated_at: new Date().toISOString(), source: 'sqlite' };

        return { config, inbox, tasks, stats, templates, migration };
    }

    function readAllTasks() {
        const rows = dbManager.query(`SELECT * FROM tasks ORDER BY created_at DESC`);

        return rows.map(row => {
            const task = {
                id: row.id,
                title: row.title,
                type: row.type,
                status: row.status,
                thisWeek: !!row.this_week,
                weekCommitted: row.week_committed,
                category: row.category,
                createdAt: row.created_at,
                completedAt: row.completed_at,
                dueDate: row.due_date || null,
                priority: row.priority || 'normal',
            };

            // Parse JSON metadata
            if (row.migrated_from) {
                try { task.migratedFrom = JSON.parse(row.migrated_from); } catch { task.migratedFrom = {}; }
            }
            if (row.processed_from) {
                try { task.processedFrom = JSON.parse(row.processed_from); } catch { task.processedFrom = {}; }
            }

            // Project-specific fields
            if (row.type === 'project') {
                task.description = row.description || '';
                task.strategy = row.strategy || 'goteo';
                task.parentId = row.parent_id || null;
                task.currentMilestone = row.current_milestone || 0;

                // Load milestones
                task.milestones = dbManager.query(
                    `SELECT * FROM milestones WHERE task_id = ? ORDER BY id`,
                    [row.id]
                ).map(m => ({
                    id: m.id,
                    title: m.title,
                    description: m.description || '',
                    timeEstimate: m.time_estimate || 45,
                    completed: !!m.completed,
                    completedAt: m.completed_at,
                    sectionId: m.section_id || null,
                    category: m.category || null,
                    priority: m.priority || 'normal',
                    dueDate: m.due_date || null,
                }));

                // Load sections
                task.sections = dbManager.query(
                    `SELECT * FROM sections WHERE task_id = ?`,
                    [row.id]
                ).map(s => ({
                    id: s.id,
                    name: s.name,
                    createdAt: s.created_at,
                }));

                // Load committed milestones
                const committed = dbManager.query(
                    `SELECT milestone_id FROM committed_milestones WHERE task_id = ?`,
                    [row.id]
                );
                task.committedMilestones = committed.map(c => c.milestone_id);
                task.committedMilestone = task.committedMilestones[0] || null;
            }

            return task;
        });
    }

    function readInbox() {
        const workItems = dbManager.query(
            `SELECT * FROM inbox WHERE category = 'work' ORDER BY created_at DESC`
        ).map(mapInboxRow);

        const personalItems = dbManager.query(
            `SELECT * FROM inbox WHERE category = 'personal' ORDER BY created_at DESC`
        ).map(mapInboxRow);

        return { work: workItems, personal: personalItems };
    }

    function mapInboxRow(row) {
        const item = {
            id: row.id,
            text: row.text,
            date: row.created_at,
            category: row.category || 'trabajo', // Add category field
        };
        if (row.due_date) item.dueDate = row.due_date;
        if (row.priority && row.priority !== 'normal') item.priority = row.priority;
        if (row.reminders) {
            try {
                const r = JSON.parse(row.reminders);
                if (r.length > 0) item.reminders = r;
            } catch { /* ignore */ }
        }
        return item;
    }

    function readStats() {
        const row = dbManager.queryOne(`SELECT * FROM stats WHERE id = 'default'`);
        if (!row) {
            return { total_weeks: 0, total_commitments: 0, total_completed: 0, current_streak: 0, best_streak: 0, tasks_completed: 0, projects_completed: 0, monthly_completion_rates: {} };
        }
        return {
            total_weeks: row.total_weeks,
            total_commitments: row.total_commitments,
            total_completed: row.total_completed,
            current_streak: row.current_streak,
            best_streak: row.best_streak,
            tasks_completed: row.tasks_completed,
            projects_completed: row.projects_completed,
            monthly_completion_rates: row.monthly_completion_rates ? JSON.parse(row.monthly_completion_rates) : {},
        };
    }

    function readConfig() {
        const row = dbManager.queryOne(`SELECT * FROM profiles WHERE id = 'default'`);
        if (!row) return {};
        return {
            name: row.name,
            timezone: row.timezone,
            weekly_checkin_day: row.weekly_checkin_day,
            weekly_review_day: row.weekly_review_day,
            midweek_check_day: row.midweek_check_day,
            max_weekly_commitments: row.max_weekly_commitments,
            language: row.language,
            life_areas: row.life_areas ? JSON.parse(row.life_areas) : [],
            // Capacity planning config
            work_hours_per_day: row.work_hours_per_day || 8,
            buffer_percentage: row.buffer_percentage || 20,
            break_minutes_per_day: row.break_minutes_per_day || 60,
            work_days_per_week: row.work_days_per_week || 5,
        };
    }

    function readProfile() {
        const row = dbManager.queryOne(`SELECT * FROM profiles WHERE id = 'default'`);
        if (!row) return {};
        return {
            name: row.name,
            created_date: row.created_date,
            last_updated: row.last_updated,
            roles: row.roles ? JSON.parse(row.roles) : [],
            life_areas: row.life_areas ? JSON.parse(row.life_areas) : {},
            work_patterns: row.work_patterns ? JSON.parse(row.work_patterns) : {},
            challenges: row.challenges ? JSON.parse(row.challenges) : {},
            goals_2026: row.goals_2026 ? JSON.parse(row.goals_2026) : {},
            preferences: row.preferences ? JSON.parse(row.preferences) : {},
            // Capacity planning config
            capacity: {
                work_hours_per_day: row.work_hours_per_day || 8,
                buffer_percentage: row.buffer_percentage || 20,
                break_minutes_per_day: row.break_minutes_per_day || 60,
                work_days_per_week: row.work_days_per_week || 5,
            },
        };
    }

    function readTemplates() {
        try {
            const rows = dbManager.query(`SELECT * FROM templates ORDER BY created_at DESC`);
            return rows.map(row => ({
                id: row.id,
                name: row.name,
                category: row.category,
                strategy: row.strategy,
                milestones: JSON.parse(row.milestones),
                createdAt: row.created_at,
            }));
        } catch (error) {
            // Table might not exist yet (before migration)
            logger.debug('Templates table not found, returning empty array');
            return [];
        }
    }

    // ============================================
    // WRITE OPERATIONS
    // ============================================

    function writeTasksData(data) {
        dbManager.transaction(() => {
            // Sync tasks
            syncTasks(data.tasks || []);

            // Sync inbox
            syncInbox(data.inbox || { work: [], personal: [] });

            // Sync stats
            syncStats(data.stats || {});

            // Sync templates
            if (data.templates) {
                syncTemplates(data.templates);
            }
        });
    }

    function syncTasks(tasks) {
        // Get current task IDs in DB
        const existingIds = new Set(
            dbManager.query(`SELECT id FROM tasks`).map(r => r.id)
        );
        const newIds = new Set(tasks.map(t => t.id));

        // Delete removed tasks (cascade deletes milestones, sections, committed)
        for (const id of existingIds) {
            if (!newIds.has(id)) {
                dbManager.exec(`DELETE FROM tasks WHERE id = ?`, [id]);
            }
        }

        // Upsert each task
        for (const task of tasks) {
            dbManager.exec(`
                INSERT OR REPLACE INTO tasks (
                    id, title, description, type, status, category, strategy,
                    this_week, week_committed, parent_id, current_milestone,
                    created_at, completed_at, migrated_from, processed_from,
                    due_date, priority
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
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
                JSON.stringify(task.processedFrom || {}),
                task.dueDate || null,
                task.priority || 'normal',
            ]);

            // Sync milestones for projects
            if (task.type === 'project' && task.milestones) {
                // Delete existing milestones for this task
                dbManager.exec(`DELETE FROM milestones WHERE task_id = ?`, [task.id]);

                for (const m of task.milestones) {
                    dbManager.exec(`
                        INSERT INTO milestones (id, task_id, title, description, time_estimate, completed, completed_at, section_id, category, priority, due_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [m.id, task.id, m.title, m.description || null, m.timeEstimate || null, m.completed ? 1 : 0, m.completedAt || null, m.sectionId || null, m.category || null, m.priority || 'normal', m.dueDate || null]);
                }

                // Sync sections
                dbManager.exec(`DELETE FROM sections WHERE task_id = ?`, [task.id]);
                if (task.sections) {
                    for (const s of task.sections) {
                        dbManager.exec(`
                            INSERT INTO sections (id, task_id, name, created_at)
                            VALUES (?, ?, ?, ?)
                        `, [s.id, task.id, s.name, s.createdAt || new Date().toISOString()]);
                    }
                }

                // Sync committed milestones
                dbManager.exec(`DELETE FROM committed_milestones WHERE task_id = ?`, [task.id]);
                const committed = task.committedMilestones || (task.committedMilestone ? [task.committedMilestone] : []);
                for (const milestoneId of committed) {
                    dbManager.exec(`
                        INSERT OR IGNORE INTO committed_milestones (id, task_id, milestone_id, committed_at)
                        VALUES (?, ?, ?, ?)
                    `, [`cm-${task.id}-${milestoneId}`, task.id, milestoneId, new Date().toISOString()]);
                }
            }
        }
    }

    function syncInbox(inbox) {
        // Clear and rewrite
        dbManager.exec(`DELETE FROM inbox`);

        for (const category of ['work', 'personal']) {
            const items = inbox[category] || [];
            for (const item of items) {
                dbManager.exec(`
                    INSERT INTO inbox (id, category, text, due_date, priority, reminders, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [item.id, category, item.text, item.dueDate || null, item.priority || 'normal', JSON.stringify(item.reminders || []), item.date || new Date().toISOString()]);
            }
        }
    }

    function syncStats(stats) {
        dbManager.exec(`
            INSERT OR REPLACE INTO stats (
                id, total_weeks, total_commitments, total_completed,
                current_streak, best_streak, tasks_completed, projects_completed,
                monthly_completion_rates, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'default',
            stats.total_weeks || 0,
            stats.total_commitments || 0,
            stats.total_completed || 0,
            stats.current_streak || 0,
            stats.best_streak || 0,
            stats.tasks_completed || 0,
            stats.projects_completed || 0,
            JSON.stringify(stats.monthly_completion_rates || {}),
            new Date().toISOString(),
        ]);
    }

    function syncTemplates(templates) {
        try {
            // Get current template IDs in DB
            const existingIds = new Set(
                dbManager.query(`SELECT id FROM templates`).map(r => r.id)
            );
            const newIds = new Set(templates.map(t => t.id));

            // Delete removed templates
            for (const id of existingIds) {
                if (!newIds.has(id)) {
                    dbManager.exec(`DELETE FROM templates WHERE id = ?`, [id]);
                }
            }

            // Upsert each template
            for (const template of templates) {
                dbManager.exec(`
                    INSERT OR REPLACE INTO templates (id, name, category, strategy, milestones, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    template.id,
                    template.name,
                    template.category || 'trabajo',
                    template.strategy || 'goteo',
                    JSON.stringify(template.milestones || []),
                    template.createdAt || new Date().toISOString(),
                ]);
            }
        } catch (error) {
            // Table might not exist yet
            logger.warn('Could not sync templates (table not ready)', { error: error.message });
        }
    }

    function writeProfile(data) {
        const capacity = data.capacity || {};
        dbManager.exec(`
            INSERT OR REPLACE INTO profiles (
                id, name, created_date, last_updated,
                roles, life_areas, work_patterns, challenges, goals_2026, preferences,
                work_hours_per_day, buffer_percentage, break_minutes_per_day, work_days_per_week
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'default',
            data.name || 'Albeiro',
            data.created_date || new Date().toISOString(),
            new Date().toISOString(),
            JSON.stringify(data.roles || []),
            JSON.stringify(data.life_areas || {}),
            JSON.stringify(data.work_patterns || {}),
            JSON.stringify(data.challenges || {}),
            JSON.stringify(data.goals_2026 || {}),
            JSON.stringify(data.preferences || {}),
            capacity.work_hours_per_day || 8,
            capacity.buffer_percentage || 20,
            capacity.break_minutes_per_day || 60,
            capacity.work_days_per_week || 5,
        ]);
    }

    // ============================================
    // CALENDAR BLOCKS CRUD
    // ============================================

    function readCalendarBlocks(filters = {}) {
        try {
            let query = 'SELECT * FROM calendar_blocks';
            const conditions = [];
            const params = [];

            if (filters.date) {
                conditions.push('date = ?');
                params.push(filters.date);
            }
            if (filters.taskId) {
                conditions.push('task_id = ?');
                params.push(filters.taskId);
            }
            if (filters.status) {
                conditions.push('status = ?');
                params.push(filters.status);
            }
            if (filters.dateRange) {
                conditions.push('date >= ? AND date <= ?');
                params.push(filters.dateRange.start, filters.dateRange.end);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date, start_time';

            const rows = dbManager.query(query, params);
            return rows.map(row => ({
                id: row.id,
                taskId: row.task_id,
                date: row.date,
                startTime: row.start_time,
                endTime: row.end_time,
                durationMinutes: row.duration_minutes,
                status: row.status,
                notes: row.notes,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));
        } catch (error) {
            logger.debug('Calendar blocks table not found, returning empty array');
            return [];
        }
    }

    function createCalendarBlock(block) {
        const id = block.id || `block-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        dbManager.exec(`
            INSERT INTO calendar_blocks (
                id, task_id, date, start_time, end_time, duration_minutes, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            block.taskId,
            block.date,
            block.startTime,
            block.endTime,
            block.durationMinutes,
            block.status || 'scheduled',
            block.notes || null,
        ]);

        return { id, ...block };
    }

    function updateCalendarBlock(id, updates) {
        const fields = [];
        const params = [];

        if (updates.startTime !== undefined) {
            fields.push('start_time = ?');
            params.push(updates.startTime);
        }
        if (updates.endTime !== undefined) {
            fields.push('end_time = ?');
            params.push(updates.endTime);
        }
        if (updates.durationMinutes !== undefined) {
            fields.push('duration_minutes = ?');
            params.push(updates.durationMinutes);
        }
        if (updates.date !== undefined) {
            fields.push('date = ?');
            params.push(updates.date);
        }
        if (updates.status !== undefined) {
            fields.push('status = ?');
            params.push(updates.status);
        }
        if (updates.notes !== undefined) {
            fields.push('notes = ?');
            params.push(updates.notes);
        }

        if (fields.length === 0) return null;

        params.push(id);
        dbManager.exec(`
            UPDATE calendar_blocks SET ${fields.join(', ')} WHERE id = ?
        `, params);

        return readCalendarBlocks({ id })[0];
    }

    function deleteCalendarBlock(id) {
        dbManager.exec('DELETE FROM calendar_blocks WHERE id = ?', [id]);
        return { success: true };
    }

    return {
        readJson,
        writeJson,
        getDbManager: () => dbManager,
        // Calendar blocks
        readCalendarBlocks,
        createCalendarBlock,
        updateCalendarBlock,
        deleteCalendarBlock,
    };
}
