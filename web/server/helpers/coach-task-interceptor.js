/**
 * Coach Task Interceptor (Fase 10.2)
 *
 * Interceptor de tareas: validación antes de crear/mover tareas.
 * Si no cabe hoy, propone alternativas (mañana, semana, delegar, bajar prioridad).
 * Soft block por defecto con recomendación + confirmación.
 */

import {
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
    formatMinutes,
} from './capacity-calculator.js';
import { diagnoseLoadState } from './coach-capacity-diagnosis.js';

// ─── Intercept Modes ─────────────────────────────────────────

const INTERCEPT_MODES = {
    ALLOW: 'allow',           // No issue, allow
    SOFT_BLOCK: 'soft_block', // Warn but allow with confirmation
    HARD_BLOCK: 'hard_block', // Block completely (reserved for extreme cases)
};

// ─── Interceptor Engine ──────────────────────────────────────

/**
 * Intercept task creation/move and validate capacity/impact
 * @param {Object} taskData - Task data (title, type, thisWeek, dueDate, timeEstimate, etc)
 * @param {Object} deps - { readJson, getDbManager }
 * @returns {Object} Intercept result
 */
export async function interceptTaskAction(taskData, deps) {
    const { readJson, getDbManager } = deps;

    try {
        const data = await readJson('tasks-data.json');
        const tasks = data.tasks || [];
        const config = data.config || {};

        // Calculate current capacity
        const capacityConfig = {
            work_hours_per_day: config.work_hours_per_day || 8,
            buffer_percentage: config.buffer_percentage || 20,
            break_minutes_per_day: config.break_minutes_per_day || 60,
            work_days_per_week: config.work_days_per_week || 5,
        };
        const capacity = calculateWeeklyCapacity(capacityConfig);
        const currentLoad = calculateWeeklyLoad(tasks);
        const remaining = capacity.usable - currentLoad;

        // Estimate task time
        const taskTime = estimateTaskTime(taskData);

        // Check if committing to this week
        const isThisWeek = taskData.thisWeek === true;
        const isToday = taskData.dueDate === new Date().toISOString().split('T')[0];

        // If not this week, allow (no capacity impact)
        if (!isThisWeek && !isToday) {
            return {
                mode: INTERCEPT_MODES.ALLOW,
                message: 'Tarea agregada a "Algún día" sin impacto en capacidad.',
                allowed: true,
                alternatives: null,
            };
        }

        // Check capacity
        const wouldOverload = (currentLoad + taskTime) > capacity.usable;
        const utilization = capacity.usable > 0 ? ((currentLoad + taskTime) / capacity.usable) * 100 : 0;

        if (!wouldOverload) {
            return {
                mode: INTERCEPT_MODES.ALLOW,
                message: `Tarea agregada. Carga: ${formatMinutes(currentLoad + taskTime)} de ${formatMinutes(capacity.usable)} (${Math.round(utilization)}%)`,
                allowed: true,
                capacity: {
                    before: currentLoad,
                    after: currentLoad + taskTime,
                    remaining: remaining - taskTime,
                    utilization: Math.round(utilization),
                },
                alternatives: null,
            };
        }

        // Soft block: overload detected
        const alternatives = generateAlternatives(taskData, capacity, currentLoad, taskTime);

        return {
            mode: INTERCEPT_MODES.SOFT_BLOCK,
            message: `⚠️ Agregar esta tarea excedería tu capacidad semanal por ${formatMinutes((currentLoad + taskTime) - capacity.usable)}.`,
            allowed: false,
            requiresConfirmation: true,
            capacity: {
                before: currentLoad,
                after: currentLoad + taskTime,
                wouldExceedBy: (currentLoad + taskTime) - capacity.usable,
                utilization: Math.round(utilization),
            },
            alternatives,
            recommendation: alternatives[0]?.label || 'Posponer o reducir estimación',
        };
    } catch (error) {
        // Fail open: allow task but log warning
        return {
            mode: INTERCEPT_MODES.ALLOW,
            message: 'Tarea permitida (validación de capacidad no disponible)',
            allowed: true,
            warning: error.message,
        };
    }
}

/**
 * Intercept task move (e.g., drag to "Esta Semana" or "Hoy")
 */
