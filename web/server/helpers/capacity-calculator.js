/**
 * Capacity Calculator
 *
 * Handles all capacity planning calculations:
 * - Available capacity per day/week
 * - Committed load calculation
 * - Overload detection
 * - Redistribution suggestions
 */

/**
 * Calculate available capacity per day in minutes
 * @param {Object} config - User capacity configuration
 * @param {number} config.work_hours_per_day - Total work hours (e.g., 8)
 * @param {number} config.buffer_percentage - Buffer % for unexpected work (e.g., 20)
 * @param {number} config.break_minutes_per_day - Break time in minutes (e.g., 60)
 * @returns {Object} { total, available, usable }
 */
export function calculateDailyCapacity(config) {
    const totalMinutes = config.work_hours_per_day * 60;
    const availableMinutes = totalMinutes - config.break_minutes_per_day;
    const usableMinutes = Math.floor(availableMinutes * (1 - config.buffer_percentage / 100));

    return {
        total: totalMinutes,           // e.g., 480 (8h)
        available: availableMinutes,   // e.g., 420 (7h)
        usable: usableMinutes,         // e.g., 336 (5.6h)
    };
}

/**
 * Calculate weekly capacity in minutes
 * @param {Object} config - User capacity configuration
 * @returns {Object} { total, available, usable }
 */
export function calculateWeeklyCapacity(config) {
    const daily = calculateDailyCapacity(config);
    const workDays = config.work_days_per_week;

    return {
        total: daily.total * workDays,
        available: daily.available * workDays,
        usable: daily.usable * workDays,
    };
}

/**
 * Calculate committed load for a specific day
 * @param {Array} tasks - All tasks
 * @param {string} dayOfWeek - Day of week (e.g., 'monday')
 * @returns {number} Total minutes committed
 */
export function calculateDailyLoad(tasks, dayOfWeek) {
    // For MVP, we don't have time blocking yet
    // So we estimate based on tasks committed this week
    // In Phase 4 (Time Blocking), this will use calendar_blocks

    let totalMinutes = 0;

    for (const task of tasks) {
        if (!task.thisWeek || task.status !== 'active') continue;

        if (task.type === 'project') {
            // Sum committed milestones
            const committedIds = task.committedMilestones || [];
            for (const milestoneId of committedIds) {
                const milestone = task.milestones?.find(m => m.id === milestoneId);
                if (milestone && !milestone.completed) {
                    totalMinutes += milestone.timeEstimate || 45;
                }
            }
        } else {
            // Simple task - use default estimate (TODO: add timeEstimate field to simple tasks)
            totalMinutes += 60; // Default 1 hour for simple tasks
        }
    }

    return totalMinutes;
}

/**
 * Calculate total committed load for the week
 * @param {Array} tasks - All tasks
 * @returns {number} Total minutes committed this week
 */
export function calculateWeeklyLoad(tasks) {
    let totalMinutes = 0;

    for (const task of tasks) {
        if (!task.thisWeek || task.status !== 'active') continue;

        if (task.type === 'project') {
            // Sum committed milestones
            const committedIds = task.committedMilestones || [];
            for (const milestoneId of committedIds) {
                const milestone = task.milestones?.find(m => m.id === milestoneId);
                if (milestone && !milestone.completed) {
                    totalMinutes += milestone.timeEstimate || 45;
                }
            }
        } else {
            // Simple task - default estimate
            totalMinutes += 60; // 1 hour
        }
    }

    return totalMinutes;
}

/**
 * Detect overload condition
 * @param {number} committed - Committed minutes
 * @param {number} capacity - Available capacity minutes
 * @returns {Object} { isOverloaded, percentage, excess }
 */
export function detectOverload(committed, capacity) {
    const percentage = capacity > 0 ? Math.round((committed / capacity) * 100) : 0;
    const excess = committed - capacity;
    const isOverloaded = excess > 0;

    return {
        isOverloaded,
        percentage,
        excess: Math.max(0, excess),
    };
}

/**
 * Suggest redistribution for overloaded week
 * @param {Array} tasks - All tasks committed this week
 * @param {number} excessMinutes - Minutes over capacity
 * @returns {Array} Suggestions array
 */
export function suggestRedistribution(tasks, excessMinutes) {
    const suggestions = [];

    // Strategy 1: Defer lowest priority items
    const deferrable = tasks
        .filter(t => t.thisWeek && t.status === 'active')
        .filter(t => !t.priority || t.priority === 'low')
        .sort((a, b) => {
            // Prefer simple tasks over projects for deferral
            if (a.type !== b.type) return a.type === 'simple' ? -1 : 1;
            return 0;
        });

    let remaining = excessMinutes;
    for (const task of deferrable) {
        if (remaining <= 0) break;

        const taskTime = task.type === 'project'
            ? (task.committedMilestones || []).reduce((sum, mId) => {
                const m = task.milestones?.find(x => x.id === mId);
                return sum + (m?.timeEstimate || 0);
            }, 0)
            : 60;

        if (taskTime > 0) {
            suggestions.push({
                action: 'defer',
                taskId: task.id,
                taskTitle: task.title,
                taskType: task.type,
                minutes: taskTime,
                reason: 'Low priority - can be moved to next week',
            });
            remaining -= taskTime;
        }
    }

    // Strategy 2: Split large milestones if still overloaded
    if (remaining > 0) {
        const projects = tasks.filter(t => t.type === 'project' && t.thisWeek);
        for (const project of projects) {
            const committedMilestones = (project.committedMilestones || [])
                .map(mId => project.milestones?.find(m => m.id === mId))
                .filter(m => m && !m.completed)
                .sort((a, b) => (b.timeEstimate || 0) - (a.timeEstimate || 0));

            for (const milestone of committedMilestones) {
                if (remaining <= 0) break;
                if (milestone.timeEstimate > 120) { // > 2 hours
                    suggestions.push({
                        action: 'uncommit_milestone',
                        taskId: project.id,
                        taskTitle: project.title,
                        milestoneId: milestone.id,
                        milestoneTitle: milestone.title,
                        minutes: milestone.timeEstimate,
                        reason: 'Large milestone - consider uncommitting for next week',
                    });
                    remaining -= milestone.timeEstimate;
                }
            }
        }
    }

    return suggestions;
}

/**
 * Format minutes to human-readable string
 * @param {number} minutes
 * @returns {string} e.g., "5.6h" or "45min"
 */
export function formatMinutes(minutes) {
    if (minutes >= 60) {
        const hours = (minutes / 60).toFixed(1);
        return `${hours}h`;
    }
    return `${minutes}min`;
}

/**
 * Get capacity status color
 * @param {number} percentage - Usage percentage
 * @returns {string} Color indicator
 */
export function getCapacityColor(percentage) {
    if (percentage <= 80) return 'green';   // Healthy
    if (percentage <= 100) return 'yellow'; // Near capacity
    return 'red';                           // Overloaded
}
