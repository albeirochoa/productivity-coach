/**
 * Coach Chat Tools (Fase 9)
 *
 * Intent matching and tool definitions for the conversational assistant.
 * All business logic delegates to the Phase 8 engine — no duplication.
 *
 * Tools: plan_week, schedule_block, reprioritize, goal_review
 */

import {
    generateRecommendations,
    executeRecommendation,
    fetchRiskSignals,
    buildCapacityConfig,
} from './coach-rules-engine.js';

import {
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
    formatMinutes,
    suggestRedistribution,
} from './capacity-calculator.js';

// ─── Tool Definitions ───────────────────────────────────────

export const TOOL_DEFINITIONS = {
    plan_week: {
        name: 'plan_week',
        keywords: ['planifica', 'plan', 'organiza mi semana', 'que hago esta semana', 'planear mi semana', 'planear semana'],
        // Single-word fallbacks scored lower via length
        fallbackKeywords: ['semana'],
        description: 'Planifica las tareas de la semana segun capacidad y prioridades',
        mutating: true,
    },
    schedule_block: {
        name: 'schedule_block',
        keywords: ['agenda', 'bloque horario', 'programa', 'schedule', 'agendar', 'bloque de tiempo'],
        fallbackKeywords: ['bloque', 'horario'],
        description: 'Agenda un bloque horario para una tarea en el calendario',
        mutating: true,
    },
    reprioritize: {
        name: 'reprioritize',
        keywords: ['prioriza', 'reprioriza', 'reordena', 'que es mas importante', 'sobrecarga', 'redistribuir', 'repriorizar'],
        fallbackKeywords: ['demasiado', 'mucho'],
        description: 'Reprioriza tareas por impacto, urgencia y alineacion con objetivos',
        mutating: true,
    },
    goal_review: {
        name: 'goal_review',
        keywords: ['objetivo', 'okr', 'progreso estrategico', 'key result', 'mis metas', 'avance de objetivos', 'como van mis objetivos'],
        fallbackKeywords: ['meta', 'avance', 'progreso'],
        description: 'Revisa el progreso de objetivos y key results',
        mutating: false,
    },
};

// ─── Intent Matcher ─────────────────────────────────────────

/**
 * Match user message to a tool using keyword scoring.
 * Multi-word matches score higher than single-word.
 *
 * @param {string} message - User message
 * @returns {string|null} Tool name or null
 */
export function matchIntent(message) {
    const lower = message.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[?!.,;:]/g, '');       // strip punctuation

    let bestTool = null;
    let bestScore = 0;

    for (const [name, def] of Object.entries(TOOL_DEFINITIONS)) {
        let score = 0;

        for (const kw of def.keywords) {
            if (lower.includes(kw)) {
                score += kw.split(' ').length * 2; // multi-word = higher
            }
        }

        for (const kw of (def.fallbackKeywords || [])) {
            if (lower.includes(kw)) {
                score += 1;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestTool = name;
        }
    }

    return bestScore > 0 ? bestTool : null;
}

// ─── Tool Preview Functions ─────────────────────────────────
// All are read-only: compute proposed changes without writing.

/**
 * Preview a weekly plan: sort available tasks by priority/deadline, propose commits up to capacity.
 */