export async function interceptTaskMove(taskId, targetList, deps) {
    const { readJson } = deps;

    try {
        const data = await readJson('tasks-data.json');
        const task = data.tasks.find(t => t.id === taskId);

        if (!task) {
            return {
                mode: INTERCEPT_MODES.ALLOW,
                message: 'Tarea no encontrada',
                allowed: false,
                error: 'Task not found',
            };
        }

        // Convert targetList to task data change
        const taskDataChange = {
            ...task,
            thisWeek: targetList === 'week' || targetList === 'today',
            dueDate: targetList === 'today' ? new Date().toISOString().split('T')[0] : task.dueDate,
        };

        // If already in target list, allow
        if (targetList === 'week' && task.thisWeek && !task.dueDate) {
            return {
                mode: INTERCEPT_MODES.ALLOW,
                message: 'Tarea ya está en "Esta Semana"',
                allowed: true,
            };
        }

        if (targetList === 'someday' && !task.thisWeek) {
            return {
                mode: INTERCEPT_MODES.ALLOW,
                message: 'Tarea ya está en "Algún día"',
                allowed: true,
            };
        }

        // If moving to someday, always allow (reduces load)
        if (targetList === 'someday') {
            return {
                mode: INTERCEPT_MODES.ALLOW,
                message: 'Tarea movida a "Algún día" (libera capacidad)',
                allowed: true,
            };
        }

        // Otherwise, intercept as creation
        return interceptTaskAction(taskDataChange, deps);
    } catch (error) {
        return {
            mode: INTERCEPT_MODES.ALLOW,
            message: 'Movimiento permitido (validación no disponible)',
            allowed: true,
            warning: error.message,
        };
    }
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Estimate task time in minutes
 */
function estimateTaskTime(taskData) {
    // If explicit timeEstimate provided
    if (taskData.timeEstimate) return taskData.timeEstimate;

    // If project with milestones
    if (taskData.type === 'project' && taskData.milestones) {
        return taskData.milestones.reduce((sum, m) => sum + (m.timeEstimate || 60), 0);
    }

    // Default: simple task = 60 min
    return 60;
}

/**
 * Generate alternative actions when capacity is exceeded
 */
function generateAlternatives(taskData, capacity, currentLoad, taskTime) {
    const alternatives = [];

    // 1. Schedule for next week
    alternatives.push({
        action: 'schedule_next_week',
        label: 'Programar para la próxima semana',
        payload: { thisWeek: false, dueDate: null },
    });

    // 2. Move to someday
    alternatives.push({
        action: 'move_to_someday',
        label: 'Mover a "Algún día" sin fecha',
        payload: { thisWeek: false, dueDate: null },
    });

    // 3. Reduce time estimate
    const reducedTime = Math.floor(taskTime * 0.5);
    if (currentLoad + reducedTime <= capacity.usable) {
        alternatives.push({
            action: 'reduce_estimate',
            label: `Reducir estimación a ${formatMinutes(reducedTime)} (versión mínima viable)`,
            payload: { timeEstimate: reducedTime },
        });
    }

    // 4. Lower priority (if high/normal)
    if (taskData.priority === 'high' || taskData.priority === 'normal') {
        alternatives.push({
            action: 'lower_priority',
            label: 'Bajar prioridad y revisar al final de la semana',
            payload: { priority: 'low', thisWeek: true },
        });
    }

    // 5. Force add (last resort)
    alternatives.push({
        action: 'force_add',
        label: 'Agregar de todas formas (no recomendado)',
        payload: { thisWeek: true, force: true },
    });

    return alternatives;
}

/**
 * Check if task is low-value during high-energy time
 * Used by Deep Work protection
 */
export function isLowValueTask(task, profile = {}) {
    // Heuristic: low priority tasks are considered low-value
    if (task.priority === 'low') return true;

    // Tasks without strategic link
    if (!task.objectiveId && !task.keyResultId) return true;

    // Tasks with "admin", "email", "meeting" in title (configurable)
    const lowValueKeywords = profile.lowValueKeywords || ['admin', 'email', 'reunion', 'meeting', 'llamada'];
    const titleLower = (task.title || '').toLowerCase();
    if (lowValueKeywords.some(kw => titleLower.includes(kw))) return true;

    return false;
}
