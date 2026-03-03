/**
 * Coach Ceremonies (Fase 10.5)
 *
 * Proactive ceremonies triggered by RISK, not just time.
 *
 * Ceremonies:
 * - Morning Brief: if overload, deadlines today, or objectives at risk
 * - Midweek Check: if low completion rate or deviation from plan
 * - Weekly Review: if critical pending items or low completion rate
 *
 * Anti-spam: max 1 ceremony per window per day/week (logged in coach_events)
 */

import logger from './logger.js';
import {
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
} from './capacity-calculator.js';
import { fetchRiskSignals, buildCapacityConfig } from './coach-rules-engine.js';

// ─── Ceremony Windows ────────────────────────────────────────────

const CEREMONY_WINDOWS = {
    morning_brief: {
        start: 7,
        end: 9,
        frequency: 'daily',
        label: 'Morning Brief',
    },
    midweek_check: {
        start: 12,
        end: 14,
        frequency: 'weekly',
        dayOfWeek: 3, // Wednesday
        label: 'Midweek Check',
    },
    weekly_review: {
        start: 16,
        end: 18,
        frequency: 'weekly',
        dayOfWeek: 5, // Friday
        label: 'Weekly Review',
    },
};

// ─── Spam Prevention ─────────────────────────────────────────────

/**
 * Check if ceremony was already shown in current window
 */
function wasAlreadyShown(db, ceremonyType) {
    const now = new Date();
    const window = CEREMONY_WINDOWS[ceremonyType];

    if (!window) return false;

    const since = window.frequency === 'daily'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const recent = db.queryOne(
        `SELECT * FROM coach_events WHERE rule_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1`,
        [`ceremony:${ceremonyType}`, since]
    );

    return !!recent;
}

/**
 * Adaptive frequency: check if ceremony should be skipped based on dismissal history.
 * If user dismissed this ceremony 3+ times in the last 7 days, reduce frequency (skip every other day).
 * Resets when user accepts 3+ times consecutively.
 */
function shouldSkipAdaptive(db, ceremonyType) {
    try {
        const freqKey = `ceremony_freq_${ceremonyType}`;
        const memRow = db.queryOne('SELECT value FROM coach_memory WHERE key = ?', [freqKey]);
        if (!memRow) return false;

        const config = JSON.parse(memRow.value);
        if (config.frequency !== 'reduced' || !config.skipDays) return false;

        // Check days since last ceremony_shown for this type
        const lastShown = db.queryOne(
            `SELECT created_at FROM coach_events WHERE event_type = 'ceremony_shown' AND rule_id = ? ORDER BY created_at DESC LIMIT 1`,
            [`ceremony:${ceremonyType}`]
        );

        if (!lastShown) return false;

        const daysSince = Math.floor(
            (Date.now() - new Date(lastShown.created_at).getTime()) / 86400000
        );

        return daysSince <= config.skipDays;
    } catch {
        return false;
    }
}

/**
 * Log ceremony as shown (spam prevention)
 */
function logCeremonyShown(db, ceremonyType, payload) {
    const id = `ce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    db.exec(
        `INSERT INTO coach_events (id, event_type, rule_id, severity, title, description, reason, suggested_action, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            'ceremony_shown',
            `ceremony:${ceremonyType}`,
            payload.severity || 'medium',
            payload.title || CEREMONY_WINDOWS[ceremonyType]?.label || ceremonyType,
            payload.description || '',
            payload.reason || '',
            JSON.stringify(payload.suggestedActions || []),
            now,
        ]
    );
}

// ─── Risk Detection ──────────────────────────────────────────────

/**
 * Detect risks for Morning Brief
 * Returns { shouldShow: boolean, risks: [], actions: [] }
 */
