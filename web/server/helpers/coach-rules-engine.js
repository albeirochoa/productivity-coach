/**
 * Coach Rules Engine (Fase 8)
 *
 * Deterministic recommendation engine.
 * No AI/LLM dependency — all decisions are rule-based and explainable.
 *
 * Input: snapshot of tasks, capacity, objectives, risk signals
 * Output: prioritized list of recommendations with reasons
 */

import {
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
    detectOverload,
    formatMinutes,
} from './capacity-calculator.js';

// ─── Rule IDs ────────────────────────────────────────────────
export const RULE_IDS = {
    OVERLOAD_DETECTED: 'overload_detected',
    DEADLINE_APPROACHING: 'deadline_approaching',
    KR_AT_RISK: 'kr_at_risk',
    UNLINKED_TASKS: 'unlinked_tasks',
    STALE_INBOX: 'stale_inbox',
    IDLE_PROJECT: 'idle_project',
    EMPTY_WEEK: 'empty_week',
    LOW_COMPLETION_RATE: 'low_completion_rate',
};

// ─── Severity levels ─────────────────────────────────────────
const SEVERITY = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

// ─── Helpers ─────────────────────────────────────────────────
function daysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr) {
    if (!dateStr) return null;
    const past = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - past) / (1000 * 60 * 60 * 24));
}

// ─── Individual Rules ────────────────────────────────────────

/**
 * Rule 1: Overload detected — weekly load exceeds usable capacity
 */
function checkOverload(tasks, config) {
    const capacity = calculateWeeklyCapacity(config);
    const load = calculateWeeklyLoad(tasks);
    const overload = detectOverload(load, capacity.usable);

    if (!overload.isOverloaded) return null;

    return {
        ruleId: RULE_IDS.OVERLOAD_DETECTED,
        severity: overload.excess > 120 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        title: 'Semana sobrecargada',
        description: `Tu carga semanal (${formatMinutes(load)}) excede tu capacidad util (${formatMinutes(capacity.usable)}) por ${formatMinutes(overload.excess)}.`,
        reason: 'La sobrecarga reduce la calidad del trabajo y aumenta el estres.',
        suggestedAction: {
            type: 'auto_redistribute',
            label: 'Redistribuir carga',
            payload: { excessMinutes: overload.excess },
        },
        data: { load, capacity: capacity.usable, excess: overload.excess, percentage: overload.percentage },
    };
}

/**
 * Rule 2: Deadline approaching — task due within 3 days without completion
 */
function checkDeadlines(tasks) {
    const results = [];
    const activeTasks = tasks.filter(t => t.status === 'active');

    for (const task of activeTasks) {
        const remaining = daysUntil(task.dueDate);
        if (remaining === null || remaining > 3) continue;

        const isOverdue = remaining < 0;
        const severity = isOverdue ? SEVERITY.HIGH : remaining <= 1 ? SEVERITY.HIGH : SEVERITY.MEDIUM;

        results.push({
            ruleId: RULE_IDS.DEADLINE_APPROACHING,
            severity,
            title: isOverdue
                ? `Tarea vencida: "${task.title}"`
                : `Fecha limite cercana: "${task.title}"`,
            description: isOverdue
                ? `Esta tarea vencio hace ${Math.abs(remaining)} dia(s).`
                : `Faltan ${remaining} dia(s) para la fecha limite.`,
            reason: 'Las tareas cercanas a su fecha limite necesitan atencion inmediata.',
            suggestedAction: {
                type: 'focus_task',
                label: isOverdue ? 'Reprogramar o completar' : 'Priorizar esta tarea',
                payload: { taskId: task.id, taskTitle: task.title },
            },
            data: { taskId: task.id, daysRemaining: remaining, dueDate: task.dueDate },
        });
    }

    return results;
}

/**
 * Rule 3: KR at risk — consume risk signals from objectives module
 */
