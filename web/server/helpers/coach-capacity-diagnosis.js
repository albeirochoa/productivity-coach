/**
 * Coach Capacity Diagnosis Service (Fase 10.2)
 *
 * Diagnóstico automático de carga del usuario.
 * Clasifica estado: saturado | equilibrado | infrautilizado.
 * Basado en capacidad real, compromisos, vencimientos, reprogramaciones y completitud.
 */

import {
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
    formatMinutes,
} from './capacity-calculator.js';

// ─── Constants ───────────────────────────────────────────────

const DIAGNOSIS_STATES = {
    OVERLOADED: 'saturado',
    BALANCED: 'equilibrado',
    UNDERUTILIZED: 'infrautilizado',
};

const ENERGY_WINDOWS = {
    HIGH: { start: 9, end: 12, label: 'Alta energía matutina' },
    MEDIUM_HIGH: { start: 14, end: 17, label: 'Energía media-alta tarde' },
    LOW: { start: 20, end: 22, label: 'Energía baja nocturna' },
};

// ─── Diagnosis Engine ────────────────────────────────────────

/**
 * Diagnose current load state
 * @param {Object} deps - { readJson, getDbManager }
 * @returns {Object} Diagnosis with state, risk, recommendation
 */
export async function diagnoseLoadState(deps) {
    const { readJson, getDbManager } = deps;

    try {
        const data = await readJson('tasks-data.json');
        const db = getDbManager();
        const tasks = data.tasks || [];
        const inbox = data.inbox || { work: [], personal: [] };
        const config = data.config || {};

        // Calculate capacity
        const capacityConfig = {
            work_hours_per_day: config.work_hours_per_day || 8,
            buffer_percentage: config.buffer_percentage || 20,
            break_minutes_per_day: config.break_minutes_per_day || 60,
            work_days_per_week: config.work_days_per_week || 5,
        };
        const capacity = calculateWeeklyCapacity(capacityConfig);
        const load = calculateWeeklyLoad(tasks);
        const utilization = capacity.usable > 0 ? (load / capacity.usable) * 100 : 0;

        // Count committed tasks and done tasks
        const committedTasks = tasks.filter(t => t.thisWeek && t.status === 'active');
        const doneTasks = tasks.filter(t => t.thisWeek && t.status === 'done');
        const completionRate = committedTasks.length > 0
            ? (doneTasks.length / (committedTasks.length + doneTasks.length)) * 100
            : 0;

        // Count overdue tasks
        const today = new Date().toISOString().split('T')[0];
        const overdueTasks = tasks.filter(t => {
            if (t.status !== 'active' || !t.dueDate) return false;
            return t.dueDate < today;
        });

        // Count inbox staleness
        const staleInboxCount = [...(inbox.work || []), ...(inbox.personal || [])].filter(item => {
            const age = daysSince(item.date);
            return age !== null && age >= 3;
        }).length;

        // Count reschedules (approximation: tasks with thisWeek=true but no completedAt and weekCommitted != current week)
        const currentWeek = getCurrentWeekIdentifier();
        const rescheduledTasks = committedTasks.filter(t => {
            return t.weekCommitted && t.weekCommitted !== currentWeek;
        });

        // Determine state
        let state = DIAGNOSIS_STATES.BALANCED;
        let primaryRisk = null;
        let recommendation = null;
        let nextAction = null;
        let impactExpected = null;
        let tipDeOro = null;

        if (utilization > 100) {
            state = DIAGNOSIS_STATES.OVERLOADED;
            primaryRisk = `Sobrecarga: ${Math.round(utilization)}% de capacidad usada (${formatMinutes(load - capacity.usable)} sobre el límite)`;
            recommendation = 'Redistribuir o posponer tareas de baja prioridad';
            nextAction = 'Ejecuta "reprioriza" para liberar capacidad';
            impactExpected = `Reducir carga a ~${Math.round((capacity.usable / load) * 100)}% de capacidad`;
            tipDeOro = 'Protege tu tiempo: menos compromisos = más foco.';
        } else if (utilization > 85) {
            state = DIAGNOSIS_STATES.BALANCED;
            primaryRisk = `Cerca del límite: ${Math.round(utilization)}% de capacidad`;
            recommendation = 'No agregar más compromisos esta semana';
            nextAction = 'Bloquea tiempo para Deep Work hoy';
            impactExpected = 'Mantener ritmo sostenible';
            tipDeOro = 'Buffer = margen de error. Protégelo.';
        } else if (utilization < 50) {
            state = DIAGNOSIS_STATES.UNDERUTILIZED;
            primaryRisk = `Capacidad infrautilizada: solo ${Math.round(utilization)}%`;
            recommendation = 'Comprometer tareas de alto impacto para la semana';
            nextAction = 'Ejecuta "planifica mi semana"';
            impactExpected = `Aumentar carga a ~75-85% de capacidad (${formatMinutes(capacity.usable * 0.75)})`;
            tipDeOro = 'Momentum se construye con consistencia, no con perfección.';
        } else {
            state = DIAGNOSIS_STATES.BALANCED;
            primaryRisk = null;
            recommendation = 'Mantén el ritmo actual';
            nextAction = 'Revisa objetivos y prioriza por impacto';
            impactExpected = 'Progreso constante hacia metas';
            tipDeOro = 'El equilibrio no es estático, ajusta cada semana.';
        }

        // Adjust for overdue tasks
        if (overdueTasks.length > 0) {
            primaryRisk = `${overdueTasks.length} tarea(s) vencida(s). ${primaryRisk || ''}`;
            recommendation = 'Reprogramar o completar tareas vencidas primero';
        }

        // Adjust for stale inbox
        if (staleInboxCount >= 5) {
            primaryRisk = `Inbox con ${staleInboxCount} items antiguos. ${primaryRisk || ''}`;
        }

        // Adjust for low completion rate (if we have historical data)
        if (doneTasks.length + committedTasks.length > 3 && completionRate < 40) {
            primaryRisk = `Tasa de completitud baja (${Math.round(completionRate)}%). ${primaryRisk || ''}`;
            recommendation = 'Reducir compromisos o eliminar bloqueadores';
        }

        return {
            generatedAt: new Date().toISOString(),
            state,
            capacity: {
                total: capacity.total,
                usable: capacity.usable,
                used: load,
                remaining: capacity.usable - load,
                utilizationPct: Math.round(utilization),
                formatted: {
                    total: formatMinutes(capacity.total),
                    usable: formatMinutes(capacity.usable),
                    used: formatMinutes(load),
                    remaining: formatMinutes(capacity.usable - load),
                },
            },
            metrics: {
                committedTasks: committedTasks.length,
                doneTasks: doneTasks.length,
                overdueTasks: overdueTasks.length,
                staleInboxItems: staleInboxCount,
                rescheduledTasks: rescheduledTasks.length,
                completionRate: Math.round(completionRate),
            },
            diagnosis: {
                primaryRisk,
                recommendation,
                nextAction,
                impactExpected,
                tipDeOro,
            },
        };
    } catch (error) {
        return {
            generatedAt: new Date().toISOString(),
            state: 'unknown',
            error: error.message,
            diagnosis: {
                primaryRisk: 'No se pudo calcular diagnóstico',
                recommendation: 'Revisar estado del sistema',
                nextAction: null,
                impactExpected: null,
                tipDeOro: 'Cuando hay dudas, simplifica.',
            },
        };
    }
}

// ─── Helpers ─────────────────────────────────────────────────

function daysSince(dateStr) {
    if (!dateStr) return null;
    const past = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - past) / (1000 * 60 * 60 * 24));
}

function getCurrentWeekIdentifier() {
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Detect high-energy windows for the user.
 * Uses heuristic: morning (9-12) and mid-afternoon (14-17) by default.
 * Can be overridden with user profile data.
 */
export function detectEnergyWindows(profile = {}) {
    const userWindows = profile.energyWindows;
    if (userWindows && Array.isArray(userWindows)) {
        return userWindows;
    }

    // Default heuristic
    return [
        { start: 9, end: 12, label: 'Alta energía matutina', type: 'high' },
        { start: 14, end: 17, label: 'Energía media-alta tarde', type: 'medium_high' },
    ];
}

/**
 * Check if a given hour falls in a high-energy window
 */
export function isHighEnergyTime(hour, profile = {}) {
    const windows = detectEnergyWindows(profile);
    return windows.some(w => w.type === 'high' && hour >= w.start && hour < w.end);
}

/**
 * Get current diagnosis snapshot (for quick access)
 */
export async function getCurrentDiagnosis(deps) {
    return diagnoseLoadState(deps);
}