async function detectMorningBriefRisks(deps) {
    const { readJson, getDbManager } = deps;
    const data = await readJson('tasks-data.json');
    const db = getDbManager();

    const risks = [];
    const actions = [];

    const tasks = data.tasks || [];
    const weekTasks = tasks.filter(t => t.thisWeek && t.status === 'active');

    // 1. Capacity overload
    const capacityConfig = buildCapacityConfig(data.config || {});
    const capacity = calculateWeeklyCapacity(capacityConfig);
    const loadMinutes = calculateWeeklyLoad(tasks);
    const overloadMinutes = loadMinutes - capacity.usable;

    if (overloadMinutes > 0) {
        const overloadHours = (overloadMinutes / 60).toFixed(1);
        risks.push({
            type: 'overload',
            severity: 'high',
            message: `Sobrecarga de ${overloadHours}h esta semana (${weekTasks.length} tareas activas)`,
        });
        actions.push({
            type: 'batch_reprioritize',
            label: 'Redistribuir tareas',
            description: `Liberar ${overloadHours}h moviendo tareas de baja prioridad`,
        });
    }

    // 2. Deadlines today or overdue
    const today = new Date().toISOString().split('T')[0];
    const dueTodayTasks = tasks.filter(t =>
        t.status === 'active' && t.dueDate && t.dueDate <= today
    );

    if (dueTodayTasks.length > 0) {
        risks.push({
            type: 'deadline_today',
            severity: 'high',
            message: `${dueTodayTasks.length} tarea(s) con fecha limite vencida o de hoy`,
        });
        actions.push({
            type: 'focus_tasks',
            label: 'Enfocar en deadlines',
            description: 'Priorizar tareas con fecha limite urgente',
            payload: { taskIds: dueTodayTasks.map(t => t.id) },
        });
    }

    // 3. Objectives at risk
    try {
        const riskSignals = fetchRiskSignals(db);
        const highRiskKRs = (riskSignals.risks || []).filter(r => r.risk?.level === 'high');

        if (highRiskKRs.length > 0) {
            risks.push({
                type: 'kr_at_risk',
                severity: 'medium',
                message: `${highRiskKRs.length} KR(s) en riesgo alto`,
            });
            actions.push({
                type: 'review_objectives',
                label: 'Revisar objetivos',
                description: 'Ver KRs en riesgo y tareas relacionadas',
            });
        }
    } catch (error) {
        logger.warn('Could not fetch risk signals for morning brief', { error: error.message });
    }

    // 4. Too many uncommitted tasks (high count = overwhelm signal)
    if (weekTasks.length >= 10) {
        risks.push({
            type: 'high_task_count',
            severity: 'medium',
            message: `${weekTasks.length} tareas activas esta semana (posible saturacion)`,
        });
        actions.push({
            type: 'batch_reprioritize',
            label: 'Simplificar semana',
            description: 'Mover tareas no esenciales a "Algun dia"',
        });
    }

    return {
        shouldShow: risks.length > 0,
        risks,
        actions,
    };
}

/**
 * Detect risks for Midweek Check
 * Returns { shouldShow: boolean, risks: [], actions: [] }
 */
async function detectMidweekCheckRisks(deps) {
    const { readJson } = deps;
    const data = await readJson('tasks-data.json');

    const risks = [];
    const actions = [];

    const tasks = data.tasks || [];
    const weekTasks = tasks.filter(t => t.thisWeek && t.status !== 'archived');
    const doneTasks = weekTasks.filter(t => t.status === 'done');
    const activeTasks = weekTasks.filter(t => t.status === 'active');
    const totalWeek = doneTasks.length + activeTasks.length;
    const completionRate = totalWeek > 0 ? (doneTasks.length / totalWeek) * 100 : 0;

    // 1. Low completion rate (< 50%)
    if (completionRate < 50 && totalWeek > 0) {
        risks.push({
            type: 'low_completion',
            severity: 'medium',
            message: `Solo ${completionRate.toFixed(0)}% completado (${doneTasks.length}/${totalWeek})`,
        });
        actions.push({
            type: 'batch_reprioritize',
            label: 'Ajustar plan semanal',
            description: 'Reducir compromisos para el resto de la semana',
        });
    }

    // 2. Many active tasks with no progress
    if (activeTasks.length >= 8) {
        risks.push({
            type: 'too_many_active',
            severity: 'medium',
            message: `${activeTasks.length} tareas activas sin completar`,
        });
        actions.push({
            type: 'review_blockers',
            label: 'Revisar bloqueadores',
            description: 'Identificar que impide completar estas tareas',
        });
    }

    return {
        shouldShow: risks.length > 0,
        risks,
        actions,
    };
}