function checkKrRisks(riskSignals, tasks = []) {
    if (!riskSignals || !riskSignals.risks) return [];

    return riskSignals.risks
        .filter(r => r.risk.level === 'high')
        .map(r => {
            const linkedTasks = tasks.filter(t =>
                t.keyResultId === r.id && t.status === 'active'
            );
            const hasLinkedTasks = linkedTasks.length > 0;

            return {
                ruleId: RULE_IDS.KR_AT_RISK,
                severity: SEVERITY.HIGH,
                title: `KR en riesgo: "${r.title}"`,
                description: r.risk.reasons.map(reason => reason.label).join('. ') + '.',
                reason: hasLinkedTasks
                    ? `Tienes ${linkedTasks.length} tarea(s) activas para este KR: ${linkedTasks.map(t => t.title).join(', ')}. Enfocate en completarlas.`
                    : `Este KR no tiene tareas activas vinculadas. Crea una tarea para avanzar "${r.title}".`,
                suggestedAction: {
                    type: 'review_kr',
                    label: hasLinkedTasks ? 'Ver tareas del KR' : 'Crear tarea para KR',
                    payload: {
                        keyResultId: r.id,
                        objectiveId: r.objectiveId,
                        linkedTaskIds: linkedTasks.map(t => t.id),
                    },
                },
                data: {
                    keyResultId: r.id,
                    objectiveId: r.objectiveId,
                    progress: r.progress,
                    riskLevel: r.risk.level,
                    riskScore: r.risk.score,
                    linkedTaskCount: linkedTasks.length,
                },
            };
        });
}

/**
 * Rule 4: Unlinked tasks — committed tasks without strategic link
 */
function checkUnlinkedTasks(tasks) {
    const committedNoLink = tasks.filter(t =>
        t.thisWeek &&
        t.status === 'active' &&
        !t.objectiveId &&
        !t.keyResultId
    );

    if (committedNoLink.length === 0) return null;

    const pct = tasks.filter(t => t.thisWeek && t.status === 'active').length;
    if (pct === 0) return null;

    const ratio = (committedNoLink.length / pct) * 100;
    if (ratio < 50) return null; // Only flag if >50% unlinked

    return {
        ruleId: RULE_IDS.UNLINKED_TASKS,
        severity: SEVERITY.LOW,
        title: `${committedNoLink.length} tareas sin vinculo estrategico`,
        description: `${Math.round(ratio)}% de tus tareas de esta semana no estan vinculadas a ningun objetivo o KR.`,
        reason: 'Vincular tareas a objetivos ayuda a mantener el foco estrategico.',
        suggestedAction: {
            type: 'link_tasks',
            label: 'Vincular tareas a objetivos',
            payload: { taskIds: committedNoLink.map(t => t.id) },
        },
        data: { unlinkedCount: committedNoLink.length, totalCommitted: pct, ratio: Math.round(ratio) },
    };
}

/**
 * Rule 5: Stale inbox — items sitting unprocessed for 3+ days
 */
function checkStaleInbox(inbox) {
    const allItems = [...(inbox.work || []), ...(inbox.personal || [])];
    const stale = allItems.filter(item => {
        const age = daysSince(item.date);
        return age !== null && age >= 3;
    });

    if (stale.length === 0) return null;

    return {
        ruleId: RULE_IDS.STALE_INBOX,
        severity: stale.length >= 5 ? SEVERITY.MEDIUM : SEVERITY.LOW,
        title: `${stale.length} items en inbox sin procesar`,
        description: `Tienes ${stale.length} item(s) en tu bandeja de entrada con 3+ dias sin procesar.`,
        reason: 'Un inbox sin procesar genera ansiedad y riesgo de olvidar tareas importantes.',
        suggestedAction: {
            type: 'process_inbox',
            label: 'Procesar bandeja',
            payload: { staleCount: stale.length },
        },
        data: { staleCount: stale.length, totalInbox: allItems.length },
    };
}

/**
 * Rule 6: Idle project — project with no milestone progress in 7+ days
 */
