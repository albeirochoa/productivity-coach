/**
 * Decision Engine v2 (Fase 10.4 - AR-008, AR-009, AR-010)
 *
 * Next-best-actions ranking engine with explainability payloads.
 *
 * Ranking factors:
 * 1. Capacity remaining (hard constraint)
 * 2. Deadlines urgency
 * 3. Objective/KR risk
 * 4. Historical adherence (future enhancement)
 *
 * Every recommendation includes:
 * - reason: why this action matters
 * - impact: expected outcome
 * - tradeoff: what might be sacrificed
 * - confidence: score 0-100
 */

import logger from './logger.js';
import {
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
    formatMinutes,
} from './capacity-calculator.js';

// ─── Scoring weights ─────────────────────────────────────────────
const WEIGHTS = {
    DEADLINE_URGENCY: 0.35,
    KR_RISK: 0.30,
    CAPACITY_FIT: 0.20,
    STRATEGIC_LINK: 0.15,
};

// ─── Helpers ─────────────────────────────────────────────────────

function daysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function scoreDeadlineUrgency(task) {
    const days = daysUntil(task.dueDate);
    if (days === null) return 0;
    if (days < 0) return 100; // overdue
    if (days === 0) return 90; // today
    if (days === 1) return 80; // tomorrow
    if (days <= 3) return 60; // within 3 days
    if (days <= 7) return 30; // this week
    return 10; // future
}

function scoreKrRisk(task, riskSignals) {
    if (!task.keyResultId || !riskSignals?.risks) return 0;
    const krRisk = riskSignals.risks.find(r => r.id === task.keyResultId);
    if (!krRisk) return 0;

    // Risk level: high=100, medium=60, low=20
    const riskMap = { high: 100, medium: 60, low: 20 };
    return riskMap[krRisk.risk.level] || 0;
}

function scoreStrategicLink(task) {
    if (task.keyResultId && task.objectiveId) return 100;
    if (task.objectiveId) return 70;
    if (task.keyResultId) return 70;
    if (task.areaId || task.category) return 30;
    return 0;
}

function scoreCapacityFit(taskMinutes, capacityRemaining) {
    if (capacityRemaining <= 0) return 0;
    const ratio = taskMinutes / capacityRemaining;
    if (ratio > 1) return 0; // doesn't fit
    if (ratio <= 0.25) return 100; // small task
    if (ratio <= 0.5) return 80;
    if (ratio <= 0.75) return 50;
    return 20; // large task
}

function estimateTaskMinutes(task) {
    if (task.type === 'project') {
        const committed = task.committedMilestones || [];
        return committed.reduce((sum, mId) => {
            const m = task.milestones?.find(x => x.id === mId);
            return sum + (m?.timeEstimate || 60);
        }, 0) || 120; // default 2h for project
    }
    return 60; // default 1h for simple task
}

// ─── Ranking Engine ──────────────────────────────────────────────

/**
 * Rank tasks by weighted score.
 *
 * @param {Array} tasks - Candidate tasks (not yet committed to week)
 * @param {Object} context - { capacity, load, riskSignals }
 * @returns {Array} Ranked actions with score breakdown
 */
export function rankNextBestActions(tasks, context) {
    const { capacity, load, riskSignals } = context;
    const capacityRemaining = capacity.usable - load;

    const candidates = tasks
        .filter(t => t.status === 'active' && !t.thisWeek)
        .map(task => {
            const taskMinutes = estimateTaskMinutes(task);

            const deadlineScore = scoreDeadlineUrgency(task);
            const krRiskScore = scoreKrRisk(task, riskSignals);
            const strategicScore = scoreStrategicLink(task);
            const capacityScore = scoreCapacityFit(taskMinutes, capacityRemaining);

            const weightedScore =
                (deadlineScore * WEIGHTS.DEADLINE_URGENCY) +
                (krRiskScore * WEIGHTS.KR_RISK) +
                (strategicScore * WEIGHTS.STRATEGIC_LINK) +
                (capacityScore * WEIGHTS.CAPACITY_FIT);

            return {
                taskId: task.id,
                title: task.title,
                type: task.type,
                score: Math.round(weightedScore),
                scoreBreakdown: {
                    deadline: deadlineScore,
                    krRisk: krRiskScore,
                    strategic: strategicScore,
                    capacity: capacityScore,
                },
                estimatedMinutes: taskMinutes,
                fitsInCapacity: capacityScore > 0,
                task, // include full task for later use
            };
        })
        .filter(c => c.fitsInCapacity) // hard constraint: must fit
        .sort((a, b) => b.score - a.score);

    return candidates;
}

// ─── Weekly Plan Pack ────────────────────────────────────────────