/**
 * Detect risks for Weekly Review
 * Returns { shouldShow: boolean, risks: [], actions: [] }
 */
async function detectWeeklyReviewRisks(deps) {
    const { readJson, getDbManager } = deps;
    const data = await readJson('tasks-data.json');
    const db = getDbManager();

    const risks = [];
    const actions = [];

    const tasks = data.tasks || [];
    const weekTasks = tasks.filter(t => t.thisWeek);
    const activeTasks = weekTasks.filter(t => t.status === 'active');
    const doneTasks = weekTasks.filter(t => t.status === 'done');
    const totalWeek = activeTasks.length + doneTasks.length;

    // 1. Pending tasks at end of week
    if (activeTasks.length > 0) {
        risks.push({
            type: 'pending_tasks',
            severity: activeTasks.length >= 5 ? 'high' : 'medium',
            message: `${activeTasks.length} tarea(s) pendiente(s) de esta semana`,
        });
        actions.push({
            type: 'plan_next_week',
            label: 'Planificar proxima semana',
            description: 'Mover pendientes a la siguiente semana',
        });
    }

    // 2. Low weekly completion rate (< 50%)
    const completionRate = totalWeek > 0 ? (doneTasks.length / totalWeek) * 100 : 0;

    if (completionRate < 50 && totalWeek > 0) {
        risks.push({
            type: 'low_weekly_completion',
            severity: 'medium',
            message: `Tasa de completitud: ${completionRate.toFixed(0)}% (${doneTasks.length}/${totalWeek})`,
        });
        actions.push({
            type: 'analyze_patterns',
            label: 'Analizar patrones',
            description: 'Revisar que bloqueo el progreso esta semana',
        });
    }

    // 3. Objectives progress stalled
    try {
        const riskSignals = fetchRiskSignals(db);
        const stalledKRs = (riskSignals.risks || []).filter(r =>
            r.risk?.reasons?.some(reason => reason.code === 'no_progress_14d')
        );

        if (stalledKRs.length > 0) {
            risks.push({
                type: 'stalled_objectives',
                severity: 'medium',
                message: `${stalledKRs.length} KR(s) sin progreso en 2 semanas`,
            });
            actions.push({
                type: 'review_objectives',
                label: 'Revisar objetivos',
                description: 'Actualizar progreso de KRs estancados',
            });
        }
    } catch (error) {
        logger.warn('Could not fetch risk signals for weekly review', { error: error.message });
    }

    return {
        shouldShow: risks.length > 0,
        risks,
        actions,
    };
}

// ─── Main Ceremonies Function ────────────────────────────────────

/**
 * Get active ceremonies based on time window and risk signals.
 *
 * Returns array of ceremonies:
 * [
 *   {
 *     type: 'morning_brief',
 *     title: 'Morning Brief',
 *     severity: 'high',
 *     reason: '...',
 *     risks: [...],
 *     suggestedActions: [...],
 *     timestamp: '2026-02-16T08:00:00.000Z'
 *   }
 * ]
 */
export async function getCeremonies(deps) {
    const { getDbManager } = deps;
    const db = getDbManager();

    const now = new Date();

    const ceremonies = [];

    // ── Always-on risk scan ─────────────────────────────────────
    // Evaluate ALL risk detectors regardless of time window.
    // The window only controls the cooldown key so the same ceremony
    // isn't spammed multiple times in a short period.

    const detectors = [
        { type: 'morning_brief', detect: detectMorningBriefRisks },
        { type: 'midweek_check', detect: detectMidweekCheckRisks },
        { type: 'weekly_review', detect: detectWeeklyReviewRisks },
    ];

    for (const { type, detect } of detectors) {
        const window = CEREMONY_WINDOWS[type];

        // Spam prevention: max 1 per cooldown period (daily or weekly)
        if (wasAlreadyShown(db, type)) {
            logger.info(`Ceremony ${type} already shown in current window, skipping`);
            continue;
        }

        // Adaptive frequency: skip if user has repeatedly dismissed this ceremony
        if (shouldSkipAdaptive(db, type)) {
            logger.info(`Ceremony ${type} skipped by adaptive frequency (too many dismissals)`);
            continue;
        }

        // Detect risks
        let riskDetection = { shouldShow: false, risks: [], actions: [] };

        try {
            riskDetection = await detect(deps);
        } catch (error) {
            logger.error(`Risk detection failed for ${type}`, { error: error.message });
            continue;
        }

        // Only show if there are real risks
        if (!riskDetection.shouldShow) {
            continue;
        }

        // Build ceremony payload
        const highestSeverity = riskDetection.risks.some(r => r.severity === 'high') ? 'high' : 'medium';
        const riskMessages = riskDetection.risks.map(r => r.message).join(', ');

        const ceremony = {
            type,
            title: window.label,
            severity: highestSeverity,
            reason: `Riesgos detectados: ${riskMessages}`,
            risks: riskDetection.risks,
            suggestedActions: riskDetection.actions,
            timestamp: now.toISOString(),
        };

        ceremonies.push(ceremony);

        logger.info(`Ceremony ${type} generated`, {
            risks: riskDetection.risks.length,
            actions: riskDetection.actions.length,
        });
    }

    return ceremonies;
}

