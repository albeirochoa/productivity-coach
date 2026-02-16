
import logger from './logger.js';
import { createFromContentTemplate, CONTENT_TEMPLATES, LEARNING_TEMPLATES } from './content-templates.js';
import { interceptTaskAction, interceptTaskMove } from './coach-task-interceptor.js';
import { protectDeepWork } from './coach-deep-work.js';
import {
    rankNextBestActions,
    generateWeeklyPlanPack,
    buildExplainabilityPayload,
} from './decision-engine-v2.js';
import {
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
    formatMinutes,
} from './capacity-calculator.js';
import { fetchRiskSignals, buildCapacityConfig } from './coach-rules-engine.js';

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function makeId(prefix, generateId) {
    if (typeof generateId === 'function') {
        const raw = generateId();
        if (raw && !raw.startsWith(`${prefix}-`)) {
            return `${prefix}-${raw}`;
        }
        return raw;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function getDb(deps) {
    const db = deps.getDbManager?.();
    if (!db) {
        throw new Error('Database manager not available');
    }
    if (typeof db.initialize === 'function') {
        await db.initialize();
    }
    return db;
}

function calculateDuration(startTime, endTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
}

async function validateWorkingHours(date, startTime, endTime, deps) {
    try {
        const profile = await deps.readJson('profile.json');
        const capacity = profile.capacity || {};
        const workHoursPerDay = capacity.work_hours_per_day || 8;
        const workStart = 9 * 60;
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
        return { valid: true };
    }
}

function detectOverlap(date, startTime, endTime, deps, excludeBlockId = null) {
    if (!deps.readCalendarBlocks) {
        return { overlap: false };
    }
    const existingBlocks = deps.readCalendarBlocks({ date });
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

function buildNoAction(summary, reason) {
    return {
        preview: {
            changes: [],
            summary,
            reason: reason || summary,
            noAction: true,
        },
        requiresConfirmation: false,
    };
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[?!.,;:]/g, '')
        .trim();
}

function findTaskByTitle(data, title) {
    const needle = normalizeText(title);
    if (!needle) return { matches: [] };
    const matches = (data.tasks || []).filter(t => normalizeText(t.title) === needle);
    if (matches.length > 0) return { matches };
    const partial = (data.tasks || []).filter(t => normalizeText(t.title).includes(needle));
    return { matches: partial };
}

function inferInboxType({ type, areaId, category }) {
    if (type === 'work' || type === 'personal') return type;
    const label = (areaId || category || '').toLowerCase();
    if (!label) return 'personal';
    if (['personal', 'familia', 'salud', 'aprender'].some(k => label.includes(k))) return 'personal';
    return 'work';
}

function inferInboxTypeFromId(inboxId) {
    if (!inboxId) return null;
    if (String(inboxId).includes('inbox-personal')) return 'personal';
    if (String(inboxId).includes('inbox-work')) return 'work';
    return null;
}

function mapTaskUpdates(updates, task, data, getCurrentWeek) {
    if ('targetList' in updates) {
        const target = String(updates.targetList || '').toLowerCase();
        if (target === 'today' || target === 'hoy') {
            task.thisWeek = false;
            task.weekCommitted = null;
            task.dueDate = new Date().toISOString().split('T')[0];
        } else if (target === 'week' || target === 'esta semana') {
            task.thisWeek = true;
            task.weekCommitted = getCurrentWeek();
        } else if (target === 'someday' || target === 'algundia' || target === 'algún dia' || target === 'algun dia') {
            task.thisWeek = false;
            task.weekCommitted = null;
            task.dueDate = null;
        }
    }
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
            if (data?.stats) {
                data.stats.tasks_completed = (data.stats.tasks_completed || 0) + 1;
            }
        }
    }
    if ('title' in updates) task.title = updates.title;
    if ('description' in updates) task.description = updates.description;
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
    if ('strategy' in updates) task.strategy = updates.strategy;
    if ('milestones' in updates && Array.isArray(updates.milestones)) {
        task.milestones = updates.milestones;
    }
    if ('status' in updates) task.status = updates.status;
    return task;
}

