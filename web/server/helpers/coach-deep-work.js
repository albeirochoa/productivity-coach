/**
 * Coach Deep Work Protection (Fase 10.2)
 *
 * Protección de Deep Work:
 * - Detecta ventanas de alta energía (perfil o heurística)
 * - Alerta cuando tarea de bajo valor invade esas ventanas
 * - Sugiere bloque alternativo
 */

import { detectEnergyWindows, isHighEnergyTime } from './coach-capacity-diagnosis.js';
import { isLowValueTask } from './coach-task-interceptor.js';

// ─── Deep Work Constants ─────────────────────────────────────

const DEEP_WORK_BLOCK_MIN_DURATION = 90; // minutes
const INTERRUPTION_THRESHOLD = 30; // minutes before/after high-energy window

// ─── Deep Work Protection ────────────────────────────────────

/**
 * Protect high-energy windows from low-value tasks
 * @param {Object} task - Task to schedule
 * @param {string} proposedStartTime - HH:MM format
 * @param {Object} profile - User profile with energy windows
 * @returns {Object} Protection result
 */
export function protectDeepWork(task, proposedStartTime, profile = {}) {
    try {
        // Parse proposed time
        const [hour, minute] = proposedStartTime.split(':').map(Number);

        // Check if proposed time is in high-energy window
        const inHighEnergy = isHighEnergyTime(hour, profile);

        // Check if task is low-value
        const lowValue = isLowValueTask(task, profile);

        // If low-value task in high-energy window, warn
        if (inHighEnergy && lowValue) {
            const energyWindows = detectEnergyWindows(profile);
            const currentWindow = energyWindows.find(w => hour >= w.start && hour < w.end);

            // Suggest alternative time slots (outside high-energy windows)
            const alternatives = suggestAlternativeSlots(energyWindows, proposedStartTime);

            return {
                protected: true,
                warning: `⚠️ Tarea de bajo valor programada durante ${currentWindow?.label || 'alta energía'}`,
                reason: 'Protegiendo tiempo de alta energía para trabajo profundo',
                recommendation: 'Reprograma esta tarea fuera de las ventanas de alta energía',
                alternatives,
                allowWithConfirmation: true,
            };
        }

        // All good
        return {
            protected: false,
            message: 'Bloque compatible con ventanas de energía',
        };
    } catch (error) {
        return {
            protected: false,
            message: 'Validación de Deep Work no disponible',
            warning: error.message,
        };
    }
}

/**
 * Suggest deep work blocks for today
 * @param {Object} deps - { readJson, readCalendarBlocks }
 * @returns {Array} Suggested deep work blocks
 */
export async function suggestDeepWorkBlocks(deps) {
    const { readJson, readCalendarBlocks } = deps;

    try {
        const data = await readJson('tasks-data.json');
        const profile = data.config || {};
        const today = new Date().toISOString().split('T')[0];

        // Get existing blocks
        const existingBlocks = await readCalendarBlocks({ date: today });

        // Get high-energy windows
        const energyWindows = detectEnergyWindows(profile);

        // Find available slots in high-energy windows
        const suggestions = [];
        for (const window of energyWindows) {
            if (window.type !== 'high') continue; // Only suggest for high-energy

            // Check if window is free
            const windowStart = window.start;
            const windowEnd = window.end;

            // Find conflicts
            const conflicts = existingBlocks.filter(block => {
                const blockStart = parseInt(block.startTime.split(':')[0]);
                const blockEnd = parseInt(block.endTime.split(':')[0]);
                return !(blockEnd <= windowStart || blockStart >= windowEnd);
            });

            if (conflicts.length === 0) {
                // Entire window is free
                suggestions.push({
                    label: `Bloque Deep Work (${window.label})`,
                    startTime: `${String(windowStart).padStart(2, '0')}:00`,
                    endTime: `${String(Math.min(windowStart + 2, windowEnd)).padStart(2, '0')}:00`,
                    durationMinutes: Math.min(120, (windowEnd - windowStart) * 60),
                    reason: 'Ventana de alta energía disponible',
                });
            }
        }

        return suggestions;
    } catch (error) {
        return [];
    }
}

/**
 * Detect if calendar block conflicts with deep work
 */
export function detectDeepWorkConflict(block, profile = {}) {
    const startHour = parseInt(block.startTime.split(':')[0]);
    const endHour = parseInt(block.endTime.split(':')[0]);

    const energyWindows = detectEnergyWindows(profile);
    const highEnergyWindows = energyWindows.filter(w => w.type === 'high');

    for (const window of highEnergyWindows) {
        // Check overlap
        if (!(endHour <= window.start || startHour >= window.end)) {
            return {
                conflict: true,
                window: window.label,
                recommendation: 'Reserva esta ventana para trabajo cognitivo profundo',
            };
        }
    }

    return { conflict: false };
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Suggest alternative time slots outside high-energy windows
 */
function suggestAlternativeSlots(energyWindows, proposedStartTime) {
    const alternatives = [];

    // Define typical work hours
    const workHours = [
        { start: 8, end: 9, label: 'Temprano (8-9 AM)' },
        { start: 12, end: 13, label: 'Mediodía (12-1 PM)' },
        { start: 17, end: 18, label: 'Tarde (5-6 PM)' },
        { start: 19, end: 20, label: 'Fin del día (7-8 PM)' },
    ];

    for (const slot of workHours) {
        // Check if slot overlaps with high-energy windows
        const overlaps = energyWindows.some(w => {
            if (w.type !== 'high') return false;
            return !(slot.end <= w.start || slot.start >= w.end);
        });

        if (!overlaps) {
            alternatives.push({
                startTime: `${String(slot.start).padStart(2, '0')}:00`,
                endTime: `${String(slot.end).padStart(2, '0')}:00`,
                label: slot.label,
            });
        }
    }

    return alternatives.slice(0, 3); // Return top 3
}

/**
 * Check if current time is in a deep work block
 */
export async function isInDeepWorkBlock(deps) {
    const { readCalendarBlocks } = deps;

    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

        const blocks = await readCalendarBlocks({ date: today });

        for (const block of blocks) {
            if (currentTimeStr >= block.startTime && currentTimeStr < block.endTime) {
                // Check if this is a deep work task
                const duration = calculateDuration(block.startTime, block.endTime);
                if (duration >= DEEP_WORK_BLOCK_MIN_DURATION) {
                    return {
                        inBlock: true,
                        block,
                        recommendation: 'Modo Deep Work activo — minimiza interrupciones',
                    };
                }
            }
        }

        return { inBlock: false };
    } catch (error) {
        return { inBlock: false, error: error.message };
    }
}

function calculateDuration(startTime, endTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
}