function checkIdleProjects(tasks) {
    const results = [];
    const projects = tasks.filter(t => t.type === 'project' && t.status === 'active');

    for (const project of projects) {
        if (!project.milestones || project.milestones.length === 0) continue;

        const lastCompleted = project.milestones
            .filter(m => m.completed && m.completedAt)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];

        const daysSinceProgress = lastCompleted
            ? daysSince(lastCompleted.completedAt)
            : daysSince(project.createdAt);

        if (daysSinceProgress === null || daysSinceProgress < 7) continue;

        results.push({
            ruleId: RULE_IDS.IDLE_PROJECT,
            severity: daysSinceProgress >= 14 ? SEVERITY.MEDIUM : SEVERITY.LOW,
            title: `Proyecto inactivo: "${project.title}"`,
            description: `Sin progreso en milestones desde hace ${daysSinceProgress} dias.`,
            reason: 'Los proyectos estancados pierden momentum y acumulan deuda tecnica o de gestion.',
            suggestedAction: {
                type: 'commit_milestone',
                label: 'Comprometer proximo milestone',
                payload: { taskId: project.id, taskTitle: project.title },
            },
            data: { taskId: project.id, daysSinceProgress },
        });
    }

    return results;
}

/**
 * Rule 7: Empty week — no tasks committed for this week
 */
function checkEmptyWeek(tasks) {
    const committed = tasks.filter(t => t.thisWeek && t.status === 'active');
    if (committed.length > 0) return null;

    const available = tasks.filter(t => t.status === 'active');
    if (available.length === 0) return null;

    return {
        ruleId: RULE_IDS.EMPTY_WEEK,
        severity: SEVERITY.MEDIUM,
        title: 'Semana sin compromisos',
        description: `No tienes tareas comprometidas para esta semana. Tienes ${available.length} tarea(s) activa(s) disponibles.`,
        reason: 'Comprometer tareas semanalmente mantiene el ritmo y la productividad.',
        suggestedAction: {
            type: 'plan_week',
            label: 'Planificar semana',
            payload: { availableTaskCount: available.length },
        },
        data: { availableCount: available.length },
    };
}

/**
 * Rule 8: Low completion rate — less than 50% of committed tasks done by Thursday
 */
function checkCompletionRate(tasks) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 4=Thu
    if (dayOfWeek < 4) return null; // Only check Thu-Sun

    const committed = tasks.filter(t => t.thisWeek);
    if (committed.length < 3) return null; // Not enough data

    const completed = committed.filter(t => t.status === 'done');
    const rate = (completed.length / committed.length) * 100;
    if (rate >= 50) return null;

    return {
        ruleId: RULE_IDS.LOW_COMPLETION_RATE,
        severity: rate < 25 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        title: 'Tasa de completitud baja esta semana',
        description: `Solo has completado ${completed.length}/${committed.length} tareas (${Math.round(rate)}%). La semana esta avanzada.`,
        reason: 'Reevaluar compromisos a mitad de semana permite ajustar expectativas.',
        suggestedAction: {
            type: 'review_week',
            label: 'Revisar compromisos',
            payload: { completedCount: completed.length, totalCommitted: committed.length },
        },
        data: { completed: completed.length, committed: committed.length, rate: Math.round(rate) },
    };
}

// ─── Main Engine ─────────────────────────────────────────────

/**
 * Generate all recommendations from current state
 *
 * @param {Object} snapshot - Current app state
 * @param {Array} snapshot.tasks - All tasks
 * @param {Object} snapshot.inbox - Inbox data {work: [], personal: []}
 * @param {Object} snapshot.config - Capacity config
 * @param {Object|null} snapshot.riskSignals - From GET /api/objectives/risk-signals
 * @returns {Array} Sorted recommendations
 */
// ─── Shared Helpers (used by coach-routes and coach-chat-tools) ──

/**
 * Fetch risk signals from objectives/key_results tables
 * @param {Object} db - Database manager instance (already initialized)
 * @returns {Object} { risks, focusWeek, summary }
 */
