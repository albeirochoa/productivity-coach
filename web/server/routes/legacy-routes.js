export function registerLegacyRoutes(app, deps) {
    const { readJson, writeJson, getCurrentWeek } = deps;

    // ============================================
    // LEGACY ENDPOINTS (Compatibilidad temporal)
    // ============================================

    // GET /api/commitments/current - Ahora retorna tasks de esta semana
    app.get('/api/commitments/current', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            const thisWeekTasks = (data.tasks || []).filter(t => t.thisWeek);

            // Formatear como el viejo sistema para compatibilidad
            const commitments = thisWeekTasks.map(t => ({
                id: t.id,
                week: t.weekCommitted,
                category: t.category,
                task: t.type === 'project'
                    ? `📦 ${t.title} → ${t.milestones?.[t.currentMilestone]?.title || 'Próximo paso'}`
                    : t.title,
                committed_date: t.createdAt,
                completed: t.status === 'done',
                completed_date: t.completedAt,
                isProject: t.type === 'project',
                projectId: t.type === 'project' ? t.id : null
            }));

            res.json({
                week: getCurrentWeek(),
                commitments
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PATCH /api/commitments/:id - Redirige a toggle de task
    app.patch('/api/commitments/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { completed } = req.body;
            const data = await readJson('tasks-data.json');

            const task = data.tasks.find(t => t.id === id);
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }

            task.status = completed ? 'done' : 'active';
            task.completedAt = completed ? new Date().toISOString() : null;

            if (completed) {
                data.stats.tasks_completed = (data.stats.tasks_completed || 0) + 1;
            } else {
                data.stats.tasks_completed = Math.max(0, (data.stats.tasks_completed || 0) - 1);
            }

            await writeJson('tasks-data.json', data);

            res.json({
                id: task.id,
                completed: task.status === 'done',
                completed_date: task.completedAt
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/projects - Ahora filtra tasks tipo project
    app.get('/api/projects', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            const projects = (data.tasks || []).filter(t => t.type === 'project');
            res.json(projects);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/projects - Crear proyecto como task
    app.post('/api/projects', async (req, res) => {
        try {
            const { title, description, category, strategy, milestones, saveAsTemplate, templateName } = req.body;
            const data = await readJson('tasks-data.json');

            const projectId = title.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            const newProject = {
                id: projectId,
                title,
                description: description || '',
                type: 'project',
                status: 'active',
                thisWeek: false,
                category: category || 'trabajo',
                strategy: strategy || 'goteo',
                createdAt: new Date().toISOString(),
                completedAt: null,
                milestones: (milestones || []).map((m, i) => ({
                    id: `milestone-${i + 1}`,
                    title: m.title,
                    description: m.description || '',
                    timeEstimate: m.tasks?.[0]?.time_estimate || m.time_estimate || 45,
                    completed: false,
                    completedAt: null
                })),
                currentMilestone: 0
            };

            // Si se solicita guardar como plantilla
            if (saveAsTemplate && milestones && milestones.length > 0) {
                if (!data.templates) {
                    data.templates = [];
                }
                const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                data.templates.push({
                    id: templateId,
                    name: templateName || title,
                    category: category || 'trabajo',
                    strategy: strategy || 'goteo',
                    milestones: milestones.map(m => ({
                        title: m.title,
                        description: m.description || '',
                        time_estimate: m.time_estimate || 45
                    })),
                    createdAt: new Date().toISOString()
                });
            }

            data.tasks.push(newProject);
            await writeJson('tasks-data.json', data);

            res.json(newProject);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PATCH /api/projects/:id/milestones/:milestoneId - Redirige al nuevo endpoint
    app.patch('/api/projects/:id/milestones/:milestoneId', async (req, res) => {
        try {
            const { id, milestoneId } = req.params;
            const { completed } = req.body;
            const data = await readJson('tasks-data.json');

            const project = data.tasks.find(t => t.id === id && t.type === 'project');
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const milestone = project.milestones.find(m => m.id === milestoneId);
            if (!milestone) {
                return res.status(404).json({ error: 'Milestone not found' });
            }

            milestone.completed = completed;
            milestone.completedAt = completed ? new Date().toISOString() : null;

            // Actualizar currentMilestone
            const nextIncomplete = project.milestones.findIndex(m => !m.completed);
            project.currentMilestone = nextIncomplete === -1 ? project.milestones.length : nextIncomplete;

            // Si todos los milestones estan completos, marcar proyecto como done
            if (project.milestones.every(m => m.completed)) {
                project.status = 'done';
                project.completedAt = new Date().toISOString();
            }

            await writeJson('tasks-data.json', data);
            res.json(milestone);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
