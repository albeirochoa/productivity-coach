import { validate, AreaSchema } from '../helpers/validators.js';

export function registerAreasRoutes(app, deps) {
    const { readJson, writeJson } = deps;

    // ============================================
    // LIFE AREAS API
    // ============================================

    // GET /api/areas - Obtener todas las áreas de vida
    app.get('/api/areas', async (req, res) => {
        try {
            const data = await readJson('profile.json');
            const lifeAreas = data.life_areas || {};

            // Convertir objeto a array con IDs
            const areasArray = Object.entries(lifeAreas).map(([id, area]) => ({
                id,
                ...area,
                status: area.status || 'active'
            }));

            res.json(areasArray);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/areas/:areaId - Obtener una área específica
    app.get('/api/areas/:areaId', async (req, res) => {
        try {
            const { areaId } = req.params;
            const data = await readJson('profile.json');

            if (!data.life_areas || !data.life_areas[areaId]) {
                return res.status(404).json({ error: 'Área no encontrada' });
            }

            res.json({ id: areaId, ...data.life_areas[areaId] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/areas - Crear nueva área
    app.post('/api/areas', validate(AreaSchema), async (req, res) => {
        try {
            const { name, description, priority, current_focus, status, color, icon } = req.body;
            const data = await readJson('profile.json');

            if (!data.life_areas) {
                data.life_areas = {};
            }

            // Generar ID único basado en el nombre (slug)
            const areaId = name.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remover acentos
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            // Verificar si ya existe
            if (data.life_areas[areaId]) {
                return res.status(400).json({ error: 'Ya existe un área con ese nombre' });
            }

            // Crear nueva área
            data.life_areas[areaId] = {
                name,
                description: description || '',
                priority: priority || 'medium',
                current_focus: current_focus || '',
                status: status || 'active',
                color: color || 'blue',
                icon: icon || 'Circle',
                created_at: new Date().toISOString()
            };

            await writeJson('profile.json', data);

            res.status(201).json({ id: areaId, ...data.life_areas[areaId] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PATCH /api/areas/:areaId - Actualizar área existente
    app.patch('/api/areas/:areaId', validate(AreaSchema.partial()), async (req, res) => {
        try {
            const { areaId } = req.params;
            const updates = req.body;
            const data = await readJson('profile.json');

            if (!data.life_areas || !data.life_areas[areaId]) {
                return res.status(404).json({ error: 'Área no encontrada' });
            }

            // Actualizar campos permitidos
            const allowedFields = ['name', 'description', 'priority', 'current_focus', 'status', 'color', 'icon'];
            allowedFields.forEach(field => {
                if (field in updates) {
                    data.life_areas[areaId][field] = updates[field];
                }
            });

            data.life_areas[areaId].updated_at = new Date().toISOString();

            await writeJson('profile.json', data);

            res.json({ id: areaId, ...data.life_areas[areaId] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE /api/areas/:areaId - Archivar área (soft delete)
    app.delete('/api/areas/:areaId', async (req, res) => {
        try {
            const { areaId } = req.params;
            const data = await readJson('profile.json');

            if (!data.life_areas || !data.life_areas[areaId]) {
                return res.status(404).json({ error: 'Área no encontrada' });
            }

            // Soft delete: cambiar status a archived
            data.life_areas[areaId].status = 'archived';
            data.life_areas[areaId].archived_at = new Date().toISOString();

            await writeJson('profile.json', data);

            res.json({ message: 'Área archivada exitosamente', id: areaId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/areas/:areaId/stats - Obtener estadísticas de un área
    app.get('/api/areas/:areaId/stats', async (req, res) => {
        try {
            const { areaId } = req.params;
            const profileData = await readJson('profile.json');
            const tasksData = await readJson('tasks-data.json');

            if (!profileData.life_areas || !profileData.life_areas[areaId]) {
                return res.status(404).json({ error: 'Área no encontrada' });
            }

            // Contar tareas y proyectos vinculados a esta área
            const tasks = tasksData.tasks || [];
            const areaTasks = tasks.filter(t => t.category === areaId);
            const activeTasks = areaTasks.filter(t => t.status === 'active');
            const completedTasks = areaTasks.filter(t => t.status === 'done');
            const projects = areaTasks.filter(t => t.type === 'project');
            const activeProjects = projects.filter(p => p.status === 'active');

            res.json({
                areaId,
                totalTasks: areaTasks.length,
                activeTasks: activeTasks.length,
                completedTasks: completedTasks.length,
                totalProjects: projects.length,
                activeProjects: activeProjects.length,
                completionRate: areaTasks.length > 0
                    ? Math.round((completedTasks.length / areaTasks.length) * 100)
                    : 0
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