/**
 * Mark ceremony as dismissed (for analytics)
 */
export function dismissCeremony(db, ceremonyType, action) {
    const now = new Date().toISOString();

    // 1. Log ceremony_shown (spam prevention — prevents re-showing in current window)
    logCeremonyShown(db, ceremonyType, {
        title: CEREMONY_WINDOWS[ceremonyType]?.label || ceremonyType,
        severity: 'medium',
    });

    // 2. Log ceremony_dismissed (analytics — tracks user action)
    const id = `ce-dismiss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    db.exec(
        `INSERT INTO coach_events (id, event_type, rule_id, severity, title, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            'ceremony_dismissed',
            `ceremony:${ceremonyType}`,
            'low',
            `Ceremony dismissed: ${ceremonyType}`,
            `User action: ${action}`,
            now,
        ]
    );

    logger.info(`Ceremony ${ceremonyType} dismissed`, { action });

    // 3. Adaptive frequency: track dismissals and adjust
    try {
        const isDismissal = action === 'dismissed' || action === 'not_now' || action === 'postpone';
        const freqKey = `ceremony_freq_${ceremonyType}`;

        if (isDismissal) {
            // Count recent dismissals (last 7 days)
            const recentDismissals = db.queryOne(
                `SELECT COUNT(*) as count FROM coach_events
                 WHERE event_type = 'ceremony_dismissed' AND rule_id = ?
                 AND created_at > datetime('now', '-7 days')`,
                [`ceremony:${ceremonyType}`]
            );

            if (recentDismissals && recentDismissals.count >= 3) {
                // Reduce frequency: skip every other occurrence
                const existing = db.queryOne('SELECT id FROM coach_memory WHERE key = ?', [freqKey]);
                const memValue = JSON.stringify({ frequency: 'reduced', skipDays: 1 });
                if (existing) {
                    db.exec('UPDATE coach_memory SET value = ?, confidence = 0.8, updated_at = datetime(\'now\') WHERE key = ?', [memValue, freqKey]);
                } else {
                    const memId = `mem-freq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    db.exec('INSERT INTO coach_memory (id, key, value, confidence, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'))', [memId, freqKey, memValue, 0.8]);
                }
                logger.info(`Adaptive frequency: ${ceremonyType} reduced (${recentDismissals.count} dismissals in 7 days)`);
            }
        } else {
            // User accepted/applied — count recent acceptances to potentially restore frequency
            const recentAcceptances = db.queryOne(
                `SELECT COUNT(*) as count FROM coach_events
                 WHERE event_type = 'ceremony_dismissed' AND rule_id = ?
                 AND description LIKE '%apply%'
                 AND created_at > datetime('now', '-7 days')`,
                [`ceremony:${ceremonyType}`]
            );

            if (recentAcceptances && recentAcceptances.count >= 3) {
                // Restore normal frequency
                db.exec('DELETE FROM coach_memory WHERE key = ?', [freqKey]);
                logger.info(`Adaptive frequency: ${ceremonyType} restored to normal`);
            }
        }
    } catch (err) {
        logger.warn('Adaptive frequency update failed', { error: err.message });
    }
}
