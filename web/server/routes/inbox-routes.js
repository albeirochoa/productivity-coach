import { validate, InboxItemSchema } from '../helpers/validators.js';

export function registerInboxRoutes(app, deps) {
    const { readJson, writeJson, generateId, getCurrentWeek } = deps;

    // ============================================
    // INBOX API
    // ============================================

    app.get('/api/inbox', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            res.json(data.inbox || { work: [], personal: [] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/inbox', async (req, res) => {
        try {
            const { text, type, dueDate, priority, reminders, category, objectiveId, keyResultId } = req.body;
            const data = await readJson('tasks-data.json');

            if (!data.inbox[type]) {
                data.inbox[type] = [];
            }

            data.inbox[type].push({
                id: `inbox-${type}-${Date.now()}`,
                text,
                category: category || (type === 'work' ? 'trabajo' : 'personal'),
                dueDate: dueDate || null,
                priority: priority || 'normal',
                reminders: reminders || [],
                objectiveId: objectiveId || null,
                keyResultId: keyResultId || null,
                date: new Date().toISOString()
            });

            await writeJson('tasks-data.json', data);
            res.json(data.inbox);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/inbox/:type/:id', async (req, res) => {
        try {
            const { type, id } = req.params;
            const data = await readJson('tasks-data.json');

            if (!data.inbox[type]) {
                return res.status(400).json({ error: 'Invalid type' });
            }

            data.inbox[type] = data.inbox[type].filter(item => item.id !== id);
            await writeJson('tasks-data.json', data);
            res.json(data.inbox);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.patch('/api/inbox/:type/:id', async (req, res) => {
        try {
            const { type, id } = req.params;
            const { text, category, dueDate, priority, objectiveId, keyResultId } = req.body;
            const data = await readJson('tasks-data.json');

            if (!data.inbox[type]) {
                return res.status(400).json({ error: 'Invalid type' });
            }

            const item = data.inbox[type].find(item => item.id === id);
            if (!item) {
                return res.status(404).json({ error: 'Item not found' });
            }

            // Actualizar campos permitidos
            if ('text' in req.body) item.text = text;
            if ('category' in req.body) item.category = category;
            if ('dueDate' in req.body) item.dueDate = dueDate;
            if ('priority' in req.body) item.priority = priority;
            if ('objectiveId' in req.body) item.objectiveId = objectiveId || null;
            if ('keyResultId' in req.body) item.keyResultId = keyResultId || null;
            item.updated_date = new Date().toISOString();

            await writeJson('tasks-data.json', data);
            res.json(item);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/inbox/:type/:id/process - Procesar item de inbox -> task
    app.post('/api/inbox/:type/:id/process', async (req, res) => {
        try {
            const { type, id } = req.params;
            const { taskType, thisWeek, category, objectiveId, keyResultId } = req.body; // taskType: 'simple' | 'project'
            const data = await readJson('tasks-data.json');

            // Encontrar item en inbox
            const item = data.inbox[type]?.find(i => i.id === id);
            if (!item) {
                return res.status(404).json({ error: 'Inbox item not found' });
            }

            const resolvedCategory = category || item.category || (type === 'work' ? 'trabajo' : 'familia');
            const resolvedObjectiveId = objectiveId !== undefined ? (objectiveId || null) : (item.objectiveId || null);
            const resolvedKeyResultId = keyResultId !== undefined ? (keyResultId || null) : (item.keyResultId || null);

            // Crear nueva task
            const newTask = {
                id: generateId(),
                title: item.text,
                type: taskType || 'simple',
                status: 'active',
                thisWeek: thisWeek || false,
                weekCommitted: thisWeek ? getCurrentWeek() : null,
                category: resolvedCategory,
                areaId: resolvedCategory,
                dueDate: item.dueDate || null,
                priority: item.priority || 'normal',
                reminders: item.reminders || [],
                objectiveId: resolvedObjectiveId,
                keyResultId: resolvedKeyResultId,
                createdAt: new Date().toISOString(),
                completedAt: null,
                processedFrom: {
                    inboxId: id,
                    inboxType: type
                }
            };

            // Anadir task
            data.tasks.push(newTask);

            // Eliminar del inbox
            data.inbox[type] = data.inbox[type].filter(i => i.id !== id);

            await writeJson('tasks-data.json', data);

            res.json({
                task: newTask,
                inbox: data.inbox
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