export async function planWeekPreview(deps) {
    const { readJson } = deps;
    const data = await readJson('tasks-data.json');
    const capacityConfig = buildCapacityConfig(data.config || {});
    const capacity = calculateWeeklyCapacity(capacityConfig);

    const currentLoad = calculateWeeklyLoad(data.tasks || []);

    const available = (data.tasks || [])
        .filter(t => t.status === 'active' && !t.thisWeek)
        .sort((a, b) => {
            const pOrder = { high: 0, normal: 1, low: 2 };
            const pDiff = (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
            if (pDiff !== 0) return pDiff;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
        });

    let usedMinutes = currentLoad;
    const proposed = [];

    for (const task of available) {
        const taskTime = task.type === 'project'
            ? Math.max(60, (task.milestones || []).filter(m => !m.completed).slice(0, 1).reduce((s, m) => s + (m.timeEstimate || 45), 0))
            : 60;

        if (usedMinutes + taskTime > capacity.usable) break;

        proposed.push({
            taskId: task.id,
            title: task.title,
            type: task.type,
            minutes: taskTime,
            priority: task.priority || 'normal',
            action: 'commit_to_week',
        });
        usedMinutes += taskTime;
    }

    return {
        changes: proposed,
        summary: `${proposed.length} tarea(s) a comprometer. Carga total: ${formatMinutes(usedMinutes)} de ${formatMinutes(capacity.usable)} disponibles`,
        warnings: usedMinutes > capacity.usable * 0.9 ? ['Capacidad casi al limite'] : [],
        impact: {
            tasksCommitted: proposed.length,
            minutesUsed: usedMinutes,
            capacityTotal: capacity.usable,
            capacityUsedPct: capacity.usable > 0 ? Math.round((usedMinutes / capacity.usable) * 100) : 0,
        },
        reason: 'Tareas ordenadas por prioridad y fecha limite, limitadas por tu capacidad semanal.',
    };
}

/**
 * Execute the weekly plan via Phase 8 engine.
 */
export async function planWeekExecute(deps) {
    const { readJson, writeJson, getCurrentWeek } = deps;
    return executeRecommendation('plan_week', {}, { readJson, writeJson, getCurrentWeek });
}

/**
 * Preview scheduling a time block for a task.
 * Finds the best matching task and next free slot.
 */
export async function scheduleBlockPreview(message, deps) {
    const { readJson, readCalendarBlocks } = deps;
    const data = await readJson('tasks-data.json');

    // Find best matching task from message
    const activeTasks = (data.tasks || []).filter(t => t.status === 'active' && t.thisWeek);
    const task = findBestTaskMatch(message, activeTasks);

    if (!task) {
        return {
            changes: [],
            summary: 'No encontre una tarea que coincida. Intenta mencionando el nombre exacto de la tarea.',
            warnings: ['No se encontro tarea coincidente'],
            impact: {},
            reason: 'No se pudo identificar la tarea a agendar.',
            noAction: true,
        };
    }

    // Determine target date (today or tomorrow)
    const lower = message.toLowerCase();
    const today = new Date();
    let targetDate;
    if (lower.includes('manana') || lower.includes('mañana')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        targetDate = tomorrow.toISOString().split('T')[0];
    } else {
        targetDate = today.toISOString().split('T')[0];
    }

    // Find free slot
    const existingBlocks = await readCalendarBlocks({ date: targetDate });
    const durationMinutes = task.type === 'project' ? 90 : 60;
    const slot = findFreeSlot(existingBlocks, durationMinutes);

    return {
        changes: [{
            taskId: task.id,
            title: task.title,
            date: targetDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            durationMinutes,
            action: 'schedule_block',
        }],
        summary: `Agendar "${task.title}" el ${targetDate} de ${slot.startTime} a ${slot.endTime} (${durationMinutes} min)`,
        warnings: slot.warning ? [slot.warning] : [],
        impact: { taskId: task.id, date: targetDate, durationMinutes },
        reason: `Bloque horario encontrado para "${task.title}" evitando conflictos existentes.`,
    };
}

/**
 * Execute scheduling a block via createCalendarBlock.
 */
export async function scheduleBlockExecute(preview, deps) {
    const { createCalendarBlock } = deps;
    const change = preview.changes[0];
    if (!change) return { success: false, message: 'No hay bloque para agendar' };

    const block = createCalendarBlock({
        taskId: change.taskId,
        date: change.date,
        startTime: change.startTime,
        endTime: change.endTime,
        durationMinutes: change.durationMinutes,
    });

    return {
        success: true,
        action: 'schedule_block',
        block,
        message: `Bloque agendado: "${change.title}" el ${change.date} de ${change.startTime} a ${change.endTime}`,
    };
}

/**
 * Preview reprioritization: detect overload and suggest redistribution.
 */
export async function reprioritizePreview(deps) {
    const { readJson, getDbManager } = deps;
    const data = await readJson('tasks-data.json');
    const capacityConfig = buildCapacityConfig(data.config || {});
    const capacity = calculateWeeklyCapacity(capacityConfig);
    const load = calculateWeeklyLoad(data.tasks || []);
    const excess = load - capacity.usable;

    if (excess <= 0) {
        // No overload — generate recommendations instead
        const db = getDbManager();
        const riskSignals = fetchRiskSignals(db);
        const recommendations = generateRecommendations({
            tasks: data.tasks || [],
            inbox: data.inbox || { work: [], personal: [] },
            config: capacityConfig,
            riskSignals,
        });

        return {
            changes: [],
            summary: `No estas sobrecargado (${formatMinutes(load)} de ${formatMinutes(capacity.usable)}). ${recommendations.length} recomendacion(es) disponible(s).`,
            warnings: [],
            impact: { load, capacity: capacity.usable, recommendations: recommendations.length },
            reason: 'Tu carga semanal esta dentro de la capacidad. Revisa las recomendaciones del Coach para optimizar.',
            noAction: true,
        };
    }

    // Overloaded — suggest redistribution
    const committedTasks = (data.tasks || []).filter(t => t.thisWeek && t.status === 'active');
    const suggestions = suggestRedistribution(committedTasks, excess);

    const changes = suggestions.map(s => ({
        taskId: s.taskId,
        title: s.taskTitle,
        minutes: s.minutes,
        action: s.action,
        reason: s.reason,
    }));

    return {
        changes,
        summary: `Sobrecarga de ${formatMinutes(excess)}. Propongo diferir ${changes.length} tarea(s) para liberar capacidad.`,
        warnings: excess > 120 ? ['Sobrecarga significativa — considera reducir compromisos'] : [],
        impact: {
            currentLoad: load,
            capacity: capacity.usable,
            excess,
            tasksToDefer: changes.length,
            minutesFreed: changes.reduce((s, c) => s + c.minutes, 0),
        },
        reason: 'Redistribucion basada en prioridad: se difieren tareas de baja prioridad primero.',
    };
}

/**
 * Execute reprioritization via Phase 8 engine.
 */
export async function reprioritizeExecute(preview, deps) {
    const { readJson, writeJson, getCurrentWeek } = deps;
    const excess = preview.impact?.excess || 60;
    return executeRecommendation('auto_redistribute', { excessMinutes: excess }, { readJson, writeJson, getCurrentWeek });
}

/**
 * Review goals and KR progress. Read-only — no confirmation needed.
 */
export async function goalReviewPreview(deps) {
    const { getDbManager } = deps;
    const db = getDbManager();
    const riskSignals = fetchRiskSignals(db);

    const { risks, focusWeek, summary } = riskSignals;

    if (risks.length === 0 && (!summary.totalKrs || summary.totalKrs === 0)) {
        return {
            changes: [],
            summary: 'No tienes objetivos o key results definidos aun. Crea tus primeros objetivos en la vista de Objetivos.',
            warnings: [],
            impact: {},
            reason: 'Sin datos de objetivos para revisar.',
            noAction: true,
        };
    }

    const lines = [];
    if (summary.totalKrs > 0) {
        lines.push(`**${summary.totalKrs} Key Results** en seguimiento, **${summary.riskCount}** en riesgo.`);
    }
    if (focusWeek.length > 0) {
        lines.push('\nFoco de esta semana:');
        for (const kr of focusWeek) {
            const riskLabel = kr.risk.level === 'high' ? '🔴' : '🟡';
            lines.push(`${riskLabel} **${kr.title}** (${Math.round(kr.progress)}%) — ${kr.objectiveTitle}`);
            if (kr.risk.reasons.length > 0) {
                lines.push(`   Riesgo: ${kr.risk.reasons.map(r => r.label).join(', ')}`);
            }
        }
    }
    if (risks.length > focusWeek.length) {
        lines.push(`\n+${risks.length - focusWeek.length} KR(s) adicional(es) en riesgo.`);
    }

    return {
        changes: [],
        summary: lines.join('\n'),
        warnings: risks.filter(r => r.risk.level === 'high').length > 0
            ? [`${risks.filter(r => r.risk.level === 'high').length} KR(s) en riesgo alto`]
            : [],
        impact: {
            totalKrs: summary.totalKrs || 0,
            riskCount: summary.riskCount || 0,
            highRisk: risks.filter(r => r.risk.level === 'high').length,
        },
        reason: 'Resumen de progreso estrategico basado en tus objetivos y key results.',
        noAction: true,
    };
}

// ─── Contextual Response (no tool matched) ──────────────────

/**
 * Generate a contextual text response when no tool is matched.
 */
export async function generateContextualResponse(message, deps) {
    const { readJson } = deps;
    const data = await readJson('tasks-data.json');
    const tasks = data.tasks || [];
    const inbox = data.inbox || { work: [], personal: [] };

    const lower = message.toLowerCase();
    const weekTasks = tasks.filter(t => t.thisWeek && t.status === 'active');
    const doneTasks = tasks.filter(t => t.thisWeek && t.status === 'done');
    const inboxCount = (inbox.work?.length || 0) + (inbox.personal?.length || 0);

    // Stats-related
    if (lower.includes('racha') || lower.includes('stats') || lower.includes('estadistica')) {
        const completed = data.stats?.tasks_completed || 0;
        return `Has completado **${completed} tareas** en total. ${doneTasks.length} esta semana. Sigue asi!`;
    }

    // Inbox-related
    if (lower.includes('inbox') || lower.includes('bandeja')) {
        if (inboxCount === 0) {
            return 'Tu bandeja de entrada esta vacia. Buen trabajo!';
        }
        return `Tienes **${inboxCount} item(s)** en tu bandeja de entrada (${inbox.work?.length || 0} trabajo, ${inbox.personal?.length || 0} personal). Quieres que te ayude a procesarlos?`;
    }

    // Default contextual
    const parts = [];
    if (weekTasks.length > 0) {
        parts.push(`Tienes **${weekTasks.length} tarea(s)** activa(s) esta semana`);
    }
    if (doneTasks.length > 0) {
        parts.push(`**${doneTasks.length}** completada(s)`);
    }
    if (inboxCount > 0) {
        parts.push(`**${inboxCount}** item(s) en inbox`);
    }

    const status = parts.length > 0 ? parts.join(', ') + '.' : 'Todo en orden.';
    return `${status}\n\nPuedo ayudarte a:\n• **Planificar tu semana** — "planifica mi semana"\n• **Repriorizar tareas** — "reprioriza mis tareas"\n• **Agendar un bloque** — "agenda [tarea] para manana"\n• **Revisar objetivos** — "como van mis objetivos"`;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Find the best matching task by title from a user message.
 */
function findBestTaskMatch(message, tasks) {
    const lower = message.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    let best = null;
    let bestScore = 0;

    for (const task of tasks) {
        const titleLower = task.title.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        // Exact title inclusion
        if (lower.includes(titleLower)) {
            const score = titleLower.length;
            if (score > bestScore) {
                bestScore = score;
                best = task;
            }
        } else {
            // Word overlap
            const titleWords = titleLower.split(/\s+/);
            const msgWords = lower.split(/\s+/);
            const overlap = titleWords.filter(w => w.length > 2 && msgWords.includes(w)).length;
            if (overlap > 0 && overlap > bestScore) {
                bestScore = overlap;
                best = task;
            }
        }
    }

    // If no match, return the first committed task as fallback
    if (!best && tasks.length > 0) {
        return null; // Explicit no-match
    }

    return best;
}

/**
 * Find a free time slot on a given day, avoiding existing blocks.
 */
function findFreeSlot(existingBlocks, durationMinutes) {
    const startHour = 9; // 9 AM
    const endHour = 18;  // 6 PM

    // Convert existing blocks to occupied ranges (in minutes from midnight)
    const occupied = existingBlocks.map(b => ({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
    })).sort((a, b) => a.start - b.start);

    let candidateStart = startHour * 60;
    const dayEnd = endHour * 60;

    for (const block of occupied) {
        if (candidateStart + durationMinutes <= block.start) {
            // Found a gap before this block
            return {
                startTime: minutesToTime(candidateStart),
                endTime: minutesToTime(candidateStart + durationMinutes),
            };
        }
        // Move candidate past this block
        if (block.end > candidateStart) {
            candidateStart = block.end;
        }
    }

    // Check if there's room after the last block
    if (candidateStart + durationMinutes <= dayEnd) {
        return {
            startTime: minutesToTime(candidateStart),
            endTime: minutesToTime(candidateStart + durationMinutes),
        };
    }

    // No ideal slot — suggest start of day with warning
    return {
        startTime: minutesToTime(startHour * 60),
        endTime: minutesToTime(startHour * 60 + durationMinutes),
        warning: 'No se encontro hueco libre — este horario podria tener conflictos',
    };
}

function timeToMinutes(timeStr) {
    const [h, m] = (timeStr || '09:00').split(':').map(Number);
    return h * 60 + (m || 0);
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Execute content project creation via content-templates helper.
 * This is called AFTER user confirmation (unlike the original buggy version).
 */
export async function createContentProjectExecute(preview, deps) {
    const { createFromContentTemplate } = await import('./content-templates.js');
    const change = preview.changes[0];

    const project = await createFromContentTemplate(
        change.templateId,
        change.title,
        deps
    );

    return {
        success: true,
        action: 'create_content_project',
        project: {
            id: project.id,
            title: project.title,
            milestones: project.milestones.length,
        },
        message: `Proyecto "${project.title}" creado con ${project.milestones.length} milestones.`,
    };
}
