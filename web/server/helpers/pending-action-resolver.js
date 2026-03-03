/**
 * Pending Action Resolver (Fase 10.3A - AR-002)
 *
 * Priority routing logic:
 * 1. If pending action exists → resolve slots first
 * 2. Only if no pending action → proceed to normal intent flow
 *
 * Branches:
 * - missing_slot: ask only next missing field
 * - all_slots_ready: build preview
 * - confirmed: execute
 */

import logger from './logger.js';
import {
    loadConversationState,
    saveConversationState,
    clearConversationState,
    getMissingSlots,
    allSlotsCollected,
} from './conversation-state-manager.js';
import { normalizeSlot } from './slot-normalizer.js';

/**
 * Check if there's a pending action for this session.
 * Returns conversation state if pending action exists, null otherwise.
 */
export function checkPendingAction(db, sessionId) {
    const state = loadConversationState(db, sessionId);
    if (!state || !state.pendingActionId) return null;
    return state;
}

/**
 * Extract slot values from user message based on intent.
 * Returns object of slot name -> value extracted from message.
 */
export function extractSlotsFromMessage(message, intent) {
    const extracted = {};
    const lower = String(message || '').toLowerCase().trim();

    // Simple extraction logic — can be enhanced with NLP
    switch (intent) {
        case 'create_objective':
            // Look for period mentions
            if (lower.includes('semestre') || lower.includes('trimestre') || lower.match(/\d{4}[-]?[QH]/i) || (lower.match(/\d{4}/) && !lower.includes('/'))) {
                extracted.period = message; // Will be normalized later
            }
            if (lower.includes('salud') || lower.includes('trabajo') || lower.includes('familia')) {
                extracted.area = lower;
            }
            // Fallback to direct answer if no specific extraction
            if (Object.keys(extracted).length === 0 && lower.length < 100) {
                extracted.__directAnswer = message;
            }
            break;

        case 'schedule_task':
            // Look for date mentions
            if (lower.includes('hoy') || lower.includes('mañana') || lower.includes('lunes') || lower.match(/\d{4}-\d{2}-\d{2}/)) {
                extracted.date = message;
            }
            // Fallback to direct answer
            if (Object.keys(extracted).length === 0 && lower.length < 100) {
                extracted.__directAnswer = message;
            }
            break;

        default:
            // Generic: if message is short and likely a direct answer, treat as value for first missing slot
            if (lower.length < 50 && !lower.includes('?') && !lower.includes('crear') && !lower.includes('hacer')) {
                extracted.__directAnswer = message;
            }
            break;
    }

    return extracted;
}

/**
 * Resolve pending action by collecting slots from user message.
 * Returns:
 * - { type: 'missing_slot', slot, question } — still need more slots
 * - { type: 'all_slots_ready', collectedSlots } — ready to build preview
 * - { type: 'no_pending' } — no pending action found
 */
export async function resolvePendingAction(db, sessionId, userMessage, deps) {
    const state = checkPendingAction(db, sessionId);

    if (!state) {
        return { type: 'no_pending' };
    }

    const { intent, requiredSlots, collectedSlots } = state;

    logger.debug('Resolving pending action', {
        sessionId,
        intent,
        requiredSlots,
        collectedSlotsCount: Object.keys(collectedSlots).length,
    });

    // Extract potential slot values from user message
    const extracted = extractSlotsFromMessage(userMessage, intent);
    logger.debug('Extracted slots from message', { extracted, userMessage });

    // Normalize and collect new slots
    const newSlots = {};
    const missingBefore = getMissingSlots(requiredSlots, collectedSlots);

    // If direct answer, map to first missing slot
    if (extracted.__directAnswer && missingBefore.length > 0) {
        const targetSlot = missingBefore[0];
        const normalized = await normalizeSlot(targetSlot, extracted.__directAnswer, deps);
        logger.debug('Normalized direct answer', { targetSlot, rawValue: extracted.__directAnswer, normalized });
        if (normalized.error) {
            return {
                type: 'missing_slot',
                slot: targetSlot,
                question: normalized.error, // Error is the correction message
                error: true,
            };
        }
        newSlots[targetSlot] = normalized.value;
    } else {
        // Try to normalize extracted values
        for (const [slotName, rawValue] of Object.entries(extracted)) {
            if (slotName === '__directAnswer') continue;
            const normalized = await normalizeSlot(slotName, rawValue, deps);
            logger.debug('Normalized extracted slot', { slotName, rawValue, normalized });
            if (!normalized.error && normalized.value) {
                newSlots[slotName] = normalized.value;
            }
        }
    }

    logger.debug('New slots collected', { newSlots, collectedBefore: collectedSlots });

    // Merge new slots into collected
    const updated = { ...collectedSlots, ...newSlots };
    saveConversationState(db, sessionId, { collectedSlots: updated });

    // Check if all slots are now collected
    const missingAfter = getMissingSlots(requiredSlots, updated);

    if (missingAfter.length === 0) {
        return {
            type: 'all_slots_ready',
            collectedSlots: updated,
        };
    }

    // Ask for next missing slot
    const nextSlot = missingAfter[0];
    const question = buildSlotQuestion(intent, nextSlot);

    return {
        type: 'missing_slot',
        slot: nextSlot,
        question,
        error: false,
    };
}

/**
 * Build a natural question for missing slot.
 */
function buildSlotQuestion(intent, slotName) {
    const questions = {
        create_objective: {
            period: '¿Para qué periodo es este objetivo? (Ejemplo: "primer semestre 2026", "2026-Q2")',
            area: '¿A qué área pertenece? (Ejemplo: "salud", "trabajo", "familia")',
            description: '¿Puedes darme más detalles sobre este objetivo?',
        },
        schedule_task: {
            date: '¿Para qué fecha? (Ejemplo: "hoy", "mañana", "lunes", "2026-02-20")',
            time: '¿A qué hora? (Ejemplo: "9:00", "14:30")',
        },
    };

    return questions[intent]?.[slotName] || `¿Cuál es el valor para "${slotName}"?`;
}

/**
 * Define required slots for each intent.
 */
export function getRequiredSlots(intent) {
    const slotDefinitions = {
        create_objective: ['period'], // title is already in lastUserGoal
        schedule_task: ['date'], // taskId in lastUserGoal
        // Add more intents as needed
    };

    return slotDefinitions[intent] || [];
}

/**
 * Initialize pending action state.
 * Called when a new multi-turn intent is detected.
 */
export function initializePendingAction(db, sessionId, intent, lastUserGoal, actionId) {
    const requiredSlots = getRequiredSlots(intent);

    saveConversationState(db, sessionId, {
        intent,
        pendingActionId: actionId,
        requiredSlots,
        collectedSlots: {},
        lastUserGoal,
    });

    logger.info('Pending action initialized', { sessionId, intent, actionId, requiredSlots });
}

/**
 * Complete and clear pending action state.
 * Called when action is executed or cancelled.
 */
export function completePendingAction(db, sessionId) {
    clearConversationState(db, sessionId);
    logger.info('Pending action completed', { sessionId });
}
