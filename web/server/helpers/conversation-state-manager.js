/**
 * Conversation State Manager (Fase 10.3A - AR-001)
 *
 * Manages conversation continuity across turns by persisting:
 * - intent: what the user is trying to do
 * - pendingActionId: incomplete action awaiting slots
 * - requiredSlots: which fields are needed
 * - collectedSlots: values collected so far
 * - lastUserGoal: original request for context
 */

import logger from './logger.js';

/**
 * Load conversation state for a session.
 * Returns null if no state exists.
 */
export function loadConversationState(db, sessionId) {
    try {
        const row = db.queryOne(
            'SELECT * FROM conversation_state WHERE session_id = ?',
            [sessionId]
        );

        if (!row) return null;

        return {
            sessionId: row.session_id,
            intent: row.intent,
            pendingActionId: row.pending_action_id,
            requiredSlots: row.required_slots ? JSON.parse(row.required_slots) : [],
            collectedSlots: row.collected_slots ? JSON.parse(row.collected_slots) : {},
            lastUserGoal: row.last_user_goal,
            updatedAt: row.updated_at,
        };
    } catch (error) {
        logger.error('Failed to load conversation state', { sessionId, error: error.message });
        return null;
    }
}

/**
 * Save or update conversation state for a session.
 * Uses patch-style merge — only provided fields are updated.
 */
export function saveConversationState(db, sessionId, patch) {
    try {
        const existing = loadConversationState(db, sessionId);

        const merged = {
            intent: patch.intent ?? existing?.intent ?? null,
            pendingActionId: patch.pendingActionId ?? existing?.pendingActionId ?? null,
            requiredSlots: patch.requiredSlots ?? existing?.requiredSlots ?? [],
            collectedSlots: { ...(existing?.collectedSlots || {}), ...(patch.collectedSlots || {}) },
            lastUserGoal: patch.lastUserGoal ?? existing?.lastUserGoal ?? null,
        };

        const now = new Date().toISOString();

        if (existing) {
            db.exec(`
                UPDATE conversation_state
                SET intent = ?,
                    pending_action_id = ?,
                    required_slots = ?,
                    collected_slots = ?,
                    last_user_goal = ?,
                    updated_at = ?
                WHERE session_id = ?
            `, [
                merged.intent,
                merged.pendingActionId,
                JSON.stringify(merged.requiredSlots),
                JSON.stringify(merged.collectedSlots),
                merged.lastUserGoal,
                now,
                sessionId,
            ]);
        } else {
            db.exec(`
                INSERT INTO conversation_state (session_id, intent, pending_action_id, required_slots, collected_slots, last_user_goal, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                sessionId,
                merged.intent,
                merged.pendingActionId,
                JSON.stringify(merged.requiredSlots),
                JSON.stringify(merged.collectedSlots),
                merged.lastUserGoal,
                now,
            ]);
        }

        logger.debug('Conversation state saved', { sessionId, intent: merged.intent, pendingAction: merged.pendingActionId });
        return merged;
    } catch (error) {
        logger.error('Failed to save conversation state', { sessionId, error: error.message });
        throw error;
    }
}

/**
 * Clear conversation state for a session.
 * Called when action is executed, cancelled, or expired.
 */
export function clearConversationState(db, sessionId) {
    try {
        db.exec('DELETE FROM conversation_state WHERE session_id = ?', [sessionId]);
        logger.debug('Conversation state cleared', { sessionId });
    } catch (error) {
        logger.error('Failed to clear conversation state', { sessionId, error: error.message });
        throw error;
    }
}

/**
 * Merge new slots into existing collected slots.
 * Returns updated collected slots object.
 */
export function mergeSlots(existing, newSlots) {
    return { ...existing, ...newSlots };
}

/**
 * Check which required slots are still missing.
 * Returns array of missing slot names.
 */
export function getMissingSlots(requiredSlots, collectedSlots) {
    return requiredSlots.filter(slot => {
        const value = collectedSlots[slot];
        return value === null || value === undefined || value === '';
    });
}

/**
 * Check if all required slots are collected.
 */
export function allSlotsCollected(requiredSlots, collectedSlots) {
    return getMissingSlots(requiredSlots, collectedSlots).length === 0;
}