export function fetchRiskSignals(db) {
    try {
        const rows = db.query(`
            SELECT
                kr.*,
                o.title AS objective_title,
                o.period AS objective_period,
                o.area_id AS objective_area_id
            FROM key_results kr
            INNER JOIN objectives o ON o.id = kr.objective_id
            WHERE o.status != 'done'
            ORDER BY kr.updated_at ASC
        `);

        if (rows.length === 0) return { risks: [], focusWeek: [], summary: {} };

        const nowMs = Date.now();
        const assessed = rows.map(row => {
            const range = row.target_value - row.start_value;
            const progress = range === 0
                ? (row.current_value >= row.target_value ? 100 : 0)
                : Math.max(0, Math.min(100, ((row.current_value - row.start_value) / range) * 100));

            const reasons = [];
            let score = 0;

            const updatedMs = Date.parse(row.updated_at || '');
            const daysWithoutUpdate = Number.isNaN(updatedMs) ? null : Math.floor((nowMs - updatedMs) / 86400000);
            const isNoProgress = Number(row.current_value) === Number(row.start_value);

            if (daysWithoutUpdate != null && daysWithoutUpdate >= 7 && isNoProgress && progress < 100) {
                reasons.push({ code: 'no_progress_7d', label: 'Sin avance en 7+ dias' });
                score += 2;
            }
            if (daysWithoutUpdate != null && daysWithoutUpdate >= 14 && progress < 100) {
                reasons.push({ code: 'stalled_14d', label: 'Estancado 14+ dias' });
                score += 2;
            }
            if (row.status === 'off_track') { score += 1; }
            else if (row.status === 'at_risk') { score += 1; }

            const level = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';

            return {
                id: row.id,
                title: row.title,
                progress: Math.round(progress * 100) / 100,
                status: row.status,
                objectiveId: row.objective_id,
                objectiveTitle: row.objective_title,
                risk: { level, score, reasons },
            };
        });

        const risks = assessed.filter(a => a.risk.level !== 'low').sort((a, b) => b.risk.score - a.risk.score);
        return { risks, focusWeek: risks.slice(0, 3), summary: { totalKrs: assessed.length, riskCount: risks.length } };
    } catch {
        return { risks: [], focusWeek: [], summary: {} };
    }
}

/**
 * Build capacity config from raw data config
 * @param {Object} config - Raw config from readJson
 * @returns {Object} Normalized capacity config
 */
export function buildCapacityConfig(config) {
    return {
        work_hours_per_day: config.work_hours_per_day || 8,
        buffer_percentage: config.buffer_percentage || 20,
        break_minutes_per_day: config.break_minutes_per_day || 60,
        work_days_per_week: config.work_days_per_week || 5,
    };
}

// ─── Main Engine ─────────────────────────────────────────────

export function generateRecommendations(snapshot) {
    const { tasks, inbox, config, riskSignals } = snapshot;

    const recommendations = [];

    // Run all rules, collect non-null results
    const overload = checkOverload(tasks, config);
    if (overload) recommendations.push(overload);

    recommendations.push(...checkDeadlines(tasks));
    recommendations.push(...checkKrRisks(riskSignals, tasks));

    const unlinked = checkUnlinkedTasks(tasks);
    if (unlinked) recommendations.push(unlinked);

    const stale = checkStaleInbox(inbox);
    if (stale) recommendations.push(stale);

    recommendations.push(...checkIdleProjects(tasks));

    const empty = checkEmptyWeek(tasks);
    if (empty) recommendations.push(empty);

    const lowRate = checkCompletionRate(tasks);
    if (lowRate) recommendations.push(lowRate);

    // Sort by severity: high > medium > low
    const severityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Add unique IDs
    return recommendations.map((rec, idx) => ({
        id: `rec-${Date.now()}-${idx}`,
        ...rec,
        generatedAt: new Date().toISOString(),
    }));
}

/**
 * Execute a recommended action (apply)
 *
 * @param {string} actionType - The suggestedAction.type
 * @param {Object} payload - The suggestedAction.payload
 * @param {Object} deps - {readJson, writeJson, getCurrentWeek}
 * @returns {Object} Result of the action
 */
