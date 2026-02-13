import logger from '../helpers/logger.js';

/**
 * Calendar Blocks Routes
 * Time blocking - asignar tareas a bloques horarios específicos
 */

export function registerCalendarRoutes(app, deps) {
    const { readCalendarBlocks, createCalendarBlock, updateCalendarBlock, deleteCalendarBlock, readJson } = deps;

    // ============================================
    // HELPER: Validaciones
    // ============================================

    /**
     * Calcula duración en minutos entre dos horas HH:MM
     */
    function calculateDuration(startTime, endTime) {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        return endMinutes - startMinutes;
    }

    /**
     * Valida que el bloque esté dentro del horario laboral
     */
    async function validateWorkingHours(date, startTime, endTime) {
        try {
            const profile = await readJson('profile.json');
            const capacity = profile.capacity || {};
            const workHoursPerDay = capacity.work_hours_per_day || 8;

            // Por defecto: 9:00 AM - 6:00 PM (8 horas)
            const workStart = 9 * 60; // 9:00 AM en minutos
            const workEnd = workStart + (workHoursPerDay * 60);

            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            const blockStart = startH * 60 + startM;
            const blockEnd = endH * 60 + endM;

            if (blockStart < workStart || blockEnd > workEnd) {
                return {
                    valid: false,
                    message: `El bloque debe estar dentro del horario laboral (${Math.floor(workStart / 60)}:${String(workStart % 60).padStart(2, '0')} - ${Math.floor(workEnd / 60)}:${String(workEnd % 60).padStart(2, '0')})`,
                };
            }

            return { valid: true };
        } catch (error) {
            logger.warn('Could not validate working hours', { error: error.message });
            return { valid: true }; // Si no hay profile, permitir
        }
    }

    /**
     * Detecta solapamiento con otros bloques del mismo día
     */
    function detectOverlap(date, startTime, endTime, excludeBlockId = null) {
        const existingBlocks = readCalendarBlocks({ date });

        const [newStartH, newStartM] = startTime.split(':').map(Number);
        const [newEndH, newEndM] = endTime.split(':').map(Number);
        const newStart = newStartH * 60 + newStartM;
        const newEnd = newEndH * 60 + newEndM;

        for (const block of existingBlocks) {
            if (excludeBlockId && block.id === excludeBlockId) continue;

            const [blockStartH, blockStartM] = block.startTime.split(':').map(Number);
            const [blockEndH, blockEndM] = block.endTime.split(':').map(Number);
            const blockStart = blockStartH * 60 + blockStartM;
            const blockEnd = blockEndH * 60 + blockEndM;

            // Detectar solapamiento: newStart < blockEnd AND newEnd > blockStart
            if (newStart < blockEnd && newEnd > blockStart) {
                return {
                    overlap: true,
                    conflictBlock: block,
                    message: `Solapamiento con bloque existente (${block.startTime} - ${block.endTime})`,
                };
            }
        }

        return { overlap: false };
    }

    // ============================================
    // ENDPOINTS
    // ============================================

    // GET /api/calendar/blocks - Obtener bloques con filtros
    app.get('/api/calendar/blocks', (req, res) => {
        try {
            const { date, taskId, status, startDate, endDate } = req.query;
            const filters = {};

            if (date) filters.date = date;
            if (taskId) filters.taskId = taskId;
            if (status) filters.status = status;
            if (startDate && endDate) {
                filters.dateRange = { start: startDate, end: endDate };
            }

            const blocks = readCalendarBlocks(filters);
            res.json(blocks);
        } catch (error) {
            logger.error('Error fetching calendar blocks', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/calendar/blocks - Crear nuevo bloque
    app.post('/api/calendar/blocks', async (req, res) => {
        try {
            const { taskId, date, startTime, endTime, status, notes } = req.body;

            // Validaciones básicas
            if (!taskId || !date || !startTime || !endTime) {
                return res.status(400).json({
                    error: 'taskId, date, startTime y endTime son requeridos',
                });
            }

            // Validar formato de fecha (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ error: 'Formato de fecha inválido (usar YYYY-MM-DD)' });
            }

            // Validar formato de hora (HH:MM)
            if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
                return res.status(400).json({ error: 'Formato de hora inválido (usar HH:MM)' });
            }

            // Validar que endTime > startTime
            const duration = calculateDuration(startTime, endTime);
            if (duration <= 0) {
                return res.status(400).json({ error: 'La hora de fin debe ser posterior a la hora de inicio' });
            }

            // Validar horario laboral
            const workingHoursCheck = await validateWorkingHours(date, startTime, endTime);
            if (!workingHoursCheck.valid) {
                return res.status(400).json({ error: workingHoursCheck.message });
            }

            // Detectar solapamiento
            const overlapCheck = detectOverlap(date, startTime, endTime);
            if (overlapCheck.overlap) {
                return res.status(409).json({
                    error: overlapCheck.message,
                    conflictBlock: overlapCheck.conflictBlock,
                });
            }

            // Crear bloque
            const block = createCalendarBlock({
                taskId,
                date,
                startTime,
                endTime,
                durationMinutes: duration,
                status: status || 'scheduled',
                notes: notes || null,
            });

            logger.info('Calendar block created', { blockId: block.id, date, startTime, endTime });
            res.json(block);
        } catch (error) {
            logger.error('Error creating calendar block', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // PATCH /api/calendar/blocks/:id - Actualizar bloque (mover, cambiar status)
    app.patch('/api/calendar/blocks/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Si se está moviendo el bloque (cambio de hora o fecha), validar
            if (updates.startTime || updates.endTime || updates.date) {
                const currentBlock = readCalendarBlocks({ id })[0];
                if (!currentBlock) {
                    return res.status(404).json({ error: 'Bloque no encontrado' });
                }

                const newDate = updates.date || currentBlock.date;
                const newStartTime = updates.startTime || currentBlock.startTime;
                const newEndTime = updates.endTime || currentBlock.endTime;

                // Recalcular duración si cambiaron las horas
                if (updates.startTime || updates.endTime) {
                    updates.durationMinutes = calculateDuration(newStartTime, newEndTime);
                    if (updates.durationMinutes <= 0) {
                        return res.status(400).json({ error: 'La hora de fin debe ser posterior a la hora de inicio' });
                    }
                }

                // Validar horario laboral
                const workingHoursCheck = await validateWorkingHours(newDate, newStartTime, newEndTime);
                if (!workingHoursCheck.valid) {
                    return res.status(400).json({ error: workingHoursCheck.message });
                }

                // Detectar solapamiento (excluyendo el bloque actual)
                const overlapCheck = detectOverlap(newDate, newStartTime, newEndTime, id);
                if (overlapCheck.overlap) {
                    return res.status(409).json({
                        error: overlapCheck.message,
                        conflictBlock: overlapCheck.conflictBlock,
                    });
                }
            }

            const updatedBlock = updateCalendarBlock(id, updates);
            if (!updatedBlock) {
                return res.status(404).json({ error: 'Bloque no encontrado' });
            }

            logger.info('Calendar block updated', { blockId: id, updates });
            res.json(updatedBlock);
        } catch (error) {
            logger.error('Error updating calendar block', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE /api/calendar/blocks/:id - Eliminar bloque
    app.delete('/api/calendar/blocks/:id', (req, res) => {
        try {
            const { id } = req.params;
            deleteCalendarBlock(id);
            logger.info('Calendar block deleted', { blockId: id });
            res.json({ success: true });
        } catch (error) {
            logger.error('Error deleting calendar block', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/calendar/day/:date - Vista completa del día
    app.get('/api/calendar/day/:date', async (req, res) => {
        try {
            const { date } = req.params;
            const blocks = readCalendarBlocks({ date });

            // Obtener información de las tareas asociadas
            const data = await readJson('tasks-data.json');
            const blocksWithTasks = blocks.map(block => {
                const task = data.tasks.find(t => t.id === block.taskId);
                return {
                    ...block,
                    task: task ? {
                        id: task.id,
                        title: task.title,
                        type: task.type,
                        category: task.category,
                    } : null,
                };
            });

            res.json({
                date,
                blocks: blocksWithTasks,
                totalScheduledMinutes: blocks.reduce((sum, b) => sum + b.durationMinutes, 0),
            });
        } catch (error) {
            logger.error('Error fetching day calendar', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });
}