/**
 * Generate a weekly plan pack with must-do / should-do / not-this-week.
 *
 * @param {Array} tasks - All tasks
 * @param {Object} config - Capacity config
 * @param {Object} riskSignals - Risk signals from objectives
 * @returns {Object} Plan pack with tiers and capacity summary
 */
export function generateWeeklyPlanPack(tasks, config, riskSignals) {
    const capacity = calculateWeeklyCapacity(config);
    const load = calculateWeeklyLoad(tasks);

    const ranked = rankNextBestActions(tasks, { capacity, load, riskSignals });

    const mustDo = [];
    const shouldDo = [];
    const notThisWeek = [];

    let usedMinutes = load;

    for (const action of ranked) {
        const wouldExceed = (usedMinutes + action.estimatedMinutes) > capacity.usable;

        // Must-do: high score (>70) and has deadline or high KR risk
        const isMustDo = action.score >= 70 && (
            action.scoreBreakdown.deadline >= 60 ||
            action.scoreBreakdown.krRisk >= 60
        );

        if (isMustDo && !wouldExceed) {
            mustDo.push(action);
            usedMinutes += action.estimatedMinutes;
        } else if (!wouldExceed && action.score >= 40) {
            shouldDo.push(action);
            usedMinutes += action.estimatedMinutes;
        } else {
            notThisWeek.push(action);
        }
    }

    return {
        mustDo,
        shouldDo,
        notThisWeek,
        capacitySummary: {
            total: capacity.usable,
            used: usedMinutes,
            remaining: capacity.usable - usedMinutes,
            utilizationPct: Math.round((usedMinutes / capacity.usable) * 100),
            formatted: {
                total: formatMinutes(capacity.usable),
                used: formatMinutes(usedMinutes),
                remaining: formatMinutes(capacity.usable - usedMinutes),
            },
        },
    };
}

// ─── Explainability Payloads ─────────────────────────────────────

/**
 * Build explainability payload for an action.
 *
 * @param {Object} action - Ranked action from rankNextBestActions
 * @param {Object} context - { capacity, riskSignals }
 * @returns {Object} { reason, impact, tradeoff, confidence }
 */
export function buildExplainabilityPayload(action, context) {
    const { score, scoreBreakdown, estimatedMinutes, task } = action;
    const { capacity, riskSignals } = context;

    // Reason: why this matters
    const reasons = [];
    if (scoreBreakdown.deadline >= 60) {
        const days = daysUntil(task.dueDate);
        if (days < 0) reasons.push('Tarea vencida');
        else if (days <= 1) reasons.push('Fecha límite inminente');
        else reasons.push('Fecha límite cercana');
    }
    if (scoreBreakdown.krRisk >= 60) {
        const kr = riskSignals?.risks?.find(r => r.id === task.keyResultId);
        reasons.push(`Key Result en riesgo: "${kr?.title || 'desconocido'}"`);
    }
    if (scoreBreakdown.strategic >= 70) {
        reasons.push('Alineado con objetivos estratégicos');
    }
    if (reasons.length === 0) {
        reasons.push('Tarea disponible con capacidad suficiente');
    }

    const reason = reasons.join('. ') + '.';

    // Impact: expected outcome
    let impact = `Completar "${task.title}" (${formatMinutes(estimatedMinutes)})`;
    if (scoreBreakdown.krRisk >= 60) {
        impact += '. Reduce riesgo en KR asociado';
    }
    if (scoreBreakdown.deadline >= 60) {
        impact += '. Evita retraso';
    }

    // Tradeoff: what might be sacrificed
    let tradeoff = null;
    const remainingAfter = capacity.usable - (context.load + estimatedMinutes);
    if (remainingAfter < 60) {
        tradeoff = 'Poca capacidad restante después de esta tarea';
    } else if (estimatedMinutes > 120) {
        tradeoff = 'Tarea grande que consume considerable tiempo';
    }

    // Confidence: 0-100
    // High confidence if: good deadline coverage + KR link + fits well in capacity
    let confidence = 50; // baseline
    if (scoreBreakdown.deadline >= 60) confidence += 20;
    if (scoreBreakdown.krRisk >= 60) confidence += 20;
    if (scoreBreakdown.capacity >= 80) confidence += 10;
    confidence = Math.min(100, confidence);

    return {
        reason,
        impact,
        tradeoff,
        confidence,
    };
}

// ─── Export Helpers ──────────────────────────────────────────────

export {
    WEIGHTS,
    scoreDeadlineUrgency,
    scoreKrRisk,
    scoreStrategicLink,
    scoreCapacityFit,
    estimateTaskMinutes,
};