export async function executeRecommendation(actionType, payload, deps) {
    const { readJson, writeJson, getCurrentWeek } = deps;

    switch (actionType) {
        case 'auto_redistribute': {
            // Defer low-priority tasks to free capacity
            const data = await readJson('tasks-data.json');
            const activeTasks = data.tasks.filter(t => t.thisWeek && t.status === 'active');
            const deferrable = activeTasks
                .filter(t => !t.priority || t.priority === 'low')
                .sort((a, b) => (a.type === 'simple' ? -1 : 1));

            let remaining = payload.excessMinutes || 60;
            const deferred = [];

            for (const task of deferrable) {
                if (remaining <= 0) break;
                task.thisWeek = false;
                task.weekCommitted = null;
                const taskTime = task.type === 'project'
                    ? (task.committedMilestones || []).reduce((sum, mId) => {
                        const m = task.milestones?.find(x => x.id === mId);
                        return sum + (m?.timeEstimate || 0);
                    }, 0)
                    : 60;
                remaining -= taskTime;
                deferred.push({ taskId: task.id, title: task.title, minutes: taskTime });
            }

            await writeJson('tasks-data.json', data);
            return {
                success: true,
                action: 'auto_redistribute',
                deferred,
                message: `${deferred.length} tarea(s) movida(s) a "Algun dia"`,
            };
        }

        case 'focus_task': {
            // Mark task as high priority + commit to this week
            const data = await readJson('tasks-data.json');
            const task = data.tasks.find(t => t.id === payload.taskId);
            if (!task) return { success: false, error: 'Tarea no encontrada' };

            task.priority = 'high';
            if (!task.thisWeek) {
                task.thisWeek = true;
                task.weekCommitted = getCurrentWeek();
            }
            await writeJson('tasks-data.json', data);
            return {
                success: true,
                action: 'focus_task',
                message: `"${task.title}" marcada como prioridad alta`,
            };
        }

        case 'plan_week': {
            // Auto-commit top tasks by priority and deadline
            const data = await readJson('tasks-data.json');
            const config = data.config || {};
            const capacity = calculateWeeklyCapacity({
                work_hours_per_day: config.work_hours_per_day || 8,
                buffer_percentage: config.buffer_percentage || 20,
                break_minutes_per_day: config.break_minutes_per_day || 60,
                work_days_per_week: config.work_days_per_week || 5,
            });

            const available = data.tasks
                .filter(t => t.status === 'active' && !t.thisWeek)
                .sort((a, b) => {
                    // Priority: high > normal > low
                    const pOrder = { high: 0, normal: 1, low: 2 };
                    const pDiff = (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
                    if (pDiff !== 0) return pDiff;
                    // Deadline: sooner first
                    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
                    if (a.dueDate) return -1;
                    if (b.dueDate) return 1;
                    return 0;
                });

            let usedMinutes = calculateWeeklyLoad(data.tasks);
            const committed = [];

            for (const task of available) {
                const taskTime = task.type === 'project' ? 60 : 60;
                if (usedMinutes + taskTime > capacity.usable) break;

                task.thisWeek = true;
                task.weekCommitted = getCurrentWeek();
                usedMinutes += taskTime;
                committed.push({ taskId: task.id, title: task.title });
            }

            await writeJson('tasks-data.json', data);
            return {
                success: true,
                action: 'plan_week',
                committed,
                message: `${committed.length} tarea(s) comprometida(s) para esta semana`,
            };
        }

        case 'review_kr': {
            // Prioritize linked tasks or acknowledge the review
            const data = await readJson('tasks-data.json');
            const linkedIds = payload.linkedTaskIds || [];

            if (linkedIds.length > 0) {
                // Mark linked tasks as high priority
                let prioritized = 0;
                for (const taskId of linkedIds) {
                    const task = data.tasks.find(t => t.id === taskId);
                    if (task && task.status === 'active') {
                        task.priority = 'high';
                        if (!task.thisWeek) {
                            task.thisWeek = true;
                            task.weekCommitted = getCurrentWeek();
                        }
                        prioritized++;
                    }
                }
                await writeJson('tasks-data.json', data);
                return {
                    success: true,
                    action: 'review_kr',
                    message: `${prioritized} tarea(s) priorizadas para avanzar el KR`,
                };
            }

            return {
                success: true,
                action: 'review_kr',
                message: 'KR revisado. Crea una tarea vinculada para avanzar.',
            };
        }

        default:
            return {
                success: false,
                action: actionType,
                message: `Accion "${actionType}" requiere ejecucion manual`,
            };
    }
}
