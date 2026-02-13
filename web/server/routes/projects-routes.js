import { validate, ProjectSchema, MilestoneSchema } from '../helpers/validators.js';

export function registerProjectsRoutes(app, deps) {
    const { readJson, writeJson, AIService } = deps;

    // Helper: Load user templates from tasks-data.json
    const loadUserTemplates = async () => {
        const data = await readJson('tasks-data.json');
        return data.templates || [];
    };

    // ============================================
    // AI/PROJECTS ANALYSIS
    // ============================================

    app.post('/api/projects/analyze', async (req, res) => {
        try {
            const { title, description, category, strategy, templateId, useAI, apiProvider } = req.body;

            if (!title) {
                return res.status(400).json({ error: 'Title is required' });
            }

            // Check if templateId refers to a user-saved template (starts with "template-")
            let analysis;
            if (templateId && templateId.startsWith('template-') && !useAI) {
                const userTemplates = await loadUserTemplates();
                const template = userTemplates.find(t => t.id === templateId);

                if (template) {
                    // Use user template
                    analysis = {
                        generated_milestones: template.milestones.map((m, idx) => ({
                            ...m,
                            order: idx + 1
                        })),
                        template_used: template.name,
                        detected_type: 'user-template',
                        reasoning: `Plantilla "${template.name}" guardada anteriormente. ${template.milestones.length} pasos predefinidos.`,
                        ai_provider: 'user-template',
                        model: 'user-saved'
                    };
                } else {
                    return res.status(404).json({ error: 'Template not found' });
                }
            } else {
                // Use AIService for built-in templates or AI generation
                analysis = await AIService.breakdownTask({
                    title,
                    description: description || '',
                    category: category || 'trabajo',
                    strategy: strategy || 'goteo',
                    templateId: templateId || null,
                    useAI: useAI || false,
                    apiProvider: apiProvider || 'openai'
                });
            }

            res.json(analysis);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/ai/providers', (_req, res) => {
        res.json({
            providers: AIService.getAvailableProviders()
        });
    });

    // ============================================
    // PROJECT HIERARCHY ENDPOINTS
    // ============================================

    // PATCH /api/projects/:id/move - Mover proyecto a otro padre (crear jerarquia)
    app.patch('/api/projects/:id/move', async (req, res) => {
        try {
            const { id } = req.params;
            const { parentId } = req.body; // null = mover a raiz
            const data = await readJson('tasks-data.json');

            const projectIndex = data.tasks.findIndex(t => t.id === id && t.type === 'project');
            if (projectIndex === -1) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Validar que el padre existe (si no es null)
            if (parentId) {
                const parentExists = data.tasks.some(t => t.id === parentId && t.type === 'project');
                if (!parentExists) {
                    return res.status(404).json({ error: 'Parent project not found' });
                }

                // Prevenir ciclos: el padre no puede ser hijo del proyecto actual
                let currentParent = parentId;
                while (currentParent) {
                    if (currentParent === id) {
                        return res.status(400).json({ error: 'Cannot create circular hierarchy' });
                    }
                    const parent = data.tasks.find(t => t.id === currentParent);
                    currentParent = parent?.parentId;
                }
            }

            data.tasks[projectIndex].parentId = parentId;
            await writeJson('tasks-data.json', data);

            res.json(data.tasks[projectIndex]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/projects/:id/milestones - Agregar milestone (tarea) a un proyecto
    app.post('/api/projects/:id/milestones', validate(MilestoneSchema), async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, timeEstimate, sectionId, category, priority, dueDate } = req.validatedBody;
            const data = await readJson('tasks-data.json');

            const project = data.tasks.find(t => t.id === id && t.type === 'project');
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            if (!title || !title.trim()) {
                return res.status(400).json({ error: 'Title is required' });
            }

            const newMilestone = {
                id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                title: title.trim(),
                description: description || '',
                timeEstimate: timeEstimate || 45,
                completed: false,
                completedAt: null,
                sectionId: sectionId || null,
                category: category || null,
                priority: priority || 'normal',
                dueDate: dueDate || null,
            };

            project.milestones.push(newMilestone);
            await writeJson('tasks-data.json', data);

            res.json(newMilestone);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PATCH /api/projects/:projectId/milestones/:milestoneId - Actualizar milestone
    app.patch('/api/projects/:projectId/milestones/:milestoneId', async (req, res) => {
        try {
            const { projectId, milestoneId } = req.params;
            const { title, description, timeEstimate } = req.body;
            const data = await readJson('tasks-data.json');

            const project = data.tasks.find(t => t.id === projectId && t.type === 'project');
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const milestone = project.milestones.find(m => m.id === milestoneId);
            if (!milestone) {
                return res.status(404).json({ error: 'Milestone not found' });
            }

            // Actualizar campos permitidos
            if ('title' in req.body) milestone.title = req.body.title;
            if ('description' in req.body) milestone.description = req.body.description;
            if ('timeEstimate' in req.body) milestone.timeEstimate = req.body.timeEstimate;
            if ('category' in req.body) milestone.category = req.body.category;
            if ('priority' in req.body) milestone.priority = req.body.priority;
            if ('dueDate' in req.body) milestone.dueDate = req.body.dueDate;

            await writeJson('tasks-data.json', data);
            res.json(milestone);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/projects/:id/sections - Agregar seccion a un proyecto
    app.post('/api/projects/:id/sections', async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const data = await readJson('tasks-data.json');

            const projectIndex = data.tasks.findIndex(t => t.id === id && t.type === 'project');
            if (projectIndex === -1) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const project = data.tasks[projectIndex];
            if (!project.sections) {
                project.sections = [];
            }

            const newSection = {
                id: `section-${Date.now()}`,
                name,
                createdAt: new Date().toISOString()
            };

            project.sections.push(newSection);
            await writeJson('tasks-data.json', data);

            res.json(newSection);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE /api/projects/:id/sections/:sectionId - Eliminar seccion
    app.delete('/api/projects/:id/sections/:sectionId', async (req, res) => {
        try {
            const { id, sectionId } = req.params;
            const data = await readJson('tasks-data.json');

            const projectIndex = data.tasks.findIndex(t => t.id === id && t.type === 'project');
            if (projectIndex === -1) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const project = data.tasks[projectIndex];
            project.sections = (project.sections || []).filter(s => s.id !== sectionId);

            // Limpiar milestones que estaban en esta seccion
            if (project.milestones) {
                project.milestones.forEach(m => {
                    if (m.sectionId === sectionId) {
                        m.sectionId = null;
                    }
                });
            }

            await writeJson('tasks-data.json', data);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/projects/hierarchy - Obtener proyectos en estructura de arbol
    app.get('/api/projects/hierarchy', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            const projects = data.tasks.filter(t => t.type === 'project');

            // Construir arbol
            const buildTree = (parentId = null) => {
                return projects
                    .filter(p => p.parentId === parentId)
                    .map(p => ({
                        ...p,
                        children: buildTree(p.id)
                    }));
            };

            const hierarchy = buildTree();
            res.json(hierarchy);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
