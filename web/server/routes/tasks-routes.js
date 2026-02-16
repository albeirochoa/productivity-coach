import { validate, TaskSchema, MilestoneSchema } from '../helpers/validators.js';
import {
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
    detectOverload,
    formatMinutes,
} from '../helpers/capacity-calculator.js';
import { interceptTaskAction, interceptTaskMove } from '../helpers/coach-task-interceptor.js';

export function registerTaskRoutes(app, deps) {
    const { readJson, writeJson, generateId, getCurrentWeek } = deps;

    // ============================================
    // TASKS API (Sistema Unificado)
    // ============================================

    // GET /api/tasks - Obtener todas las tasks
    app.get('/api/tasks', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            res.json(data.tasks || []);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/tasks/this-week - Obtener tasks de esta semana
    app.get('/api/tasks/this-week', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            const thisWeekTasks = (data.tasks || []).filter(t => t.thisWeek && t.status !== 'done');
            res.json(thisWeekTasks);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/tasks/projects - Solo proyectos
    app.get('/api/tasks/projects', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            const projects = (data.tasks || []).filter(t => t.type === 'project');
            res.json(projects);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/tasks/templates - Obtener plantillas guardadas
    app.get('/api/tasks/templates', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            res.json(data.templates || []);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE /api/tasks/templates/:id - Eliminar plantilla
    app.delete('/api/tasks/templates/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const data = await readJson('tasks-data.json');

            const templateIndex = (data.templates || []).findIndex(t => t.id === id);
            if (templateIndex === -1) {
                return res.status(404).json({ error: 'Template not found' });
            }

            data.templates.splice(templateIndex, 1);
            await writeJson('tasks-data.json', data);

            res.json({ success: true, message: 'Template deleted' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PATCH /api/tasks/templates/:id - Actualizar plantilla (nombre, etc)
    app.patch('/api/tasks/templates/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const data = await readJson('tasks-data.json');

            const template = (data.templates || []).find(t => t.id === id);
            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }

            if (name) {
                template.name = name;
            }

            await writeJson('tasks-data.json', data);
            res.json(template);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/tasks - Crear nueva task
    app.post('/api/tasks', validate(TaskSchema), async (req, res) => {
        try {
            const {
                title,
                type,
                category,
                areaId,
                thisWeek,
                description,
                milestones,
                strategy,
                dueDate,
                priority,
                reminders,
                saveAsTemplate,
                templateName,
                objectiveId,
                keyResultId,
            } = req.validatedBody;
            const data = await readJson('tasks-data.json');
            const normalizedAreaId = areaId || category || 'trabajo';
            const forceFlag = req.body?.force === true;
            const enforceInterceptorFlag = req.body?.enforceInterceptor === true;

            const interventionEnabled = process.env.FF_COACH_INTERVENTION_ENABLED !== 'false';
            let interceptor = null;
            if (interventionEnabled) {
                interceptor = await interceptTaskAction(
                    { title, type, thisWeek, dueDate, priority, category: normalizedAreaId, areaId: normalizedAreaId, milestones },
                    { readJson, getDbManager: deps.getDbManager }
                );
                if (interceptor?.mode === 'soft_block' && !forceFlag && enforceInterceptorFlag) {
                    return res.status(409).json({
                        error: 'Capacity advisory',
                        message: interceptor.message,
                        interceptor,
                    });
                }
            }

            const newTask = {
                id: type === 'project' ? title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : generateId(),
                title,
                type: type || 'simple',
                status: 'active',
                thisWeek: thisWeek || false,
                weekCommitted: thisWeek ? getCurrentWeek() : null,
                category: normalizedAreaId,
                areaId: normalizedAreaId,
                dueDate: dueDate || null,
                priority: priority || 'normal', // 'low', 'normal', 'high'
                reminders: reminders || [],
                objectiveId: objectiveId || null,
                keyResultId: keyResultId || null,
                createdAt: new Date().toISOString(),
                completedAt: null
            };

            // Si es proyecto, anadir estructura de milestones
            if (type === 'project') {
                newTask.description = description || '';
                newTask.strategy = strategy || 'goteo';
                newTask.parentId = req.body.parentId || null; // Para jerarquia de proyectos
                newTask.sections = req.body.sections || []; // Secciones internas del proyecto
                newTask.milestones = (milestones || []).map((m, idx) => ({
                    id: `milestone-${idx + 1}`,
                    title: m.title,
                    description: m.description || '',
                    timeEstimate: m.time_estimate || m.timeEstimate || 45,
                    completed: false,
                    completedAt: null,
                    sectionId: m.sectionId || null,
                    category: m.category || newTask.category // Herencia de área del proyecto
                }));
                newTask.currentMilestone = 0;
                newTask.committedMilestones = [];
                newTask.committedMilestone = null;

                // Si se solicita guardar como plantilla
                if (saveAsTemplate && milestones && milestones.length > 0) {
                    if (!data.templates) {
                        data.templates = [];
                    }
                    const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    data.templates.push({
                        id: templateId,
                        name: templateName || title,
                        category: normalizedAreaId,
                        strategy: strategy || 'goteo',
                        milestones: milestones.map(m => ({
                            title: m.title,
                            description: m.description || '',
                            time_estimate: m.time_estimate || m.timeEstimate || 45
                        })),
                        createdAt: new Date().toISOString()
                    });
                }
            }

            data.tasks.push(newTask);
            await writeJson('tasks-data.json', data);

            res.json({ ...newTask, interceptor });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PATCH /api/tasks/:id - Actualizar task
    app.patch('/api/tasks/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const data = await readJson('tasks-data.json');

            const taskIndex = data.tasks.findIndex(t => t.id === id);
            if (taskIndex === -1) {
                return res.status(404).json({ error: 'Task not found' });
            }

            const task = data.tasks[taskIndex];
            const interventionEnabled = process.env.FF_COACH_INTERVENTION_ENABLED !== 'false';

            if (interventionEnabled && ('thisWeek' in updates || 'dueDate' in updates)) {
                const targetList = updates.thisWeek
                    ? (updates.dueDate ? 'today' : 'week')
                    : 'someday';
                const intercept = await interceptTaskMove(id, targetList, {
                    readJson,
                    getDbManager: deps.getDbManager,
                });
                const forceFlag = req.body?.force === true;
                const enforceInterceptorFlag = req.body?.enforceInterceptor === true;
                if (intercept?.mode === 'soft_block' && !forceFlag && enforceInterceptorFlag) {
                    return res.status(409).json({
                        error: 'Capacity advisory',
                        message: intercept.message,
                        interceptor: intercept,
                    });
                }
            }

            // Actualizar campos permitidos
            if ('thisWeek' in updates) {
                task.thisWeek = updates.thisWeek;
                if (updates.thisWeek) {
                    task.weekCommitted = getCurrentWeek();
                }
            }

            if ('status' in updates) {
                task.status = updates.status;
                if (updates.status === 'done') {
                    task.completedAt = new Date().toISOString();
                    data.stats.tasks_completed = (data.stats.tasks_completed || 0) + 1;
                }
            }

            if ('title' in updates) task.title = updates.title;
            if ('areaId' in updates) {
                task.areaId = updates.areaId || null;
                if (updates.areaId) {
                    task.category = updates.areaId;
                }
            }
            if ('category' in updates) {
                task.category = updates.category;
                task.areaId = updates.category || task.areaId;
            }
            if ('dueDate' in updates) task.dueDate = updates.dueDate;
            if ('priority' in updates) task.priority = updates.priority;
            if ('parentId' in updates) task.parentId = updates.parentId;
            if ('objectiveId' in updates) task.objectiveId = updates.objectiveId || null;
            if ('keyResultId' in updates) task.keyResultId = updates.keyResultId || null;

            data.tasks[taskIndex] = task;
            await writeJson('tasks-data.json', data);

            res.json(task);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PATCH /api/tasks/:id/toggle - Toggle completado
    app.patch('/api/tasks/:id/toggle', async (req, res) => {
        try {
            const { id } = req.params;
            const data = await readJson('tasks-data.json');

            const task = data.tasks.find(t => t.id === id);
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }

            // Toggle status
            if (task.status === 'done') {
                task.status = 'active';
                task.completedAt = null;
                data.stats.tasks_completed = Math.max(0, (data.stats.tasks_completed || 0) - 1);
            } else {
                task.status = 'done';
                task.completedAt = new Date().toISOString();
                data.stats.tasks_completed = (data.stats.tasks_completed || 0) + 1;
            }

            await writeJson('tasks-data.json', data);
            res.json(task);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PATCH /api/tasks/:id/milestones/:milestoneId - Toggle milestone de proyecto
    app.patch('/api/tasks/:id/milestones/:milestoneId', async (req, res) => {
        try {
            const { id, milestoneId } = req.params;
            const { completed } = req.body;
            const data = await readJson('tasks-data.json');

            const task = data.tasks.find(t => t.id === id);
            if (!task || task.type !== 'project') {
                return res.status(404).json({ error: 'Project not found' });
            }

            const milestone = task.milestones.find(m => m.id === milestoneId);
            if (!milestone) {
                return res.status(404).json({ error: 'Milestone not found' });
            }

            milestone.completed = completed;
            milestone.completedAt = completed ? new Date().toISOString() : null;

            // Actualizar currentMilestone
            const nextIncomplete = task.milestones.findIndex(m => !m.completed);
            task.currentMilestone = nextIncomplete === -1 ? task.milestones.length : nextIncomplete;

            // Si todos los milestones estan completos, marcar proyecto como done
            if (task.milestones.every(m => m.completed)) {
                task.status = 'done';
                task.completedAt = new Date().toISOString();
                data.stats.projects_completed = (data.stats.projects_completed || 0) + 1;
            }

            await writeJson('tasks-data.json', data);
            res.json(task);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/tasks/:id/commit-milestone - Comprometer milestones para esta semana
    app.post('/api/tasks/:id/commit-milestone', async (req, res) => {
        try {
            const { id } = req.params;
            const { milestoneId, force } = req.body; // force: skip capacity validation
            const data = await readJson('tasks-data.json');

            const task = data.tasks.find(t => t.id === id);
            if (!task || task.type !== 'project') {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Inicializar array si no existe (migrar de campo single a array)
            if (!Array.isArray(task.committedMilestones)) {
                task.committedMilestones = task.committedMilestone ? [task.committedMilestone] : [];
            }

            const targetMilestone = milestoneId || task.milestones[task.currentMilestone]?.id;
            if (!targetMilestone) {
                return res.status(400).json({ error: 'No milestone to commit' });
            }

            const milestone = task.milestones.find(m => m.id === targetMilestone);
            const isCommitting = !task.committedMilestones.includes(targetMilestone);

            // Capacity validation (only when committing, not uncommitting)
            if (isCommitting && !force) {
                const config = data.config || {};
                const capacity = calculateWeeklyCapacity({
                    work_hours_per_day: config.work_hours_per_day || 8,
                    buffer_percentage: config.buffer_percentage || 20,
                    break_minutes_per_day: config.break_minutes_per_day || 60,
                    work_days_per_week: config.work_days_per_week || 5,
                });

                const currentLoad = calculateWeeklyLoad(data.tasks);
                const newLoad = currentLoad + (milestone?.timeEstimate || 60);
                const overloadStatus = detectOverload(newLoad, capacity.usable);

                if (overloadStatus.isOverloaded) {
                    return res.status(409).json({
                        error: 'Capacity overload',
                        message: `Committing this milestone would overload your week by ${formatMinutes(overloadStatus.excess)}`,
                        capacity: {
                            current: { minutes: currentLoad, formatted: formatMinutes(currentLoad) },
                            new: { minutes: newLoad, formatted: formatMinutes(newLoad) },
                            limit: { minutes: capacity.usable, formatted: formatMinutes(capacity.usable) },
                        },
                        overload: {
                            excess: overloadStatus.excess,
                            excessFormatted: formatMinutes(overloadStatus.excess),
                            percentage: overloadStatus.percentage,
                        },
                        canForce: true, // Client can retry with force=true
                    });
                }
            }

            // Toggle: si ya esta comprometido, quitarlo; si no, agregarlo
            const idx = task.committedMilestones.indexOf(targetMilestone);
            if (idx !== -1) {
                task.committedMilestones.splice(idx, 1);
            } else {
                task.committedMilestones.push(targetMilestone);
            }

            // El proyecto esta en "esta semana" si tiene al menos un milestone comprometido
            task.thisWeek = task.committedMilestones.length > 0;
            task.weekCommitted = task.thisWeek ? getCurrentWeek() : null;
            // Mantener compatibilidad con campo legacy
            task.committedMilestone = task.committedMilestones[0] || null;

            await writeJson('tasks-data.json', data);
            res.json(task);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE /api/tasks/:id - Eliminar task
    app.delete('/api/tasks/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const data = await readJson('tasks-data.json');

            data.tasks = data.tasks.filter(t => t.id !== id);
            await writeJson('tasks-data.json', data);

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