function buildTaskPayload(args, deps) {
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
        objectiveId,
        keyResultId,
        parentId,
        sections,
    } = args;

    const normalizedAreaId = areaId || category || 'trabajo';
    const isProject = type === 'project';
    const baseId = isProject ? slugify(title) : deps.generateId?.();
    const taskId = baseId || makeId('task', deps.generateId);

    const newTask = {
        id: taskId,
        title,
        type: type || 'simple',
        status: 'active',
        thisWeek: !!thisWeek,
        weekCommitted: thisWeek ? deps.getCurrentWeek() : null,
        category: normalizedAreaId,
        areaId: normalizedAreaId,
        dueDate: dueDate || null,
        priority: priority || 'normal',
        reminders: reminders || [],
        objectiveId: objectiveId || null,
        keyResultId: keyResultId || null,
        createdAt: new Date().toISOString(),
        completedAt: null,
    };

    if (isProject) {
        newTask.description = description || '';
        newTask.strategy = strategy || 'goteo';
        newTask.parentId = parentId || null;
        newTask.sections = sections || [];
        newTask.milestones = (milestones || []).map((m, idx) => ({
            id: m.id || `milestone-${idx + 1}`,
            title: m.title,
            description: m.description || '',
            timeEstimate: m.time_estimate || m.timeEstimate || 45,
            completed: false,
            completedAt: null,
            sectionId: m.sectionId || null,
            category: m.category || newTask.category,
        }));
        newTask.currentMilestone = 0;
        newTask.committedMilestones = [];
        newTask.committedMilestone = null;
    }

    return newTask;
}
export async function buildMutationPreview(toolName, args, deps) {
    switch (toolName) {
        case 'create_task':
        case 'create_project': {
            if (!args?.title) {
                return buildNoAction('Falta el titulo para crear la tarea/proyecto.');
            }
            const type = toolName === 'create_project' ? 'project' : (args.type || 'simple');
            const newTask = buildTaskPayload({ ...args, type }, deps);
            return {
                preview: {
                    changes: [{ taskId: newTask.id, title: newTask.title, type: newTask.type }],
                    summary: `Crear ${newTask.type === 'project' ? 'proyecto' : 'tarea'}: "${newTask.title}"`,
                    impact: { tasksCreated: 1 },
                    reason: 'Creacion solicitada por el usuario.',
                    payload: { task: newTask },
                },
                requiresConfirmation: true,
            };
        }
        case 'update_task':
        case 'update_project': {
            const taskId = args?.taskId || args?.projectId;
            const taskTitle = args?.taskTitle || args?.projectTitle;
            const data = await deps.readJson('tasks-data.json');
            let task = taskId ? data.tasks.find(t => t.id === taskId) : null;
            if (!task && taskTitle) {
                const match = findTaskByTitle(data, taskTitle);
                if (match.matches.length === 1) {
                    task = match.matches[0];
                } else if (match.matches.length > 1) {
                    const options = match.matches.slice(0, 5).map(t => `${t.title} (${t.id})`).join(', ');
                    return buildNoAction(`Encontre varias coincidencias: ${options}. Indica el id exacto.`);
                }
            }
            if (!task && taskId && !taskTitle) {
                const match = findTaskByTitle(data, taskId);
                if (match.matches.length === 1) {
                    task = match.matches[0];
                } else if (match.matches.length > 1) {
                    const options = match.matches.slice(0, 5).map(t => `${t.title} (${t.id})`).join(', ');
                    return buildNoAction(`Encontre varias coincidencias: ${options}. Indica el id exacto.`);
                }
            }
            if (!task) {
                return buildNoAction('No encontre la tarea/proyecto. Usa el id exacto o el nombre completo.');
            }
            if (toolName === 'update_project' && task.type !== 'project') {
                return buildNoAction(`El id ${task.id} no es un proyecto.`);
            }
            if (!task) {
                return buildNoAction('No encontre la tarea/proyecto.');
            }
            const updates = { ...args };
            delete updates.taskId;
            delete updates.projectId;
            delete updates.taskTitle;
            delete updates.projectTitle;
            if (Object.keys(updates).length === 0) {
                return buildNoAction('No hay cambios que aplicar.');
            }
            return {
                preview: {
                    changes: [{ taskId: task.id, title: task.title, updates }],
                    summary: `Actualizar "${task.title}"`,
                    impact: { tasksUpdated: 1 },
                    reason: 'Actualizacion solicitada por el usuario.',
                    payload: { taskId: task.id, updates },
                },
                requiresConfirmation: true,
            };
        }
        case 'delete_task':
        case 'delete_project': {
            const taskId = args?.taskId || args?.projectId;
            const taskTitle = args?.taskTitle || args?.projectTitle || args?.title;
            const data = await deps.readJson('tasks-data.json');
            let task = taskId ? data.tasks.find(t => t.id === taskId) : null;
            if (!task && taskTitle) {
                const match = findTaskByTitle(data, taskTitle);
                if (match.matches.length === 1) {
                    task = match.matches[0];
                } else if (match.matches.length > 1) {
                    const options = match.matches.slice(0, 5).map(t => `${t.title} (${t.id})`).join(', ');
                    return buildNoAction(`Encontre varias coincidencias: ${options}. Indica el id exacto.`);
                }
            }
            if (!task && taskId && !taskTitle) {
                const match = findTaskByTitle(data, taskId);
                if (match.matches.length === 1) {
                    task = match.matches[0];
                } else if (match.matches.length > 1) {
                    const options = match.matches.slice(0, 5).map(t => `${t.title} (${t.id})`).join(', ');
                    return buildNoAction(`Encontre varias coincidencias: ${options}. Indica el id exacto.`);
                }
            }
            if (!task) {
                return buildNoAction('No encontre la tarea/proyecto. Usa el id exacto o el nombre completo.');
            }
            if (toolName === 'delete_project' && task.type !== 'project') {
                return buildNoAction(`El id ${task.id} no es un proyecto.`);
            }
            if (!task) {
                return buildNoAction('No encontre la tarea/proyecto.');
            }
            return {
                preview: {
                    changes: [{ taskId: task.id, title: task.title, action: 'delete' }],
                    summary: `Eliminar "${task.title}"`,
                    impact: { tasksDeleted: 1 },
                    reason: 'Eliminacion solicitada por el usuario.',
                    payload: { taskId: task.id },
                },
                requiresConfirmation: true,
            };
        }
        case 'create_inbox_item': {
            const { text, type } = args || {};
            if (!text) {
                return buildNoAction('Falta text para crear item en inbox.');
            }
            const resolvedType = inferInboxType({ type, areaId: args?.areaId, category: args?.category });
            const resolvedCategory = args?.areaId || args?.category || (resolvedType === 'work' ? 'trabajo' : 'personal');
            const item = {
                id: `inbox-${resolvedType}-${Date.now()}`,
                text,
                category: resolvedCategory,
                areaId: resolvedCategory,
                dueDate: args.dueDate || null,
                priority: args.priority || 'normal',
                reminders: args.reminders || [],
                objectiveId: args.objectiveId || null,
                keyResultId: args.keyResultId || null,
                date: new Date().toISOString(),
            };
            return {
                preview: {
                    changes: [{ inboxId: item.id, text: item.text, type: resolvedType, areaId: resolvedCategory }],
                    summary: `Capturar en inbox (${resolvedType}): "${item.text}"`,
                    impact: { inboxCreated: 1 },
                    reason: 'Captura solicitada por el usuario.',
                    payload: { type: resolvedType, item },
                },
                requiresConfirmation: true,
            };
        }
        case 'update_inbox_item': {
            const { inboxId, type } = args || {};
            const resolvedType = type || inferInboxTypeFromId(inboxId);
            if (!inboxId || !resolvedType) {
                return buildNoAction('Falta inboxId (y/o type) para actualizar inbox.');
            }
            const data = await deps.readJson('tasks-data.json');
            const item = data.inbox?.[resolvedType]?.find(i => i.id === inboxId);
            if (!item) {
                return buildNoAction(`No encontre el item ${inboxId} en inbox ${resolvedType}.`);
            }
            const updates = { ...args };
            delete updates.inboxId;
            delete updates.type;
            if (updates.areaId && !updates.category) {
                updates.category = updates.areaId;
            }
            if (Object.keys(updates).length === 0) {
                return buildNoAction('No hay cambios que aplicar.');
            }
            return {
                preview: {
                    changes: [{ inboxId, text: item.text, updates }],
                    summary: `Actualizar inbox: "${item.text}"`,
                    impact: { inboxUpdated: 1 },
                    reason: 'Actualizacion solicitada por el usuario.',
                    payload: { inboxId, type: resolvedType, updates },
                },
                requiresConfirmation: true,
            };
        }
        case 'delete_inbox_item': {
            const { inboxId, type } = args || {};
            const resolvedType = type || inferInboxTypeFromId(inboxId);
            if (!inboxId || !resolvedType) {
                return buildNoAction('Falta inboxId (y/o type) para eliminar inbox.');
            }
            const data = await deps.readJson('tasks-data.json');
            const item = data.inbox?.[resolvedType]?.find(i => i.id === inboxId);
            if (!item) {
                return buildNoAction(`No encontre el item ${inboxId} en inbox ${resolvedType}.`);
            }
            return {
                preview: {
                    changes: [{ inboxId, text: item.text, action: 'delete' }],
                    summary: `Eliminar item de inbox: "${item.text}"`,
                    impact: { inboxDeleted: 1 },
                    reason: 'Eliminacion solicitada por el usuario.',
                    payload: { inboxId, type: resolvedType },
                },
                requiresConfirmation: true,
            };
        }
        case 'process_inbox_item': {
            const { inboxId, type } = args || {};
            const resolvedType = type || inferInboxTypeFromId(inboxId);
            if (!inboxId || !resolvedType) {
                return buildNoAction('Falta inboxId (y/o type) para procesar.');
            }
            const data = await deps.readJson('tasks-data.json');
            const item = data.inbox?.[resolvedType]?.find(i => i.id === inboxId);
            if (!item) {
                return buildNoAction(`No encontre el item ${inboxId} en inbox ${resolvedType}.`);
            }
            const taskType = args.taskType || 'simple';
            const resolvedCategory = args.category || item.category || (resolvedType === 'work' ? 'trabajo' : 'familia');
            const newTask = buildTaskPayload({
                title: item.text,
                type: taskType,
                category: resolvedCategory,
                thisWeek: !!args.thisWeek,
                dueDate: item.dueDate || null,
                priority: item.priority || 'normal',
                objectiveId: args.objectiveId ?? item.objectiveId ?? null,
                keyResultId: args.keyResultId ?? item.keyResultId ?? null,
            }, deps);
            newTask.processedFrom = { inboxId, inboxType: resolvedType };
            return {
                preview: {
                    changes: [{ inboxId, taskId: newTask.id, title: newTask.title, action: 'process' }],
                    summary: `Procesar inbox → tarea: "${newTask.title}"`,
                    impact: { tasksCreated: 1, inboxDeleted: 1 },
                    reason: 'Procesamiento solicitado por el usuario.',
                    payload: { inboxId, type: resolvedType, task: newTask },
                },
                requiresConfirmation: true,
            };
        }
        case 'create_area': {
            if (!args?.name) {
                return buildNoAction('Falta name para crear area.');
            }
            const areaId = slugify(args.name);
            return {
                preview: {
                    changes: [{ areaId, name: args.name }],
                    summary: `Crear area: "${args.name}"`,
                    impact: { areasCreated: 1 },
                    reason: 'Creacion solicitada por el usuario.',
                    payload: { areaId, data: args },
                },
                requiresConfirmation: true,
            };
        }
        case 'update_area': {
            const areaId = args?.areaId;
            if (!areaId) {
                return buildNoAction('Falta areaId para actualizar.');
            }
            return {
                preview: {
                    changes: [{ areaId, updates: args }],
                    summary: `Actualizar area: ${areaId}`,
                    impact: { areasUpdated: 1 },
                    reason: 'Actualizacion solicitada por el usuario.',
                    payload: { areaId, updates: args },
                },
                requiresConfirmation: true,
            };
        }
        case 'archive_area': {
            const areaId = args?.areaId;
            if (!areaId) {
                return buildNoAction('Falta areaId para archivar.');
            }
            return {
                preview: {
                    changes: [{ areaId, action: 'archive' }],
                    summary: `Archivar area: ${areaId}`,
                    impact: { areasArchived: 1 },
                    reason: 'Archivado solicitado por el usuario.',
                    payload: { areaId },
                },
                requiresConfirmation: true,
            };
        }
        case 'create_objective': {
            if (!args?.title || !args?.period) {
                return buildNoAction('Falta title o period para crear objetivo.');
            }
            const objectiveId = makeId('obj', deps.generateId);
            return {
                preview: {
                    changes: [{ objectiveId, title: args.title }],
                    summary: `Crear objetivo: "${args.title}"`,
                    impact: { objectivesCreated: 1 },
                    reason: 'Creacion solicitada por el usuario.',
                    payload: { objectiveId, data: args },
                },
                requiresConfirmation: true,
            };
        }
        case 'update_objective': {
            const objectiveId = args?.objectiveId;
            if (!objectiveId) {
                return buildNoAction('Falta objectiveId para actualizar.');
            }
            return {
                preview: {
                    changes: [{ objectiveId, updates: args }],
                    summary: `Actualizar objetivo: ${objectiveId}`,
                    impact: { objectivesUpdated: 1 },
                    reason: 'Actualizacion solicitada por el usuario.',
                    payload: { objectiveId, updates: args },
                },
                requiresConfirmation: true,
            };
        }
        case 'delete_objective': {
            const objectiveId = args?.objectiveId;
            if (!objectiveId) {
                return buildNoAction('Falta objectiveId para eliminar.');
            }
            return {
                preview: {
                    changes: [{ objectiveId, action: 'delete' }],
                    summary: `Eliminar objetivo: ${objectiveId}`,
                    impact: { objectivesDeleted: 1 },
                    reason: 'Eliminacion solicitada por el usuario.',
                    payload: { objectiveId },
                },
                requiresConfirmation: true,
            };
        }
        case 'create_key_result': {
            const { objectiveId, title, targetValue } = args || {};
            if (!objectiveId || !title || targetValue === undefined) {
                return buildNoAction('Falta objectiveId, title o targetValue para crear KR.');
            }
            const keyResultId = makeId('kr', deps.generateId);
            return {
                preview: {
                    changes: [{ keyResultId, title }],
                    summary: `Crear KR: "${title}"`,
                    impact: { keyResultsCreated: 1 },
                    reason: 'Creacion solicitada por el usuario.',
                    payload: { keyResultId, data: args },
                },
                requiresConfirmation: true,
            };
        }
        case 'update_key_result':
        case 'update_key_result_progress': {
            const keyResultId = args?.keyResultId;
            if (!keyResultId) {
                return buildNoAction('Falta keyResultId para actualizar KR.');
            }
            return {
                preview: {
                    changes: [{ keyResultId, updates: args }],
                    summary: `Actualizar KR: ${keyResultId}`,
                    impact: { keyResultsUpdated: 1 },
                    reason: 'Actualizacion solicitada por el usuario.',
                    payload: { keyResultId, updates: args, isProgressUpdate: toolName === 'update_key_result_progress' },
                },
                requiresConfirmation: true,
            };
        }
        case 'delete_key_result': {
            const keyResultId = args?.keyResultId;
            if (!keyResultId) {
                return buildNoAction('Falta keyResultId para eliminar KR.');
            }
            return {
                preview: {
                    changes: [{ keyResultId, action: 'delete' }],
                    summary: `Eliminar KR: ${keyResultId}`,
                    impact: { keyResultsDeleted: 1 },
                    reason: 'Eliminacion solicitada por el usuario.',
                    payload: { keyResultId },
                },
                requiresConfirmation: true,
            };
        }
        case 'create_calendar_block': {
            const { taskId, date, startTime, endTime } = args || {};
            if (!taskId || !date || !startTime || !endTime) {
                return buildNoAction('Falta taskId, date, startTime o endTime para crear bloque.');
            }
            const durationMinutes = calculateDuration(startTime, endTime);
            if (durationMinutes <= 0) {
                return buildNoAction('La hora de fin debe ser posterior a la hora de inicio.');
            }
            const workingHoursCheck = await validateWorkingHours(date, startTime, endTime, deps);
            if (!workingHoursCheck.valid) {
                return buildNoAction(workingHoursCheck.message);
            }
            const overlapCheck = detectOverlap(date, startTime, endTime, deps);
            if (overlapCheck.overlap) {
                return buildNoAction(overlapCheck.message);
            }
            return {
                preview: {
                    changes: [{ taskId, date, startTime, endTime, action: 'create_block' }],
                    summary: `Crear bloque ${date} ${startTime}-${endTime}`,
                    impact: { blocksCreated: 1 },
                    reason: 'Creacion solicitada por el usuario.',
                    payload: { taskId, date, startTime, endTime, durationMinutes, status: args.status, notes: args.notes },
                },
                requiresConfirmation: true,
            };
        }
        case 'update_calendar_block': {
            const { blockId } = args || {};
            if (!blockId) {
                return buildNoAction('Falta blockId para actualizar bloque.');
            }
            return {
                preview: {
                    changes: [{ blockId, updates: args }],
                    summary: `Actualizar bloque ${blockId}`,
                    impact: { blocksUpdated: 1 },
                    reason: 'Actualizacion solicitada por el usuario.',
                    payload: { blockId, updates: args },
                },
                requiresConfirmation: true,
            };
        }
        case 'delete_calendar_block': {
            const { blockId } = args || {};
            if (!blockId) {
                return buildNoAction('Falta blockId para eliminar bloque.');
            }
            return {
                preview: {
                    changes: [{ blockId, action: 'delete' }],
                    summary: `Eliminar bloque ${blockId}`,
                    impact: { blocksDeleted: 1 },
                    reason: 'Eliminacion solicitada por el usuario.',
                    payload: { blockId },
                },
                requiresConfirmation: true,
            };
        }
        case 'create_content_project': {
            const { templateId, title } = args || {};
            if (!templateId || !title) {
                return buildNoAction('Falta templateId o title para crear proyecto de contenido.');
            }
            if (!CONTENT_TEMPLATES[templateId]) {
                return buildNoAction('Template de contenido invalido.');
            }
            return {
                preview: {
                    changes: [{ templateId, title, action: 'create_content_project' }],
                    summary: `Crear proyecto de contenido: "${title}"`,
                    impact: { projectsCreated: 1 },
                    reason: 'Proyecto de contenido solicitado por el usuario.',
                    payload: { templateId, title },
                },
                requiresConfirmation: true,
            };
        }
        case 'create_learning_structure': {
            const { skill, period, templateId, moduleCount, moduleNames, currentProgress, strategy, areaId } = args || {};
            if (!skill || !period) {
                return buildNoAction('Falta skill o period para crear estructura de aprendizaje.');
            }

            const template = LEARNING_TEMPLATES[templateId] || LEARNING_TEMPLATES['aprender:skill'];
            const normalizedArea = areaId || 'aprender';

            // 1. Build Objective
            const objectiveId = makeId('obj', deps.generateId);
            const objectiveData = {
                title: `Aprender ${skill}`,
                period,
                status: 'active',
                areaId: normalizedArea,
            };

            // 2. Build Key Results from template
            const keyResults = (template.defaultKRs || []).map((krTemplate, idx) => {
                const krId = makeId('kr', deps.generateId);
                return {
                    id: krId,
                    objectiveId,
                    title: krTemplate.titleTemplate
                        .replace('{skill}', skill)
                        .replace('{practiceCount}', String(krTemplate.targetValue))
                        .replace('{docCount}', String(krTemplate.targetValue)),
                    metricType: krTemplate.metricType,
                    startValue: krTemplate.startValue,
                    currentValue: idx === 0 ? (currentProgress || 0) : 0,
                    targetValue: krTemplate.targetValue,
                    unit: krTemplate.unit,
                    status: 'active',
                };
            });

            // 3. Build Project with Milestones
            const milestones = templateId === 'aprender:curso' && moduleCount
                ? template.generateMilestones(moduleCount, moduleNames)
                : (template.defaultMilestones || []);

            const projectTitle = templateId === 'aprender:curso'
                ? `Curso de ${skill}`
                : `Aprender ${skill}`;

            const newTask = buildTaskPayload({
                title: projectTitle,
                type: 'project',
                category: normalizedArea,
                areaId: normalizedArea,
                strategy: strategy || 'goteo',
                objectiveId,
                keyResultId: keyResults[0]?.id || null,
                milestones,
            }, deps);

            // 4. Build comprehensive preview
            const totalMinutes = milestones.reduce((sum, m) => sum + (m.timeEstimate || 120), 0);
            const totalHours = (totalMinutes / 60).toFixed(1);

            return {
                preview: {
                    changes: [
                        { type: 'objective', objectiveId, title: objectiveData.title },
                        ...keyResults.map(kr => ({ type: 'key_result', keyResultId: kr.id, title: kr.title })),
                        { type: 'project', taskId: newTask.id, title: newTask.title, milestoneCount: milestones.length },
                    ],
                    summary: `Crear estructura de aprendizaje: "${skill}"\n` +
                        `- 1 Objetivo (${period})\n` +
                        `- ${keyResults.length} Key Results\n` +
                        `- 1 Proyecto con ${milestones.length} milestones (${totalHours}h estimadas)`,
                    impact: {
                        objectivesCreated: 1,
                        keyResultsCreated: keyResults.length,
                        tasksCreated: 1,
                        totalEstimatedHours: parseFloat(totalHours),
                    },
                    reason: `Estructura de aprendizaje para "${skill}" creada desde template ${templateId}.`,
                    payload: {
                        objective: { objectiveId, data: objectiveData },
                        keyResults,
                        task: newTask,
                    },
                },
                requiresConfirmation: true,
            };
        }
        case 'smart_process_inbox': {
            const { inboxId, text, type, areaId, objectiveId, keyResultId, date, startTime } = args || {};
            if (!inboxId && !text) {
                return buildNoAction('Falta inboxId o text para procesar inbox.');
            }

            const data = await deps.readJson('tasks-data.json');
            const profile = await deps.readJson('profile.json');

            // Resolve inbox item
            let inboxItem = null;
            if (inboxId) {
                const resolvedType = type || inferInboxTypeFromId(inboxId);
                const inbox = data.inbox || { work: [], personal: [] };
                const items = inbox[resolvedType] || [];
                inboxItem = items.find(item => item.id === inboxId);
            }

            if (!inboxItem && !text) {
                return buildNoAction('No encontré el item en inbox.');
            }

            const itemText = inboxItem?.text || text;
            const normalizedAreaId = areaId || inboxItem?.areaId || inboxItem?.category || 'trabajo';

            // Build task
            const newTask = buildTaskPayload({
                title: itemText,
                type: 'simple',
                category: normalizedAreaId,
                areaId: normalizedAreaId,
                thisWeek: true,
                objectiveId: objectiveId || inboxItem?.objectiveId || null,
                keyResultId: keyResultId || inboxItem?.keyResultId || null,
            }, deps);

            const changes = [
                { type: 'inbox_delete', inboxId: inboxItem?.id || 'new', text: itemText },
                { type: 'task_create', taskId: newTask.id, title: newTask.title },
            ];

            // Optionally create calendar block if date/time provided
            let block = null;
            if (date && startTime && deps.createCalendarBlock) {
                const endTime = `${String(Number(startTime.split(':')[0]) + 1).padStart(2, '0')}:${startTime.split(':')[1]}`;
                block = {
                    id: `block-${Date.now()}`,
                    taskId: newTask.id,
                    date,
                    startTime,
                    endTime,
                    durationMinutes: 60,
                    status: 'scheduled',
                };
                changes.push({ type: 'calendar_block_create', blockId: block.id, date, startTime });
            }

            return {
                preview: {
                    changes,
                    summary: `Procesar inbox → tarea + ${block ? 'agendada' : 'comprometida'}\n` +
                        `- "${itemText}"\n` +
                        `- Vinculada a: ${objectiveId || keyResultId || normalizedAreaId}\n` +
                        (block ? `- Agendada: ${date} ${startTime}` : ''),
                    impact: { inboxProcessed: 1, tasksCreated: 1, blocksCreated: block ? 1 : 0 },
                    reason: 'Procesar inbox item y vincular a objetivo en un solo paso.',
                    payload: { inboxId: inboxItem?.id, inboxType: inferInboxTypeFromId(inboxItem?.id), task: newTask, block },
                },
                requiresConfirmation: true,
            };
        }
        case 'plan_and_schedule_week': {
            const { commitCount } = args || {};
            const data = await deps.readJson('tasks-data.json');
            const profile = await deps.readJson('profile.json');
            const config = buildCapacityConfig(profile.capacity || {});

            let db;
            try {
                db = await getDb(deps);
            } catch {
                db = null;
            }
            const riskSignals = db ? fetchRiskSignals(db) : { risks: [], focusWeek: [] };

            const capacity = calculateWeeklyCapacity(config);
            const load = calculateWeeklyLoad(data.tasks);

            // Use decision engine v2 to get ranked actions
            const planPack = generateWeeklyPlanPack(data.tasks, config, riskSignals);

            // Limit to commitCount or capacity
            const targetCount = commitCount || Math.min(5, planPack.mustDo.length + planPack.shouldDo.length);
            const toCommit = [...planPack.mustDo, ...planPack.shouldDo].slice(0, targetCount);

            const changes = toCommit.map(action => ({
                type: 'task_commit',
                taskId: action.taskId,
                title: action.title,
                estimatedMinutes: action.estimatedMinutes,
                explainability: buildExplainabilityPayload(action, { capacity, load, riskSignals }),
            }));

            const totalMinutes = toCommit.reduce((sum, a) => sum + a.estimatedMinutes, 0);
            const totalAfter = load + totalMinutes;
            const remainingAfter = capacity.usable - totalAfter;

            return {
                preview: {
                    changes,
                    summary: `Plan semanal: ${toCommit.length} tarea(s) comprometidas\n` +
                        `- Must-do: ${planPack.mustDo.length}\n` +
                        `- Should-do: ${planPack.shouldDo.length}\n` +
                        `- Carga total: ${formatMinutes(totalAfter)} / ${formatMinutes(capacity.usable)}\n` +
                        `- Capacidad restante: ${formatMinutes(remainingAfter)}`,
                    impact: {
                        tasksCommitted: toCommit.length,
                        totalMinutes,
                        capacityUsedPct: Math.round((totalAfter / capacity.usable) * 100),
                    },
                    reason: 'Plan generado con Decision Engine v2: ranking por deadline, KR risk, y capacidad.',
                    payload: { tasksToCommit: toCommit.map(a => a.taskId), planPack },
                },
                requiresConfirmation: true,
            };
        }
        case 'batch_reprioritize': {
            const data = await deps.readJson('tasks-data.json');
            const profile = await deps.readJson('profile.json');
            const config = buildCapacityConfig(profile.capacity || {});

            const capacity = calculateWeeklyCapacity(config);
            const load = calculateWeeklyLoad(data.tasks);
            const excess = load - capacity.usable;

            if (excess <= 0) {
                return buildNoAction('No hay sobrecarga detectada. La carga semanal está dentro de la capacidad.');
            }

            let db;
            try {
                db = await getDb(deps);
            } catch {
                db = null;
            }
            const riskSignals = db ? fetchRiskSignals(db) : { risks: [], focusWeek: [] };

            // Identify tasks to defer (lowest score, no KR risk, no deadline)
            const committed = data.tasks.filter(t => t.thisWeek && t.status === 'active');
            const ranked = rankNextBestActions(committed, { capacity, load: 0, riskSignals });

            // Sort by score ascending (lowest first = defer candidates)
            const deferCandidates = ranked
                .sort((a, b) => a.score - b.score)
                .filter(a => a.scoreBreakdown.krRisk < 60 && a.scoreBreakdown.deadline < 60);

            let remaining = excess;
            const toDefer = [];
            for (const candidate of deferCandidates) {
                if (remaining <= 0) break;
                toDefer.push(candidate);
                remaining -= candidate.estimatedMinutes;
            }

            const changes = toDefer.map(candidate => ({
                type: 'task_defer',
                taskId: candidate.taskId,
                title: candidate.title,
                estimatedMinutes: candidate.estimatedMinutes,
                reason: 'Baja prioridad, sin riesgo estratégico',
            }));

            return {
                preview: {
                    changes,
                    summary: `Redistribuir ${toDefer.length} tarea(s) a "Algún día"\n` +
                        `- Sobrecarga: ${formatMinutes(excess)}\n` +
                        `- Liberado: ${formatMinutes(toDefer.reduce((sum, t) => sum + t.estimatedMinutes, 0))}`,
                    impact: {
                        tasksDeferred: toDefer.length,
                        minutesFreed: toDefer.reduce((sum, t) => sum + t.estimatedMinutes, 0),
                        capacityAfterPct: Math.round(((load - toDefer.reduce((sum, t) => sum + t.estimatedMinutes, 0)) / capacity.usable) * 100),
                    },
                    reason: 'Sobrecarga detectada. Diferir tareas de menor impacto estratégico.',
                    payload: { tasksToDefer: toDefer.map(t => t.taskId) },
                },
                requiresConfirmation: true,
            };
        }
        case 'breakdown_milestone': {
            const { projectId, projectTitle, milestoneId, milestoneTitle, subtaskCount } = args || {};
            if (!projectId && !projectTitle) {
                return buildNoAction('Falta projectId o projectTitle.');
            }
            if (!milestoneId && !milestoneTitle) {
                return buildNoAction('Falta milestoneId o milestoneTitle.');
            }

            const data = await deps.readJson('tasks-data.json');
            let project = projectId ? data.tasks.find(t => t.id === projectId) : null;
            if (!project && projectTitle) {
                const match = findTaskByTitle(data, projectTitle);
                if (match.matches.length === 1) {
                    project = match.matches[0];
                } else if (match.matches.length > 1) {
                    const options = match.matches.slice(0, 3).map(t => t.title).join(', ');
                    return buildNoAction(`Encontré varios proyectos: ${options}. Indica el id exacto.`);
                }
            }
            if (!project || project.type !== 'project') {
                return buildNoAction('No encontré el proyecto.');
            }

            let milestone = milestoneId
                ? project.milestones?.find(m => m.id === milestoneId)
                : project.milestones?.find(m => normalizeText(m.title) === normalizeText(milestoneTitle));

            if (!milestone) {
                return buildNoAction('No encontré el milestone en el proyecto.');
            }

            // Generate subtasks based on milestone title
            const count = subtaskCount || 3;
            const subtasks = Array.from({ length: count }, (_, i) => {
                const taskId = makeId('task', deps.generateId);
                return {
                    id: taskId,
                    title: `${milestone.title} - Paso ${i + 1}`,
                    type: 'simple',
                    status: 'active',
                    thisWeek: i === 0, // Only first subtask committed
                    weekCommitted: i === 0 ? deps.getCurrentWeek() : null,
                    category: project.category,
                    areaId: project.areaId,
                    parentId: project.id,
                    objectiveId: project.objectiveId,
                    keyResultId: project.keyResultId,
                    createdAt: new Date().toISOString(),
                };
            });

            const changes = subtasks.map((task, i) => ({
                type: 'subtask_create',
                taskId: task.id,
                title: task.title,
                parentId: project.id,
                thisWeek: i === 0,
            }));

            return {
                preview: {
                    changes,
                    summary: `Descomponer milestone "${milestone.title}" en ${count} sub-tareas\n` +
                        `- Proyecto: ${project.title}\n` +
                        `- Comprometida esta semana: 1 (primera sub-tarea)`,
                    impact: {
                        subtasksCreated: count,
                        tasksCommitted: 1,
                    },
                    reason: `Milestone grande descompuesto para facilitar progreso incremental.`,
                    payload: { projectId: project.id, milestoneId: milestone.id, subtasks },
                },
                requiresConfirmation: true,
            };
        }
        default:
            return buildNoAction(`Tool no soportada: ${toolName}`);
    }
}
export async function executeMutation(toolName, preview, deps) {
    const payload = preview?.payload || {};
    const interventionEnabled = process.env.FF_COACH_INTERVENTION_ENABLED !== 'false';

    try {
        switch (toolName) {
            case 'create_task':
            case 'create_project': {
                const data = await deps.readJson('tasks-data.json');
                const task = payload.task;
                if (!task) return { success: false, message: 'No hay tarea para crear' };
                let interceptor = null;
                if (interventionEnabled) {
                    interceptor = await interceptTaskAction(task, deps);
                }
                const exists = data.tasks.some(t => t.id === task.id);
                if (exists) {
                    task.id = `${task.id}-${Math.random().toString(36).slice(2, 6)}`;
                }
                data.tasks.push(task);
                await deps.writeJson('tasks-data.json', data);
                const advisory = interceptor?.mode === 'soft_block'
                    ? ` Aviso de capacidad: ${interceptor.message}`
                    : '';
                return { success: true, message: `Creado: ${task.title}.${advisory}`.trim(), task, interceptor };
            }
            case 'update_task':
            case 'update_project': {
                const data = await deps.readJson('tasks-data.json');
                const taskIndex = data.tasks.findIndex(t => t.id === payload.taskId);
                if (taskIndex === -1) return { success: false, message: 'Tarea no encontrada' };
                const task = data.tasks[taskIndex];
                let interceptor = null;
                if (interventionEnabled && payload?.updates) {
                    if ('targetList' in payload.updates) {
                        interceptor = await interceptTaskMove(task.id, payload.updates.targetList, deps);
                    } else if ('thisWeek' in payload.updates || 'dueDate' in payload.updates) {
                        interceptor = await interceptTaskAction({ ...task, ...payload.updates }, deps);
                    }
                }
                mapTaskUpdates(payload.updates || {}, task, data, deps.getCurrentWeek);
                data.tasks[taskIndex] = task;
                await deps.writeJson('tasks-data.json', data);
                const advisory = interceptor?.mode === 'soft_block'
                    ? ` Aviso de capacidad: ${interceptor.message}`
                    : '';
                return { success: true, message: `Actualizado: ${task.title}.${advisory}`.trim(), task, interceptor };
            }
            case 'delete_task':
            case 'delete_project': {
                const data = await deps.readJson('tasks-data.json');
                const before = data.tasks.length;
                data.tasks = data.tasks.filter(t => t.id !== payload.taskId);
                if (data.tasks.length === before) {
                    return { success: false, message: 'Tarea no encontrada' };
                }
                await deps.writeJson('tasks-data.json', data);
                return { success: true, message: 'Tarea eliminada' };
            }
            case 'create_inbox_item': {
                const data = await deps.readJson('tasks-data.json');
                const { type, item } = payload;
                if (!data.inbox[type]) data.inbox[type] = [];
                data.inbox[type].push(item);
                await deps.writeJson('tasks-data.json', data);
                return { success: true, message: 'Item capturado en inbox', item };
            }
            case 'update_inbox_item': {
                const data = await deps.readJson('tasks-data.json');
                const { inboxId, type, updates } = payload;
                const item = data.inbox?.[type]?.find(i => i.id === inboxId);
                if (!item) return { success: false, message: 'Item no encontrado' };
                if ('text' in updates) item.text = updates.text;
                if ('category' in updates) item.category = updates.category;
                if ('areaId' in updates) item.areaId = updates.areaId || updates.category || item.areaId;
                if ('dueDate' in updates) item.dueDate = updates.dueDate;
                if ('priority' in updates) item.priority = updates.priority;
                if ('objectiveId' in updates) item.objectiveId = updates.objectiveId || null;
                if ('keyResultId' in updates) item.keyResultId = updates.keyResultId || null;
                item.updated_date = new Date().toISOString();
                await deps.writeJson('tasks-data.json', data);
                return { success: true, message: 'Item actualizado', item };
            }
            case 'delete_inbox_item': {
                const data = await deps.readJson('tasks-data.json');
                const { inboxId, type } = payload;
                const before = data.inbox?.[type]?.length || 0;
                data.inbox[type] = (data.inbox[type] || []).filter(i => i.id !== inboxId);
                if (before === data.inbox[type].length) {
                    return { success: false, message: 'Item no encontrado' };
                }
                await deps.writeJson('tasks-data.json', data);
                return { success: true, message: 'Item eliminado' };
            }
            case 'process_inbox_item': {
                const data = await deps.readJson('tasks-data.json');
                const { inboxId, type, task } = payload;
                const item = data.inbox?.[type]?.find(i => i.id === inboxId);
                if (!item) return { success: false, message: 'Item no encontrado' };
                data.tasks.push(task);
                data.inbox[type] = (data.inbox[type] || []).filter(i => i.id !== inboxId);
                await deps.writeJson('tasks-data.json', data);
                return { success: true, message: `Procesado: ${task.title}`, task };
            }
            case 'create_area': {
                const profile = await deps.readJson('profile.json');
                if (!profile.life_areas) profile.life_areas = {};
                const { areaId, data } = payload;
                if (profile.life_areas[areaId]) {
                    return { success: false, message: 'Area ya existe' };
                }
                profile.life_areas[areaId] = {
                    name: data.name,
                    description: data.description || '',
                    priority: data.priority || 'medium',
                    current_focus: data.current_focus || '',
                    status: data.status || 'active',
                    color: data.color || 'blue',
                    icon: data.icon || 'Circle',
                    created_at: new Date().toISOString(),
                };
                await deps.writeJson('profile.json', profile);
                return { success: true, message: `Area creada: ${data.name}`, areaId };
            }
            case 'update_area': {
                const profile = await deps.readJson('profile.json');
                const { areaId, updates } = payload;
                if (!profile.life_areas || !profile.life_areas[areaId]) {
                    return { success: false, message: 'Area no encontrada' };
                }
                const allowed = ['name', 'description', 'priority', 'current_focus', 'status', 'color', 'icon'];
                allowed.forEach(field => {
                    if (field in updates) {
                        profile.life_areas[areaId][field] = updates[field];
                    }
                });
                profile.life_areas[areaId].updated_at = new Date().toISOString();
                await deps.writeJson('profile.json', profile);
                return { success: true, message: `Area actualizada: ${areaId}`, areaId };
            }
            case 'archive_area': {
                const profile = await deps.readJson('profile.json');
                const { areaId } = payload;
                if (!profile.life_areas || !profile.life_areas[areaId]) {
                    return { success: false, message: 'Area no encontrada' };
                }
                profile.life_areas[areaId].status = 'archived';
                profile.life_areas[areaId].archived_at = new Date().toISOString();
                await deps.writeJson('profile.json', profile);
                return { success: true, message: `Area archivada: ${areaId}`, areaId };
            }
            case 'create_objective': {
                const db = await getDb(deps);
                const { objectiveId, data } = payload;
                const now = new Date().toISOString();
                db.exec(`
                    INSERT INTO objectives (id, title, description, period, status, area_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    objectiveId,
                    data.title.trim(),
                    data.description || null,
                    data.period,
                    data.status || 'active',
                    data.areaId || null,
                    now,
                    now,
                ]);
                return { success: true, message: `Objetivo creado: ${data.title}`, objectiveId };
            }
            case 'update_objective': {
                const db = await getDb(deps);
                const { objectiveId, updates } = payload;
                const existing = db.queryOne('SELECT id FROM objectives WHERE id = ?', [objectiveId]);
                if (!existing) return { success: false, message: 'Objetivo no encontrado' };
                const fields = [];
                const params = [];
                const map = { title: 'title', description: 'description', period: 'period', status: 'status', areaId: 'area_id' };
                for (const [key, dbField] of Object.entries(map)) {
                    if (updates[key] !== undefined) {
                        fields.push(`${dbField} = ?`);
                        params.push(updates[key]);
                    }
                }
                fields.push('updated_at = ?');
                params.push(new Date().toISOString());
                params.push(objectiveId);
                if (fields.length > 0) {
                    db.exec(`UPDATE objectives SET ${fields.join(', ')} WHERE id = ?`, params);
                }
                return { success: true, message: `Objetivo actualizado: ${objectiveId}`, objectiveId };
            }
            case 'delete_objective': {
                const db = await getDb(deps);
                const { objectiveId } = payload;
                const exists = db.queryOne('SELECT id FROM objectives WHERE id = ?', [objectiveId]);
                if (!exists) return { success: false, message: 'Objetivo no encontrado' };
                db.exec('DELETE FROM objectives WHERE id = ?', [objectiveId]);
                return { success: true, message: `Objetivo eliminado: ${objectiveId}`, objectiveId };
            }
            case 'create_key_result': {
                const db = await getDb(deps);
                const { keyResultId, data } = payload;
                const objective = db.queryOne('SELECT id FROM objectives WHERE id = ?', [data.objectiveId]);
                if (!objective) return { success: false, message: 'objectiveId invalido' };
                const now = new Date().toISOString();
                const startValue = data.startValue ?? 0;
                const currentValue = data.currentValue ?? startValue;
                const status = data.status || 'on_track';
                db.exec(`
                    INSERT INTO key_results (
                        id, objective_id, title, metric_type, start_value, target_value, current_value, unit, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    keyResultId,
                    data.objectiveId,
                    data.title.trim(),
                    data.metricType || 'number',
                    startValue,
                    data.targetValue,
                    currentValue,
                    data.unit || null,
                    status,
                    now,
                    now,
                ]);
                return { success: true, message: `KR creado: ${data.title}`, keyResultId };
            }
            case 'update_key_result':
            case 'update_key_result_progress': {
                const db = await getDb(deps);
                const { keyResultId, updates, isProgressUpdate } = payload;
                const existing = db.queryOne('SELECT * FROM key_results WHERE id = ?', [keyResultId]);
                if (!existing) return { success: false, message: 'KR no encontrado' };
                if (updates.objectiveId) {
                    const objective = db.queryOne('SELECT id FROM objectives WHERE id = ?', [updates.objectiveId]);
                    if (!objective) return { success: false, message: 'objectiveId invalido' };
                }
                if (isProgressUpdate && typeof updates.currentValue === 'number') {
                    const progress = ((updates.currentValue - existing.start_value) / (existing.target_value - existing.start_value || 1)) * 100;
                    const status = progress >= 100 ? 'done' : progress >= 70 ? 'on_track' : progress >= 40 ? 'at_risk' : 'off_track';
                    db.exec(`
                        UPDATE key_results
                        SET current_value = ?, status = ?, updated_at = ?
                        WHERE id = ?
                    `, [updates.currentValue, status, new Date().toISOString(), keyResultId]);
                    return { success: true, message: `KR actualizado: ${keyResultId}`, keyResultId };
                }
                const fields = [];
                const params = [];
                const map = {
                    objectiveId: 'objective_id',
                    title: 'title',
                    metricType: 'metric_type',
                    startValue: 'start_value',
                    targetValue: 'target_value',
                    currentValue: 'current_value',
                    unit: 'unit',
                    status: 'status',
                };
                for (const [key, dbField] of Object.entries(map)) {
                    if (updates[key] !== undefined) {
                        fields.push(`${dbField} = ?`);
                        params.push(updates[key]);
                    }
                }
                fields.push('updated_at = ?');
                params.push(new Date().toISOString());
                params.push(keyResultId);
                db.exec(`UPDATE key_results SET ${fields.join(', ')} WHERE id = ?`, params);
                return { success: true, message: `KR actualizado: ${keyResultId}`, keyResultId };
            }
            case 'delete_key_result': {
                const db = await getDb(deps);
                const { keyResultId } = payload;
                const exists = db.queryOne('SELECT id FROM key_results WHERE id = ?', [keyResultId]);
                if (!exists) return { success: false, message: 'KR no encontrado' };
                db.exec('DELETE FROM key_results WHERE id = ?', [keyResultId]);
                return { success: true, message: `KR eliminado: ${keyResultId}`, keyResultId };
            }
            case 'create_calendar_block': {
                if (!deps.createCalendarBlock) return { success: false, message: 'Calendar no disponible' };
                const block = deps.createCalendarBlock({
                    taskId: payload.taskId,
                    date: payload.date,
                    startTime: payload.startTime,
                    endTime: payload.endTime,
                    durationMinutes: payload.durationMinutes,
                    status: payload.status || 'scheduled',
                    notes: payload.notes || null,
                });
                let deepWork = null;
                if (interventionEnabled) {
                    const data = await deps.readJson('tasks-data.json');
                    const task = (data.tasks || []).find(t => t.id === payload.taskId);
                    if (task) {
                        const profile = await deps.readJson('profile.json').catch(() => ({}));
                        deepWork = protectDeepWork(task, payload.startTime, profile || {});
                    }
                }
                const warning = deepWork?.protected ? ` ${deepWork.warning}` : '';
                return { success: true, message: `Bloque creado.${warning}`.trim(), block, deepWork };
            }
            case 'update_calendar_block': {
                if (!deps.updateCalendarBlock) return { success: false, message: 'Calendar no disponible' };
                const updated = deps.updateCalendarBlock(payload.blockId, payload.updates);
                if (!updated) return { success: false, message: 'Bloque no encontrado' };
                let deepWork = null;
                if (interventionEnabled && payload?.updates?.startTime) {
                    const data = await deps.readJson('tasks-data.json');
                    const task = (data.tasks || []).find(t => t.id === (updated.taskId || payload.updates.taskId));
                    if (task) {
                        const profile = await deps.readJson('profile.json').catch(() => ({}));
                        deepWork = protectDeepWork(task, payload.updates.startTime, profile || {});
                    }
                }
                const warning = deepWork?.protected ? ` ${deepWork.warning}` : '';
                return { success: true, message: `Bloque actualizado.${warning}`.trim(), block: updated, deepWork };
            }
            case 'delete_calendar_block': {
                if (!deps.deleteCalendarBlock) return { success: false, message: 'Calendar no disponible' };
                deps.deleteCalendarBlock(payload.blockId);
                return { success: true, message: 'Bloque eliminado' };
            }
            case 'create_content_project': {
                const project = await createFromContentTemplate(payload.templateId, payload.title, deps);
                return { success: true, message: `Proyecto creado: ${project.title}`, project };
            }
            case 'create_learning_structure': {
                const { objective, keyResults, task } = payload;
                const db = await getDb(deps);
                const now = new Date().toISOString();

                // 1. Create objective in SQLite
                db.exec(
                    `INSERT INTO objectives (id, title, description, period, status, area_id, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [objective.objectiveId, objective.data.title, objective.data.description || '',
                     objective.data.period, 'active', objective.data.areaId || null, now, now]
                );

                // 2. Create key results in SQLite
                for (const kr of keyResults) {
                    db.exec(
                        `INSERT INTO key_results (id, objective_id, title, metric_type, start_value, current_value, target_value, unit, status, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [kr.id, kr.objectiveId, kr.title, kr.metricType,
                         kr.startValue, kr.currentValue, kr.targetValue, kr.unit,
                         'active', now, now]
                    );
                }

                // 3. Create project in tasks-data.json (reuse existing pattern)
                const data = await deps.readJson('tasks-data.json');
                const exists = data.tasks.some(t => t.id === task.id);
                if (exists) {
                    task.id = `${task.id}-${Math.random().toString(36).slice(2, 6)}`;
                }
                data.tasks.push(task);
                await deps.writeJson('tasks-data.json', data);

                return {
                    success: true,
                    message: `Estructura de aprendizaje creada: "${objective.data.title}" con ${keyResults.length} KRs y proyecto "${task.title}" (${task.milestones?.length || 0} milestones).`,
                    objectiveId: objective.objectiveId,
                    keyResultIds: keyResults.map(kr => kr.id),
                    projectId: task.id,
                };
            }
            case 'smart_process_inbox': {
                const { inboxId, inboxType, task, block } = payload;
                const data = await deps.readJson('tasks-data.json');

                // 1. Delete inbox item if exists
                if (inboxId && inboxType) {
                    data.inbox[inboxType] = (data.inbox[inboxType] || []).filter(i => i.id !== inboxId);
                }

                // 2. Create task
                const exists = data.tasks.some(t => t.id === task.id);
                if (exists) {
                    task.id = `${task.id}-${Math.random().toString(36).slice(2, 6)}`;
                }
                data.tasks.push(task);

                // 3. Create calendar block if provided
                if (block && deps.createCalendarBlock) {
                    deps.createCalendarBlock(block);
                }

                await deps.writeJson('tasks-data.json', data);

                return {
                    success: true,
                    message: `Inbox procesado: "${task.title}" ${block ? 'y agendada' : 'comprometida a esta semana'}.`,
                    task,
                    block,
                };
            }
            case 'plan_and_schedule_week': {
                const { tasksToCommit, planPack } = payload;
                const data = await deps.readJson('tasks-data.json');

                const committed = [];
                for (const taskId of tasksToCommit) {
                    const task = data.tasks.find(t => t.id === taskId);
                    if (task && !task.thisWeek) {
                        task.thisWeek = true;
                        task.weekCommitted = deps.getCurrentWeek();
                        committed.push({ taskId: task.id, title: task.title });
                    }
                }

                await deps.writeJson('tasks-data.json', data);

                return {
                    success: true,
                    message: `${committed.length} tarea(s) comprometida(s) para esta semana.`,
                    committed,
                    planPack,
                };
            }
            case 'batch_reprioritize': {
                const { tasksToDefer } = payload;
                const data = await deps.readJson('tasks-data.json');

                const deferred = [];
                for (const taskId of tasksToDefer) {
                    const task = data.tasks.find(t => t.id === taskId);
                    if (task && task.thisWeek) {
                        task.thisWeek = false;
                        task.weekCommitted = null;
                        deferred.push({ taskId: task.id, title: task.title });
                    }
                }

                await deps.writeJson('tasks-data.json', data);

                return {
                    success: true,
                    message: `${deferred.length} tarea(s) movida(s) a "Algún día".`,
                    deferred,
                };
            }
            case 'breakdown_milestone': {
                const { projectId, milestoneId, subtasks } = payload;
                const data = await deps.readJson('tasks-data.json');

                // Add subtasks to data.tasks
                for (const subtask of subtasks) {
                    const exists = data.tasks.some(t => t.id === subtask.id);
                    if (!exists) {
                        data.tasks.push(subtask);
                    }
                }

                await deps.writeJson('tasks-data.json', data);

                return {
                    success: true,
                    message: `Milestone descompuesto en ${subtasks.length} sub-tareas.`,
                    subtasks: subtasks.map(s => ({ id: s.id, title: s.title })),
                };
            }
            default:
                return { success: false, message: `Tool no soportada: ${toolName}` };
        }
    } catch (error) {
        logger.error('Mutation execution failed', { toolName, error: error.message });
        return { success: false, message: error.message };
    }
}
