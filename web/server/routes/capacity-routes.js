import {
    calculateDailyCapacity,
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
    detectOverload,
    suggestRedistribution,
    formatMinutes,
    getCapacityColor,
} from '../helpers/capacity-calculator.js';
import logger from '../helpers/logger.js';

export function registerCapacityRoutes(app, deps) {
    const { readJson, writeJson } = deps;

    // ============================================
    // CAPACITY CONFIGURATION
    // ============================================

    /**
     * GET /api/capacity/config
     * Get user's capacity configuration
     */
    app.get('/api/capacity/config', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            const config = data.config || {};

            res.json({
                work_hours_per_day: config.work_hours_per_day || 8,
                buffer_percentage: config.buffer_percentage || 20,
                break_minutes_per_day: config.break_minutes_per_day || 60,
                work_days_per_week: config.work_days_per_week || 5,
            });
        } catch (error) {
            logger.error('Failed to get capacity config', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PATCH /api/capacity/config
     * Update capacity configuration
     */
    app.patch('/api/capacity/config', async (req, res) => {
        try {
            const { work_hours_per_day, buffer_percentage, break_minutes_per_day, work_days_per_week } = req.body;
            const profileData = await readJson('profile.json');

            // Update capacity config
            if (!profileData.capacity) {
                profileData.capacity = {};
            }

            if (work_hours_per_day !== undefined) {
                profileData.capacity.work_hours_per_day = Math.max(1, Math.min(24, work_hours_per_day));
            }
            if (buffer_percentage !== undefined) {
                profileData.capacity.buffer_percentage = Math.max(0, Math.min(50, buffer_percentage));
            }
            if (break_minutes_per_day !== undefined) {
                profileData.capacity.break_minutes_per_day = Math.max(0, Math.min(480, break_minutes_per_day));
            }
            if (work_days_per_week !== undefined) {
                profileData.capacity.work_days_per_week = Math.max(1, Math.min(7, work_days_per_week));
            }

            await writeJson('profile.json', profileData);

            logger.info('Capacity config updated', { capacity: profileData.capacity });
            res.json(profileData.capacity);
        } catch (error) {
            logger.error('Failed to update capacity config', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================
    // CAPACITY CALCULATIONS
    // ============================================

    /**
     * GET /api/capacity/week
     * Calculate weekly capacity and current load
     */
    app.get('/api/capacity/week', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            const config = data.config || {};

            // Calculate capacity
            const capacity = calculateWeeklyCapacity({
                work_hours_per_day: config.work_hours_per_day || 8,
                buffer_percentage: config.buffer_percentage || 20,
                break_minutes_per_day: config.break_minutes_per_day || 60,
                work_days_per_week: config.work_days_per_week || 5,
            });

            // Calculate current load
            const tasks = data.tasks || [];
            const committedMinutes = calculateWeeklyLoad(tasks);

            // Detect overload
            const overloadStatus = detectOverload(committedMinutes, capacity.usable);

            // Get suggestions if overloaded
            const suggestions = overloadStatus.isOverloaded
                ? suggestRedistribution(tasks, overloadStatus.excess)
                : [];

            res.json({
                capacity: {
                    total: capacity.total,
                    available: capacity.available,
                    usable: capacity.usable,
                    totalFormatted: formatMinutes(capacity.total),
                    availableFormatted: formatMinutes(capacity.available),
                    usableFormatted: formatMinutes(capacity.usable),
                },
                committed: {
                    minutes: committedMinutes,
                    formatted: formatMinutes(committedMinutes),
                },
                status: {
                    isOverloaded: overloadStatus.isOverloaded,
                    percentage: overloadStatus.percentage,
                    excess: overloadStatus.excess,
                    excessFormatted: formatMinutes(overloadStatus.excess),
                    color: getCapacityColor(overloadStatus.percentage),
                },
                suggestions,
            });
        } catch (error) {
            logger.error('Failed to calculate weekly capacity', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/capacity/today
     * Calculate today's capacity and current load
     * Note: In MVP without time blocking, this is a simplified version
     */
    app.get('/api/capacity/today', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            const config = data.config || {};

            // Calculate daily capacity
            const capacity = calculateDailyCapacity({
                work_hours_per_day: config.work_hours_per_day || 8,
                buffer_percentage: config.buffer_percentage || 20,
                break_minutes_per_day: config.break_minutes_per_day || 60,
            });

            // For MVP: estimate daily load as weekly load / work days
            const tasks = data.tasks || [];
            const weeklyLoad = calculateWeeklyLoad(tasks);
            const workDays = config.work_days_per_week || 5;
            const estimatedDailyLoad = Math.floor(weeklyLoad / workDays);

            // Detect overload
            const overloadStatus = detectOverload(estimatedDailyLoad, capacity.usable);

            res.json({
                capacity: {
                    total: capacity.total,
                    available: capacity.available,
                    usable: capacity.usable,
                    totalFormatted: formatMinutes(capacity.total),
                    availableFormatted: formatMinutes(capacity.available),
                    usableFormatted: formatMinutes(capacity.usable),
                },
                committed: {
                    minutes: estimatedDailyLoad,
                    formatted: formatMinutes(estimatedDailyLoad),
                },
                status: {
                    isOverloaded: overloadStatus.isOverloaded,
                    percentage: overloadStatus.percentage,
                    excess: overloadStatus.excess,
                    excessFormatted: formatMinutes(overloadStatus.excess),
                    color: getCapacityColor(overloadStatus.percentage),
                },
                note: 'MVP estimate: weekly load divided by work days. Real daily tracking coming in Phase 4 (Time Blocking).',
            });
        } catch (error) {
            logger.error('Failed to calculate daily capacity', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================
    // CAPACITY ACTIONS
    // ============================================

    /**
     * POST /api/capacity/validate-commitment
     * Validate if committing a task/milestone would overload the week
     */
    app.post('/api/capacity/validate-commitment', async (req, res) => {
        try {
            const { taskId, milestoneId, estimatedMinutes } = req.body;
            const data = await readJson('tasks-data.json');
            const config = data.config || {};

            // Calculate current capacity
            const capacity = calculateWeeklyCapacity({
                work_hours_per_day: config.work_hours_per_day || 8,
                buffer_percentage: config.buffer_percentage || 20,
                break_minutes_per_day: config.break_minutes_per_day || 60,
                work_days_per_week: config.work_days_per_week || 5,
            });

            // Calculate current load
            const tasks = data.tasks || [];
            const currentLoad = calculateWeeklyLoad(tasks);

            // Calculate new load
            const newLoad = currentLoad + (estimatedMinutes || 60);

            // Check if it would overload
            const overloadStatus = detectOverload(newLoad, capacity.usable);

            res.json({
                canCommit: !overloadStatus.isOverloaded,
                currentLoad: {
                    minutes: currentLoad,
                    formatted: formatMinutes(currentLoad),
                },
                newLoad: {
                    minutes: newLoad,
                    formatted: formatMinutes(newLoad),
                },
                capacity: {
                    usable: capacity.usable,
                    formatted: formatMinutes(capacity.usable),
                },
                status: {
                    isOverloaded: overloadStatus.isOverloaded,
                    percentage: overloadStatus.percentage,
                    excess: overloadStatus.excess,
                    excessFormatted: formatMinutes(overloadStatus.excess),
                    color: getCapacityColor(overloadStatus.percentage),
                },
                warning: overloadStatus.isOverloaded
                    ? `This would overload your week by ${formatMinutes(overloadStatus.excess)}`
                    : null,
            });
        } catch (error) {
            logger.error('Failed to validate commitment', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/capacity/auto-redistribute
     * Automatically redistribute tasks to resolve overload
     */
    app.post('/api/capacity/auto-redistribute', async (req, res) => {
        try {
            const { execute } = req.body; // execute: true to apply changes
            const data = await readJson('tasks-data.json');
            const config = data.config || {};

            // Calculate current state
            const capacity = calculateWeeklyCapacity({
                work_hours_per_day: config.work_hours_per_day || 8,
                buffer_percentage: config.buffer_percentage || 20,
                break_minutes_per_day: config.break_minutes_per_day || 60,
                work_days_per_week: config.work_days_per_week || 5,
            });

            const tasks = data.tasks || [];
            const committedMinutes = calculateWeeklyLoad(tasks);
            const overloadStatus = detectOverload(committedMinutes, capacity.usable);

            if (!overloadStatus.isOverloaded) {
                return res.json({
                    message: 'No overload detected. Your week is within capacity.',
                    status: {
                        isOverloaded: false,
                        percentage: overloadStatus.percentage,
                        committed: formatMinutes(committedMinutes),
                        capacity: formatMinutes(capacity.usable),
                    },
                    changes: [],
                });
            }

            // Get redistribution suggestions
            const suggestions = suggestRedistribution(tasks, overloadStatus.excess);

            if (!execute) {
                // Preview mode
                return res.json({
                    message: `Your week is overloaded by ${formatMinutes(overloadStatus.excess)}`,
                    status: {
                        isOverloaded: true,
                        percentage: overloadStatus.percentage,
                        excess: formatMinutes(overloadStatus.excess),
                        committed: formatMinutes(committedMinutes),
                        capacity: formatMinutes(capacity.usable),
                    },
                    suggestions,
                    note: 'Send execute=true to apply these changes',
                });
            }

            // Execute mode - apply suggestions
            const changes = [];
            for (const suggestion of suggestions) {
                const task = tasks.find(t => t.id === suggestion.taskId);
                if (!task) continue;

                if (suggestion.action === 'defer') {
                    // Remove from this week
                    task.thisWeek = false;
                    task.weekCommitted = null;
                    task.committedMilestones = [];
                    task.committedMilestone = null;

                    changes.push({
                        taskId: task.id,
                        taskTitle: task.title,
                        action: 'deferred',
                        reason: suggestion.reason,
                        savedMinutes: suggestion.minutes,
                    });
                } else if (suggestion.action === 'uncommit_milestone') {
                    // Remove milestone from committed list
                    task.committedMilestones = (task.committedMilestones || [])
                        .filter(mId => mId !== suggestion.milestoneId);

                    task.committedMilestone = task.committedMilestones[0] || null;

                    // If no more committed milestones, remove from week
                    if (task.committedMilestones.length === 0) {
                        task.thisWeek = false;
                        task.weekCommitted = null;
                    }

                    changes.push({
                        taskId: task.id,
                        taskTitle: task.title,
                        milestoneId: suggestion.milestoneId,
                        milestoneTitle: suggestion.milestoneTitle,
                        action: 'milestone_uncommitted',
                        reason: suggestion.reason,
                        savedMinutes: suggestion.minutes,
                    });
                }
            }

            // Save changes
            await writeJson('tasks-data.json', data);

            // Recalculate new state
            const newLoad = calculateWeeklyLoad(data.tasks);
            const newOverload = detectOverload(newLoad, capacity.usable);

            logger.info('Auto-redistribution executed', {
                changesCount: changes.length,
                oldLoad: committedMinutes,
                newLoad,
                resolved: !newOverload.isOverloaded,
            });

            res.json({
                message: newOverload.isOverloaded
                    ? `Partially resolved. Still overloaded by ${formatMinutes(newOverload.excess)}`
                    : 'Overload resolved! Your week is now within capacity.',
                status: {
                    before: {
                        committed: formatMinutes(committedMinutes),
                        percentage: overloadStatus.percentage,
                        excess: formatMinutes(overloadStatus.excess),
                    },
                    after: {
                        committed: formatMinutes(newLoad),
                        percentage: newOverload.percentage,
                        excess: formatMinutes(newOverload.excess),
                        isOverloaded: newOverload.isOverloaded,
                    },
                    capacity: formatMinutes(capacity.usable),
                },
                changes,
            });
        } catch (error) {
            logger.error('Failed to auto-redistribute', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });
}
