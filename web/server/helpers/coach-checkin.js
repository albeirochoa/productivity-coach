/**
 * Coach Check-in Service (Fase 10.2)
 *
 * Check-in nocturno (21:00 local):
 * - Genera check-in diario con tareas no completadas
 * - Registra respuesta del usuario y motivo de no ejecución
 * - Persiste como memoria útil para recomendaciones futuras
 */

import logger from './logger.js';

// ─── Check-in Constants ──────────────────────────────────────

const CHECKIN_HOUR = 21; // 9 PM local time
const CHECKIN_WINDOW_MINUTES = 60; // 1 hour window

// ─── Check-in Engine ─────────────────────────────────────────

/**
 * Check if check-in should trigger now
 */
export function shouldTriggerCheckin(db) {
    const now = new Date();
    const hour = now.getHours();

    // Check if within window
    if (hour !== CHECKIN_HOUR) {
        return { should: false };
    }

    // Check if already triggered today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const recent = db.queryOne(
        `SELECT * FROM coach_events WHERE rule_id = 'checkin:evening' AND created_at > ? ORDER BY created_at DESC LIMIT 1`,
        [today]
    );

    if (recent) {
        return { should: false, reason: 'Already triggered today' };
    }

    return {
        should: true,
        reason: `Evening check-in window (${CHECKIN_HOUR}:00)`,
    };
}

/**
 * Generate evening check-in message
 */
export async function generateCheckinMessage(deps) {
    const { readJson } = deps;

    try {
        const data = await readJson('tasks-data.json');
        const tasks = data.tasks || [];

        // Get today's tasks
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = tasks.filter(t =>
            t.status === 'active' && (t.dueDate === today || (!t.dueDate && !t.thisWeek))
        );

        // Get week tasks
        const weekTasks = tasks.filter(t => t.thisWeek && t.status === 'active');

        // Get done today
        const doneToday = tasks.filter(t => {
            if (t.status !== 'done' || !t.completedAt) return false;
            const completedDate = new Date(t.completedAt).toISOString().split('T')[0];
            return completedDate === today;
        });

        const message = `🌙 **Check-in nocturno**\n\n` +
            `Hoy completaste **${doneToday.length}** tarea(s).\n` +
            `Pendientes hoy: **${todayTasks.length}**\n` +
            `Pendientes esta semana: **${weekTasks.length}**\n\n` +
            `¿Qué te impidió completar las tareas de hoy? (Responde para mejorar recomendaciones)`;

        return {
            message,
            data: {
                todayTasks: todayTasks.length,
                weekTasks: weekTasks.length,
                doneToday: doneToday.length,
                incompleteTasks: todayTasks.map(t => ({ id: t.id, title: t.title })),
            },
        };
    } catch (error) {
        logger.error('Failed to generate checkin message', { error: error.message });
        return {
            message: '🌙 **Check-in nocturno**\n\n¿Cómo fue tu día?',
            data: {},
        };
    }
}

/**
 * Process check-in response from user
 */
export async function processCheckinResponse(userResponse, checkinData, deps) {
    const { getDbManager } = deps;

    try {
        const db = getDbManager();

        // Classify response into categories
        const classification = classifyCheckinResponse(userResponse);

        // Store as structured memory
        const memoryKey = `checkin_pattern_${classification.category}`;
        const memoryValue = JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            response: userResponse,
            category: classification.category,
            tasks: checkinData.incompleteTasks || [],
        });

        // Check if pattern exists
        const existing = db.queryOne('SELECT * FROM coach_memory WHERE key = ?', [memoryKey]);
        if (existing) {
            const prevValue = JSON.parse(existing.value);
            const occurrences = (prevValue.occurrences || 0) + 1;
            db.exec(
                'UPDATE coach_memory SET value = ?, confidence = ?, updated_at = ? WHERE key = ?',
                [
                    JSON.stringify({ ...prevValue, occurrences, lastSeen: new Date().toISOString() }),
                    Math.min(1.0, 0.5 + (occurrences * 0.1)),
                    new Date().toISOString(),
                    memoryKey,
                ]
            );
        } else {
            db.exec(
                'INSERT INTO coach_memory (id, key, value, confidence, updated_at) VALUES (?, ?, ?, ?, ?)',
                [
                    `mem-${Date.now()}`,
                    memoryKey,
                    JSON.stringify({ category: classification.category, occurrences: 1, lastSeen: new Date().toISOString() }),
                    0.5,
                    new Date().toISOString(),
                ]
            );
        }

        return {
            success: true,
            classification,
            recommendation: generateRecommendationFromCheckin(classification),
        };
    } catch (error) {
        logger.error('Failed to process checkin response', { error: error.message });
        return {
            success: false,
            error: error.message,
        };
    }
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Classify check-in response into categories
 */
function classifyCheckinResponse(response) {
    const lower = response.toLowerCase();

    if (lower.includes('interrupc') || lower.includes('reunion') || lower.includes('meeting')) {
        return { category: 'interruptions', label: 'Interrupciones/reuniones' };
    }

    if (lower.includes('tiempo') || lower.includes('sobrecarga') || lower.includes('mucho')) {
        return { category: 'overload', label: 'Sobrecarga/falta de tiempo' };
    }

    if (lower.includes('cansan') || lower.includes('energia') || lower.includes('fatiga')) {
        return { category: 'low_energy', label: 'Baja energía/cansancio' };
    }

    if (lower.includes('procrast') || lower.includes('pospuse') || lower.includes('postergue')) {
        return { category: 'procrastination', label: 'Postergación' };
    }

    if (lower.includes('bloquea') || lower.includes('depende') || lower.includes('esperando')) {
        return { category: 'blocked', label: 'Bloqueadores/dependencias' };
    }

    if (lower.includes('todo bien') || lower.includes('perfecto') || lower.includes('logre')) {
        return { category: 'success', label: 'Día exitoso' };
    }

    return { category: 'other', label: 'Otro motivo' };
}

/**
 * Generate recommendation from check-in classification
 */
function generateRecommendationFromCheckin(classification) {
    const recommendations = {
        interruptions: 'Protege bloques de Deep Work (2h sin interrupciones) mañana.',
        overload: 'Reduce compromisos para mañana. Prioriza solo 3 tareas críticas.',
        low_energy: 'Agenda tareas cognitivas en la mañana (9-12). Tarde para admin.',
        procrastination: 'Divide tareas grandes en pasos de 25 minutos (Pomodoro).',
        blocked: 'Identifica dependencias mañana temprano y desbloquea primero.',
        success: '¡Excelente! Mantén el ritmo. Celebra este progreso.',
        other: 'Revisa tu plan semanal mañana y ajusta prioridades.',
    };

    return recommendations[classification.category] || recommendations.other;
}
