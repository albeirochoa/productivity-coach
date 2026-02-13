import { validate, ChatMessageSchema } from '../helpers/validators.js';

export function registerChatRoutes(app, deps) {
    const { readJson, writeJson } = deps;

    // ============================================
    // CHAT (Actualizado para nuevo sistema)
    // ============================================

    app.post('/api/chat', validate(ChatMessageSchema), async (req, res) => {
        try {
            const { message } = req.validatedBody;
            const data = await readJson('tasks-data.json');
            const profile = await readJson('profile.json');

            const lowerMessage = message.toLowerCase();
            let response = '';
            let action = null;

            if (lowerMessage.includes('idea') || lowerMessage.includes('captura') || lowerMessage.includes('anota')) {
                const text = message.replace(/(idea|captura|anota|en):?/i, '').trim();
                const type = lowerMessage.includes('personal') ? 'personal' : 'work';

                data.inbox[type].push({
                    id: `inbox-${type}-${Date.now()}`,
                    text,
                    date: new Date().toISOString()
                });
                await writeJson('tasks-data.json', data);

                response = `¡Anotado en tu Inbox de ${type === 'work' ? 'Trabajo' : 'Personal'}! 📥\n"${text}"`;
                action = 'refresh_inbox';
            }
            else if (lowerMessage.includes('racha') || lowerMessage.includes('stats')) {
                const completedTasks = data.stats?.tasks_completed || 0;
                response = `Has completado **${completedTasks} tareas** en total 🔥. ¡Sigue así!`;
            }
            else if (lowerMessage.includes('semana') || lowerMessage.includes('pendiente')) {
                const pending = (data.tasks || []).filter(t => t.thisWeek && t.status !== 'done');
                if (pending.length > 0) {
                    response = `Tienes **${pending.length} tareas** para esta semana. ¿Quieres procesar algo del inbox?`;
                } else {
                    response = '¡No tienes tareas comprometidas para esta semana! 💯 ¿Añadimos algo del inbox?';
                }
            }
            else {
                response = `Entendido, ${profile.name}. ¿Quieres capturar una idea o revisar tus tareas de la semana?`;
            }

            res.json({ response, action });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
