/**
 * Coach Pattern Memory Service (Fase 10.2)
 *
 * Memoria de patrones del usuario:
 * - Guarda señales estructuradas con confianza
 * - horas productivas, sesgo de sobreplanificación, tasa de cumplimiento por área
 * - tareas recurrentemente postergadas
 * - Usa esta memoria en prompts y recomendaciones
 */

import logger from './logger.js';

// ─── Pattern Types ───────────────────────────────────────────

const PATTERN_TYPES = {
    PRODUCTIVE_HOURS: 'productive_hours',
    OVERCOMMITMENT_BIAS: 'overcommitment_bias',
    COMPLETION_RATE_BY_AREA: 'completion_rate_by_area',
    RECURRING_POSTPONED_TASKS: 'recurring_postponed_tasks',
    PREFERRED_WORK_DURATION: 'preferred_work_duration',
    ENERGY_PROFILE: 'energy_profile',
};

// ─── Memory Storage ──────────────────────────────────────────

/**
 * Store or update a pattern in memory
 */
export function storePattern(db, patternType, value, confidence = 0.7) {
    try {
        const key = `pattern:${patternType}`;
        const existing = db.queryOne('SELECT * FROM coach_memory WHERE key = ?', [key]);

        if (existing) {
            // Update with confidence decay/boost
            const newConfidence = Math.min(1.0, confidence);
            db.exec(
                'UPDATE coach_memory SET value = ?, confidence = ?, updated_at = ? WHERE key = ?',
                [JSON.stringify(value), newConfidence, new Date().toISOString(), key]
            );
        } else {
            // Insert new pattern
            db.exec(
                'INSERT INTO coach_memory (id, key, value, confidence, updated_at) VALUES (?, ?, ?, ?, ?)',
                [
                    `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    key,
                    JSON.stringify(value),
                    confidence,
                    new Date().toISOString(),
                ]
            );
        }

        logger.info('Pattern stored in memory', { patternType, confidence });
    } catch (error) {
        logger.error('Failed to store pattern', { error: error.message, patternType });
    }
}

/**
 * Retrieve a pattern from memory
 */
export function getPattern(db, patternType) {
    try {
        const key = `pattern:${patternType}`;
        const row = db.queryOne('SELECT * FROM coach_memory WHERE key = ?', [key]);

        if (!row) return null;

        return {
            type: patternType,
            value: JSON.parse(row.value),
            confidence: row.confidence,
            updatedAt: row.updated_at,
        };
    } catch (error) {
        logger.error('Failed to retrieve pattern', { error: error.message, patternType });
        return null;
    }
}

/**
 * Analyze task completion patterns and update memory
 */
export async function analyzeCompletionPatterns(deps) {
    const { readJson, getDbManager } = deps;

    try {
        const data = await readJson('tasks-data.json');
        const db = getDbManager();
        const tasks = data.tasks || [];

        // 1. Analyze completion rate by area
        const areas = {};
        for (const task of tasks) {
            const areaId = task.category || task.areaId || 'uncategorized';
            if (!areas[areaId]) {
                areas[areaId] = { total: 0, completed: 0 };
            }
            if (task.status === 'done') {
                areas[areaId].completed += 1;
            }
            areas[areaId].total += 1;
        }

        const completionByArea = {};
        for (const [areaId, stats] of Object.entries(areas)) {
            if (stats.total > 5) { // Only if enough data
                completionByArea[areaId] = Math.round((stats.completed / stats.total) * 100);
            }
        }

        if (Object.keys(completionByArea).length > 0) {
            storePattern(db, PATTERN_TYPES.COMPLETION_RATE_BY_AREA, completionByArea, 0.8);
        }

        // 2. Analyze overcommitment bias
        const weekTasks = tasks.filter(t => t.thisWeek);
        const committedCount = weekTasks.length;
        const completedCount = weekTasks.filter(t => t.status === 'done').length;
        const completionRate = committedCount > 0 ? (completedCount / committedCount) * 100 : 100;

        if (completionRate < 60 && committedCount >= 5) {
            // User is overcommitting
            storePattern(db, PATTERN_TYPES.OVERCOMMITMENT_BIAS, {
                bias: 'high',
                avgCompletionRate: Math.round(completionRate),
                recommendation: 'Reduce compromisos semanales en 30%',
            }, 0.7);
        } else if (completionRate >= 80) {
            storePattern(db, PATTERN_TYPES.OVERCOMMITMENT_BIAS, {
                bias: 'low',
                avgCompletionRate: Math.round(completionRate),
                recommendation: 'Buen equilibrio de compromisos',
            }, 0.9);
        }

        // 3. Detect recurring postponed tasks
        const postponedTasks = tasks.filter(t => {
            if (t.status !== 'active') return false;
            // Heuristic: task has been rescheduled (weekCommitted changed multiple times)
            // For MVP, detect tasks older than 14 days without completion
            if (!t.createdAt) return false;
            const age = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            return age > 14;
        });

        if (postponedTasks.length > 0) {
            storePattern(db, PATTERN_TYPES.RECURRING_POSTPONED_TASKS, {
                count: postponedTasks.length,
                tasks: postponedTasks.slice(0, 5).map(t => ({ id: t.id, title: t.title, age: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24)) })),
                recommendation: 'Tareas postergadas > 14 días: dividir o eliminar',
            }, 0.6);
        }

        // 4. Analyze productive hours (based on completion timestamps)
        const completionHours = tasks
            .filter(t => t.completedAt)
            .map(t => new Date(t.completedAt).getHours());

        if (completionHours.length >= 10) {
            const hourCounts = {};
            for (const hour of completionHours) {
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }

            const topHours = Object.entries(hourCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([hour]) => parseInt(hour));

            storePattern(db, PATTERN_TYPES.PRODUCTIVE_HOURS, {
                hours: topHours,
                label: topHours.map(h => `${h}:00`).join(', '),
                recommendation: `Agenda trabajo crítico a las ${topHours[0]}:00-${topHours[0] + 2}:00`,
            }, 0.7);
        }

        logger.info('Completion patterns analyzed and stored');
        return { success: true, patternsAnalyzed: 4 };
    } catch (error) {
        logger.error('Failed to analyze completion patterns', { error: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Get all patterns for use in prompts
 */
export function getAllPatterns(db) {
    try {
        const rows = db.query(
            `SELECT * FROM coach_memory WHERE key LIKE 'pattern:%' AND confidence >= 0.5 ORDER BY confidence DESC LIMIT 20`
        );

        return rows.map(row => ({
            type: row.key.replace('pattern:', ''),
            value: JSON.parse(row.value),
            confidence: row.confidence,
            updatedAt: row.updated_at,
        }));
    } catch (error) {
        logger.error('Failed to get all patterns', { error: error.message });
        return [];
    }
}

/**
 * Decay old patterns (confidence decreases over time)
 */
export function decayOldPatterns(db) {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Reduce confidence by 10% for patterns older than 30 days
        db.exec(
            `UPDATE coach_memory
             SET confidence = MAX(0.3, confidence * 0.9)
             WHERE key LIKE 'pattern:%' AND updated_at < ?`,
            [thirtyDaysAgo]
        );

        logger.info('Old patterns decayed');
    } catch (error) {
        logger.error('Failed to decay patterns', { error: error.message });
    }
}
