/**
 * Coach Chat Routes (Fase 9 + 10.2)
 *
 * Conversational assistant with tool-backed actions + Intervention Coach (Jarvis-Elite).
 * Uses the Phase 8 engine as the single source of decisions.
 *
 * Endpoints:
 * - POST /api/coach/chat/message   â€" Process chat message (intent match â†' preview)
 * - POST /api/coach/chat/confirm   â€" Confirm/cancel a pending action
 * - GET  /api/coach/chat/history   â€" Chat history for a session
 * - GET  /api/coach/diagnosis      â€" Get current load diagnosis (Fase 10.2)
 * - GET  /api/coach/checkin        â€" Trigger evening check-in (Fase 10.2)
 * - POST /api/coach/checkin/response â€" Process check-in response (Fase 10.2)
 * - GET  /api/coach/patterns       â€" Get all patterns (Fase 10.2)
 * - POST /api/coach/patterns/analyze â€" Trigger pattern analysis (Fase 10.2)
 * - GET  /api/activity             â€" Unified activity log (Fase 10.3B)
 * - GET  /api/coach/metrics        â€" Aggregated quality metrics (Fase 10.3B)
 * - GET  /api/coach/metrics/weekly â€" Weekly quality report (Fase 10.3B)
 *
 * Feature Flags:
 * - FF_COACH_INTERVENTION_ENABLED (default: true)
 * - FF_COACH_CHECKIN_ENABLED (default: true)
 */

import { validate, CoachChatMessageSchema, CoachChatConfirmSchema } from '../helpers/validators.js';
import {
    matchIntent,
    TOOL_DEFINITIONS,
    planWeekPreview,
    planWeekExecute,
    scheduleBlockPreview,
    scheduleBlockExecute,
    reprioritizePreview,
    reprioritizeExecute,
    goalReviewPreview,
    generateContextualResponse,
} from '../helpers/coach-chat-tools.js';
import {
    isLLMAgentEnabled,
    processWithLLM,
    loadMemory,
    storeMemory,
    shouldTriggerProactive,
    generateProactiveMessage,
} from '../helpers/llm-agent-orchestrator.js';
import { executeMutation, buildMutationPreview } from '../helpers/llm-agent-mutation-tools.js';
import logger from '../helpers/logger.js';
import { logQualityEvent } from '../helpers/quality-event-logger.js';
import {
    resolvePendingAction,
    initializePendingAction,
    completePendingAction,
} from '../helpers/pending-action-resolver.js';
import {
    loadConversationState,
} from '../helpers/conversation-state-manager.js';
import { normalizeSlot } from '../helpers/slot-normalizer.js';

const ACTION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function registerCoachChatRoutes(app, deps) {
    const {
        readJson, writeJson, getDbManager, generateId, getCurrentWeek,
        readCalendarBlocks, createCalendarBlock, updateCalendarBlock, deleteCalendarBlock,
    } = deps;

    let dbInitialized = false;
    const interventionEnabled = process.env.FF_COACH_INTERVENTION_ENABLED !== 'false';
    const checkinEnabled = process.env.FF_COACH_CHECKIN_ENABLED !== 'false';

    async function getDb() {
        const db = getDbManager();
        if (!dbInitialized) {
            await db.initialize();
            dbInitialized = true;
        }
        return db;
    }

    function makeId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    // â”€â”€ Session helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function ensureSession(db, sessionId, mode) {
        if (sessionId) {
            const existing = db.queryOne(
                'SELECT * FROM coach_sessions WHERE id = ?',
                [sessionId]
            );
            if (existing) {
                if (mode && mode !== existing.mode) {
                    db.exec('UPDATE coach_sessions SET mode = ? WHERE id = ?', [mode, sessionId]);
                }
                return sessionId;
            }
        }

        const newId = makeId('cs');
        db.exec(
            'INSERT INTO coach_sessions (id, mode, started_at) VALUES (?, ?, ?)',
            [newId, mode || 'suggest', new Date().toISOString()]
        );
        return newId;
    }

    function storeMessage(db, sessionId, role, content, extra = {}) {
        const msgId = makeId('msg');
        db.exec(`
            INSERT INTO coach_messages (id, session_id, role, content, tool_name, action_id, action_preview, action_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            msgId,
            sessionId,
            role,
            content,
            extra.toolName || null,
            extra.actionId || null,
            extra.actionPreview ? JSON.stringify(extra.actionPreview) : null,
            extra.actionStatus || null,
            new Date().toISOString(),
        ]);

        // Update message count
        db.exec(
            'UPDATE coach_sessions SET message_count = message_count + 1 WHERE id = ?',
            [sessionId]
        );

        return msgId;
    }

    function logCoachEvent(db, eventType, toolName, preview, result) {
        try {
            db.exec(`
                INSERT INTO coach_events (id, event_type, rule_id, severity, title, description, reason, suggested_action, action_result, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                makeId('ce'),
                eventType,
                `chat_tool:${toolName}`,
                'medium',
                `Chat action: ${toolName}`,
                preview?.summary || '',
                preview?.reason || '',
                JSON.stringify({ type: toolName, preview }),
                result ? JSON.stringify(result) : null,
                new Date().toISOString(),
            ]);
        } catch (err) {
            logger.debug('Could not log coach chat event', { error: err.message });
        }
    }

    // â”€â”€ Tool runner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const toolDeps = {
        readJson, writeJson, getCurrentWeek, getDbManager: () => getDbManager(),
        readCalendarBlocks, createCalendarBlock, updateCalendarBlock, deleteCalendarBlock, generateId,
    };

    async function runToolPreview(toolName, message) {
        switch (toolName) {
            case 'plan_week':
                return planWeekPreview(toolDeps);
            case 'schedule_block':
                return scheduleBlockPreview(message, toolDeps);
            case 'reprioritize':
                return reprioritizePreview(toolDeps);
            case 'goal_review':
                return goalReviewPreview(toolDeps);
            default:
                return null;
        }
    }

    async function runToolExecute(toolName, preview) {
        switch (toolName) {
            case 'plan_week':
                return planWeekExecute(toolDeps);
            case 'schedule_block':
                return scheduleBlockExecute(preview, toolDeps);
            case 'reprioritize':
                return reprioritizeExecute(preview, toolDeps);
            default:
                return executeMutation(toolName, preview, toolDeps);
        }
    }

    const VAGUE_RESPONSE_PATTERNS = [
        /parece que hubo un problema/i,
        /no puedo acceder a la informaci[oÃ³]n actual/i,
        /actualmente no puedo acceder/i,
        /no puedo acceder/i,
        /intenta nuevamente m[aÃ¡]s tarde/i,
        /verifica si hay un problema con el sistema/i,
        /^soy tu coach de productividad/i,
        /no tengo un nombre personal/i,
    ];

    function isVagueCoachResponse(text) {
        if (!text || typeof text !== 'string') return true;
        const trimmed = text.trim();
        if (!trimmed) return true;
        if (trimmed.length < 24) return false;
        return VAGUE_RESPONSE_PATTERNS.some((pattern) => pattern.test(trimmed));
    }

    function classifyLlmError(error) {
        const msg = String(error?.message || '').toLowerCase();
        if (msg.includes('openai_api_key')) return 'missing_api_key';
        if (msg.includes('rate limit') || msg.includes('429')) return 'rate_limited';
        if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
        if (msg.includes('tool') || msg.includes('json')) return 'tool_or_output_error';
        return 'llm_runtime_error';
    }

    async function buildDataBackedFallback(userMessage, options = {}) {
        const { degraded = false, reason = null } = options;
        const data = await readJson('tasks-data.json');
        const tasks = data.tasks || [];
        const inbox = data.inbox || { work: [], personal: [] };
        const weekActive = tasks.filter(t => t.thisWeek && t.status === 'active').length;
        const weekDone = tasks.filter(t => t.thisWeek && t.status === 'done').length;
        const inboxCount = (inbox.work?.length || 0) + (inbox.personal?.length || 0);
        const projectsActive = tasks.filter(t => t.type === 'project' && t.status === 'active').length;
        const lower = String(userMessage || '').toLowerCase();

        const stateLine = `Estado actual: ${weekActive} tarea(s) activas esta semana, ${weekDone} completada(s), ${inboxCount} item(s) en inbox, ${projectsActive} proyecto(s) activo(s).`;
        const degradedLine = degraded
            ? `No pude usar el modo avanzado en este turno (${reason || 'llm_fallback'}), pero puedo ayudarte con un plan basado en datos actuales.`
            : '';

        if (lower.includes('trimestre') || lower.includes('quarter')) {
            return `${degradedLine}\n${stateLine}\nPlan sugerido: 1) define 1-3 objetivos hasta la fecha limite, 2) compromete solo tareas de alto impacto esta semana, 3) bloquea tiempos de foco hoy.`;
        }
        if (lower.includes('hoy') || lower.includes('dia')) {
            return `${degradedLine}\n${stateLine}\nSiguiente paso recomendado: elige 1 tarea critica y 1 tarea de soporte para hoy, luego te propongo bloques.`;
        }
        if (lower.includes('semana')) {
            return `${degradedLine}\n${stateLine}\nSiguiente paso recomendado: te propongo un plan semanal equilibrado por capacidad y objetivos.`;
        }

        return `${degradedLine}\n${stateLine}\nPuedo ayudarte con plan semanal, ajuste por sobrecarga o revision de objetivos.`;
    }

    async function ensureCoachResponseQuality(db, userMessage, proposedResponse, options = {}) {
        const { degraded = false, reason = null } = options;
        if (!isVagueCoachResponse(proposedResponse)) {
            return { response: proposedResponse, replaced: false };
        }
        const fallback = await buildDataBackedFallback(userMessage, { degraded, reason });
        try {
            logCoachEvent(db, 'generated', 'quality_fallback', null, {
                replacedResponse: true,
                reason: reason || 'vague_response_detected',
            });
        } catch (_err) {
            // no-op
        }
        return { response: fallback, replaced: true };
    }

    function isAffirmativeMessage(message) {
        const raw = String(message || '').trim().toLowerCase();
        const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return ['si', 'ok', 'dale', 'hazlo', 'de una', 'claro', 'yes'].includes(normalized);
    }

    function parseCreateObjectiveIntent(message) {
        const raw = String(message || '').trim();
        if (!raw) return null;
        const lower = raw.toLowerCase();
        if ((lower.includes('como') || lower.includes('cómo')) && (lower.includes('puedo') || lower.includes('hago'))) {
            return null;
        }

        if (!/(crea|crear|nuevo|nueva|agrega|agregar|anade|añade)/i.test(lower)) return null;
        if (!/(objetivo|meta)/i.test(lower)) return null;

        const quoted = raw.match(/(?:crea|crear|nuevo|nueva)[^"]*(?:objetivo|meta)[^"]*"([^"]+)"/i);
        let title = quoted?.[1] || null;

        if (!title) {
            const plain = raw.match(/(?:crea|crear|nuevo|nueva|agrega|agregar|anade|añade)[^a-zA-Z0-9]*(?:el|la)?\s*(?:objetivo|meta)\s*[:.\-]?\s*(.+)$/i);
            title = plain?.[1] || null;
        }

        if (!title) return null;

        title = title
            .replace(/\s+(?:para|en)\s+(?:el\s+)?(?:primer|segundo|tercer|cuarto|\d+)?\s*(?:semestre|trimestre)\b.*$/i, '')
            .replace(/\s+(?:\d{4}-Q[1-4]|\d{4}-H[1-2])\b.*$/i, '')
            .replace(/[\s.,;:-]+(?:periodo|periodo|area|área|descripcion|descripción)\b[\s\S]*$/i, '')
            .trim()
            .replace(/^["']|["']$/g, '');

        if (!title) return null;
        return { title };
    }

    function parseObjectiveDetails(message) {
        const raw = String(message || '').trim();
        const lower = raw.toLowerCase();

        const periodMatch = raw.match(/(?:periodo|periodo[:\s]|period[:\s]|para)\s+(.+?)(?:\.|,|;|$)/i)
            || raw.match(/((?:primer|segundo|tercer|cuarto)\s+(?:semestre|trimestre)\s+(?:del?\s+)?\d{4})/i)
            || raw.match(/(\d{4}-(?:Q[1-4]|H[1-2]))/i);

        const areaMatch = raw.match(/(?:area|área)\s+(.+?)(?:\.|,|;|$)/i);
        const descMatch = raw.match(/(?:descripcion|descripción)\s*[:\-]\s*(.+)$/i);

        let areaRaw = areaMatch?.[1]?.trim() || null;
        if (areaRaw) {
            areaRaw = areaRaw
                .replace(/^de\s+/i, '')
                .replace(/^(y|e)\s+/i, '')
                .trim();
        }

        return {
            periodRaw: periodMatch?.[1]?.trim() || null,
            areaRaw: areaRaw || null,
            description: descMatch?.[1]?.trim() || null,
            hasHowToIntent: /\b(como|cómo)\b.*\b(hacer|uso|funciona|crear|mover|editar|borrar)\b/i.test(lower),
        };
    }

    function looksLikeInboxOffer(text) {
        const lower = String(text || '').toLowerCase();
        return lower.includes('recordatorio') && (lower.includes('bandeja') || lower.includes('inbox'));
    }

    function inferAreaFromText(text) {
        const lower = String(text || '').toLowerCase();
        if (/\bnadar\b|\bgym\b|\bcorrer\b|\bsalud\b/.test(lower)) return 'salud';
        if (/\bcliente\b|\bagencia\b|\bads\b|\btrabajo\b/.test(lower)) return 'trabajo';
        if (/\bfamilia\b|\bpareja\b|\bhijo\b/.test(lower)) return 'familia';
        if (/\byoutube\b|\bpodcast\b|\bblog\b|\bcontenido\b/.test(lower)) return 'contenido';
        return 'personal';
    }

    function isHowToQuestion(message) {
        const lower = String(message || '').toLowerCase();
        return (
            (lower.includes('como') || lower.includes('cómo')) &&
            (lower.includes('puedo') || lower.includes('hago') || lower.includes('funciona') || lower.includes('usar'))
        );
    }

    function isThisWeekFolderQuery(message) {
        const lower = String(message || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        const mentionsWeek = lower.includes('esta semana') || lower.includes('semana');
        const mentionsFolder = lower.includes('carpeta') || lower.includes('lista');
        const mentionsTasks = lower.includes('tareas');
        return mentionsWeek && (mentionsFolder || mentionsTasks);
    }

    function formatThisWeekList(tasks) {
        if (tasks.length === 0) {
            return 'No tienes tareas activas en "Esta Semana".';
        }
        const lines = [];
        lines.push(`Estas son tus tareas activas en "Esta Semana" (${tasks.length}):`);
        for (const t of tasks.slice(0, 25)) {
            lines.push(`- ${t.title}`);
        }
        if (tasks.length > 25) {
            lines.push(`... y ${tasks.length - 25} mas.`);
        }
        return lines.join('\n');
    }

    function buildHowToGuide(message) {
        const lower = String(message || '').toLowerCase();
        if (lower.includes('objetivo') || lower.includes('okr') || lower.includes('key result')) {
            return 'Para objetivos: 1) abre Objetivos y crea un objetivo con periodo, 2) agrega key results, 3) vincula tareas/proyectos al objetivo, 4) revisa riesgo en Coach. Si quieres, te lo hago por chat paso a paso.';
        }
        if (lower.includes('inbox') || lower.includes('bandeja')) {
            return 'Para Inbox: 1) captura ideas rápidas, 2) procesa cada item a tarea/proyecto, 3) asigna area y prioridad, 4) compromete solo lo que cabe en semana.';
        }
        if (lower.includes('calendario') || lower.includes('bloque')) {
            return 'Para calendario: 1) elige tarea activa, 2) agenda bloque por hora, 3) evita solapamientos, 4) ajusta si cambia la carga del día.';
        }
        return 'Puedo guiarte en toda la app: Inbox, Hoy, Esta Semana, Algun dia, Calendario, Proyectos, Areas y Objetivos. Dime la acción exacta y te doy pasos o la ejecuto por chat con confirmación.';
    }

    // â”€â”€â”€ POST /api/coach/chat/message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    app.post('/api/coach/chat/message', validate(CoachChatMessageSchema), async (req, res) => {
        try {
            const { message, sessionId: reqSessionId, mode } = req.validatedBody;
            const db = await getDb();
            let llmFallback = null;

            // Ensure session
            const sessionId = ensureSession(db, reqSessionId, mode);
            const sessionMode = mode || db.queryOne('SELECT mode FROM coach_sessions WHERE id = ?', [sessionId])?.mode || 'suggest';

            // Store user message
            storeMessage(db, sessionId, 'user', message);

            // â”€â”€ AR-002: Pending Action Resolver (Priority Routing) â”€â”€

            const pendingCheck = await resolvePendingAction(db, sessionId, message, toolDeps);

            if (pendingCheck.type === 'missing_slot') {
                // AR-004: No-generic rule while pending â€” use continuation style
                const continuationResponse = `Para completar ${loadConversationState(db, sessionId)?.lastUserGoal || 'esta acciÃ³n'} solo falta: ${pendingCheck.question}`;

                storeMessage(db, sessionId, 'coach', continuationResponse);
                logQualityEvent(db, makeId, {
                    eventType: 'generated',
                    kind: 'pending_missing_slot',
                    severity: 'low',
                    title: 'Slot faltante detectado',
                    description: `Falta slot: ${pendingCheck.slot}`,
                    sessionId,
                    responseSource: 'pending_slot_resolution',
                    metadata: { missingSlot: pendingCheck.slot },
                });

                return res.json({
                    sessionId,
                    response: continuationResponse,
                    tool: null,
                    actionId: null,
                    preview: null,
                    requiresConfirmation: false,
                    pendingAction: true,
                    missingSlot: pendingCheck.slot,
                    responseSource: 'pending_slot_resolution',
                });
            }

            if (pendingCheck.type === 'all_slots_ready') {
                // All slots collected — build preview and return for confirmation
                const convState = loadConversationState(db, sessionId);
                const actionId = makeId('act');
                const expiresAt = new Date(Date.now() + ACTION_TTL_MS).toISOString();

                let toolName = convState?.intent || 'unknown';
                let preview = null;

                if (convState?.intent === 'create_objective') {
                    const objectiveTitle = String(convState.lastUserGoal || '').trim();
                    const period = pendingCheck.collectedSlots?.period;
                    const areaId = pendingCheck.collectedSlots?.area || null;
                    const build = await buildMutationPreview('create_objective', {
                        title: objectiveTitle,
                        period,
                        areaId,
                        status: 'active',
                    }, toolDeps);
                    preview = build?.preview || null;
                    toolName = 'create_objective';
                }

                if (!preview) {
                    preview = {
                        summary: `Accion lista: ${toolName} con slots: ${JSON.stringify(pendingCheck.collectedSlots)}`,
                        changes: [],
                        impact: {},
                        reason: 'Slots completados',
                        collectedSlots: pendingCheck.collectedSlots,
                        intent: toolName,
                    };
                }

                storeMessage(db, sessionId, 'coach', preview.summary, {
                    toolName,
                    actionId,
                    actionPreview: { ...preview, toolName, expiresAt },
                    actionStatus: 'pending',
                });
                logQualityEvent(db, makeId, {
                    eventType: 'generated',
                    kind: 'pending_slots_ready',
                    severity: 'low',
                    title: 'Slots completos',
                    description: `Accion lista para confirmar: ${toolName}`,
                    sessionId,
                    tool: toolName,
                    responseSource: 'pending_slots_complete',
                    metadata: { collectedSlots: pendingCheck.collectedSlots },
                });

                return res.json({
                    sessionId,
                    response: preview.summary,
                    tool: toolName,
                    actionId,
                    preview,
                    requiresConfirmation: true,
                    expiresAt,
                    pendingAction: true,
                    responseSource: 'pending_slots_complete',
                });
            }

            // No pending action or resolved -> proceed to normal flow

            // Deterministic objective creation flow with slot-filling initialization.
            const objectiveIntent = parseCreateObjectiveIntent(message);
            if (objectiveIntent) {
                const objectiveDetails = parseObjectiveDetails(message);
                const periodSource = objectiveDetails.periodRaw || message;
                const periodNormalization = await normalizeSlot('period', periodSource, toolDeps);
                let normalizedAreaId = null;
                if (objectiveDetails.areaRaw) {
                    const areaNormalization = await normalizeSlot('areaId', objectiveDetails.areaRaw, toolDeps);
                    if (!areaNormalization.error) {
                        normalizedAreaId = areaNormalization.value;
                    }
                }
                if (!periodNormalization.error && periodNormalization.value) {
                    const build = await buildMutationPreview('create_objective', {
                        title: objectiveIntent.title,
                        period: periodNormalization.value,
                        areaId: normalizedAreaId,
                        description: objectiveDetails.description || undefined,
                        status: 'active',
                    }, toolDeps);

                    const preview = build?.preview;
                    const actionId = makeId('act');
                    const expiresAt = new Date(Date.now() + ACTION_TTL_MS).toISOString();

                    if (preview && !preview.noAction) {
                        storeMessage(db, sessionId, 'coach', preview.summary, {
                            toolName: 'create_objective',
                            actionId,
                            actionPreview: { ...preview, toolName: 'create_objective', expiresAt },
                            actionStatus: 'pending',
                        });
                        logQualityEvent(db, makeId, {
                            eventType: 'generated',
                            kind: 'deterministic_objective_preview',
                            severity: 'low',
                            title: 'Preview objetivo generado',
                            description: preview.summary,
                            sessionId,
                            tool: 'create_objective',
                            responseSource: 'deterministic_objective_preview',
                            metadata: { title: objectiveIntent.title, period: periodNormalization.value, areaId: normalizedAreaId || null },
                        });

                        return res.json({
                            sessionId,
                            response: preview.summary,
                            tool: 'create_objective',
                            actionId,
                            preview,
                            requiresConfirmation: true,
                            expiresAt,
                            pendingAction: true,
                            responseSource: 'deterministic_objective_preview',
                        });
                    }
                }

                const pendingActionId = makeId('pa');
                initializePendingAction(db, sessionId, 'create_objective', objectiveIntent.title, pendingActionId);
                const askPeriod = 'Para completar este objetivo solo falta: ¿Para que periodo es? (Ejemplo: "primer semestre 2026", "2026-Q2")';
                storeMessage(db, sessionId, 'coach', askPeriod);
                logQualityEvent(db, makeId, {
                    eventType: 'generated',
                    kind: 'slot_fill_started',
                    severity: 'low',
                    title: 'Inicio de slot filling',
                    description: 'Se inicio flujo de objetivo pendiente por falta de periodo.',
                    sessionId,
                    tool: 'create_objective',
                    responseSource: 'deterministic_objective_slot_fill',
                    metadata: { title: objectiveIntent.title },
                });

                return res.json({
                    sessionId,
                    response: askPeriod,
                    tool: 'create_objective',
                    actionId: null,
                    preview: null,
                    requiresConfirmation: false,
                    pendingAction: true,
                    missingSlot: 'period',
                    responseSource: 'deterministic_objective_slot_fill',
                });
            }

            // Deterministic continuation: if coach offered to create reminder and user answered "si",
            // convert it into a concrete pending action instead of losing context.
            if (isAffirmativeMessage(message)) {
                const lastCoach = db.queryOne(
                    'SELECT content FROM coach_messages WHERE session_id = ? AND role = ? ORDER BY created_at DESC LIMIT 1',
                    [sessionId, 'coach']
                );
                if (looksLikeInboxOffer(lastCoach?.content)) {
                    const previousUserRows = db.query(
                        'SELECT content FROM coach_messages WHERE session_id = ? AND role = ? ORDER BY created_at DESC LIMIT 3',
                        [sessionId, 'user']
                    );
                    const inferredGoal = previousUserRows?.[1]?.content || previousUserRows?.[2]?.content || '';
                    const text = String(inferredGoal || '').trim().replace(/^quiero\s+/i, '').trim() || String(inferredGoal || '').trim();

                    if (text) {
                        const category = inferAreaFromText(text);
                        const build = await buildMutationPreview('create_inbox_item', {
                            text,
                            type: 'personal',
                            category,
                            areaId: category,
                        }, toolDeps);

                        const preview = build?.preview;
                        if (preview && !preview.noAction) {
                            const actionId = makeId('act');
                            const expiresAt = new Date(Date.now() + ACTION_TTL_MS).toISOString();

                            storeMessage(db, sessionId, 'coach', preview.summary, {
                                toolName: 'create_inbox_item',
                                actionId,
                                actionPreview: { ...preview, toolName: 'create_inbox_item', expiresAt },
                                actionStatus: 'pending',
                            });
                            logQualityEvent(db, makeId, {
                                eventType: 'generated',
                                kind: 'affirmative_followup_resolved',
                                severity: 'low',
                                title: 'Follow-up afirmativo resuelto',
                                description: 'Mensaje corto afirmativo convertido a accion concreta.',
                                sessionId,
                                tool: 'create_inbox_item',
                                responseSource: 'affirmative_continuation_preview',
                            });

                            return res.json({
                                sessionId,
                                response: preview.summary,
                                tool: 'create_inbox_item',
                                actionId,
                                preview,
                                requiresConfirmation: true,
                                expiresAt,
                                pendingAction: true,
                                responseSource: 'affirmative_continuation_preview',
                            });
                        }
                    }
                }
            }

            // Deterministic listing for "Esta Semana" folder queries
            if (isThisWeekFolderQuery(message)) {
                const data = await readJson('tasks-data.json');
                const tasks = (data.tasks || []).filter(t => t.thisWeek && t.status === 'active');
                const response = formatThisWeekList(tasks);
                storeMessage(db, sessionId, 'coach', response);
                logQualityEvent(db, makeId, {
                    eventType: 'generated',
                    kind: 'this_week_list',
                    severity: 'low',
                    title: 'Listado Esta Semana',
                    description: response,
                    sessionId,
                    responseSource: 'deterministic_this_week_list',
                });
                return res.json({
                    sessionId,
                    response,
                    tool: null,
                    actionId: null,
                    preview: null,
                    requiresConfirmation: false,
                    responseSource: 'deterministic_this_week_list',
                });
            }

            // Deterministic "how to use app" guidance before LLM/fallbacks.
            if (isHowToQuestion(message)) {
                const howTo = buildHowToGuide(message);
                storeMessage(db, sessionId, 'coach', howTo);
                logQualityEvent(db, makeId, {
                    eventType: 'generated',
                    kind: 'howto_guidance',
                    severity: 'low',
                    title: 'Guia de uso de app',
                    description: howTo,
                    sessionId,
                    responseSource: 'howto_guide',
                });
                return res.json({
                    sessionId,
                    response: howTo,
                    tool: null,
                    actionId: null,
                    preview: null,
                    requiresConfirmation: false,
                    degraded: false,
                    responseSource: 'howto_guide',
                });
            }

            // ── LLM Agent Layer (Fase 9.1) ───────────────────────

            if (isLLMAgentEnabled()) {
                try {
                    // Load memory for context
                    const memory = loadMemory(db, 10);

                    // Process with LLM
                    const llmResult = await processWithLLM(message, {
                        sessionId,
                        mode: sessionMode,
                        memory,
                    }, toolDeps);

                    // Handle LLM response types
                    if (llmResult.type === 'text') {
                        // Plain text response
                        const quality = await ensureCoachResponseQuality(db, message, llmResult.response, {
                            degraded: false,
                        });
                        storeMessage(db, sessionId, 'coach', quality.response);
                        logQualityEvent(db, makeId, {
                            eventType: 'generated',
                            kind: quality.replaced ? 'vague_replaced' : 'llm_text',
                            severity: quality.replaced ? 'medium' : 'low',
                            title: quality.replaced ? 'Respuesta vaga reemplazada' : 'Respuesta LLM',
                            description: quality.response,
                            sessionId,
                            responseSource: quality.replaced ? 'quality_fallback' : 'llm',
                        });
                        return res.json({
                            sessionId,
                            response: quality.response,
                            tool: null,
                            actionId: null,
                            preview: null,
                            requiresConfirmation: false,
                            llmPowered: true,
                            degraded: quality.replaced,
                            responseSource: quality.replaced ? 'quality_fallback' : 'llm',
                        });
                    }

                    if (llmResult.type === 'blocked') {
                        // Guardrail blocked the action
                        storeMessage(db, sessionId, 'coach', llmResult.response);
                        logCoachEvent(db, 'blocked', llmResult.tool, null, { reason: llmResult.response });
                        logQualityEvent(db, makeId, {
                            eventType: 'rejected',
                            kind: 'guardrail_block',
                            severity: 'medium',
                            title: 'Accion bloqueada por guardrails',
                            description: llmResult.response,
                            sessionId,
                            tool: llmResult.tool,
                            responseSource: 'llm',
                        });
                        return res.json({
                            sessionId,
                            response: llmResult.response,
                            tool: llmResult.tool,
                            actionId: null,
                            preview: null,
                            requiresConfirmation: false,
                            llmPowered: true,
                            blocked: true,
                        });
                    }

                    if (llmResult.type === 'mutation') {
                        // Mutation preview â€” needs confirmation
                        const actionId = makeId('act');
                        const expiresAt = new Date(Date.now() + ACTION_TTL_MS).toISOString();
                        const mutationResponse = isVagueCoachResponse(llmResult.response)
                            ? (llmResult.preview?.summary || 'Propuesta lista para confirmar.')
                            : llmResult.response;

                        storeMessage(db, sessionId, 'coach', mutationResponse, {
                            toolName: llmResult.tool,
                            actionId,
                            actionPreview: { ...llmResult.preview, toolName: llmResult.tool, expiresAt },
                            actionStatus: 'pending',
                        });

                        logCoachEvent(db, 'generated', llmResult.tool, llmResult.preview, null);
                        logQualityEvent(db, makeId, {
                            eventType: 'generated',
                            kind: 'llm_mutation_preview',
                            severity: 'low',
                            title: 'Preview de mutacion generado',
                            description: mutationResponse,
                            sessionId,
                            tool: llmResult.tool,
                            responseSource: isVagueCoachResponse(llmResult.response) ? 'preview_summary' : 'llm',
                        });

                        return res.json({
                            sessionId,
                            response: mutationResponse,
                            tool: llmResult.tool,
                            actionId,
                            preview: llmResult.preview,
                            requiresConfirmation: llmResult.requiresConfirmation,
                            expiresAt,
                            llmPowered: true,
                            responseSource: isVagueCoachResponse(llmResult.response) ? 'preview_summary' : 'llm',
                        });
                    }

                    // Fallthrough â€” unexpected type
                    throw new Error(`Unexpected LLM result type: ${llmResult.type}`);
                } catch (llmError) {
                    // LLM failed â€” fallback to Phase 9 intent matching
                    llmFallback = { reason: classifyLlmError(llmError) };
                    logger.warn('LLM agent failed, falling back to Phase 9 intent matcher', {
                        error: llmError.message,
                        sessionId,
                        llmFallbackReason: llmFallback.reason,
                    });
                    // Continue to fallback below
                }
            }

            // â”€â”€ Fallback: Phase 9 Intent Matching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

            // Match intent
            const toolName = matchIntent(message);

            if (!toolName) {
                if (isHowToQuestion(message)) {
                    const howTo = buildHowToGuide(message);
                    storeMessage(db, sessionId, 'coach', howTo);
                    logQualityEvent(db, makeId, {
                        eventType: 'generated',
                        kind: 'howto_guidance',
                        severity: 'low',
                        title: 'Guia de uso de app',
                        description: howTo,
                        sessionId,
                        responseSource: 'howto_guide',
                    });
                    return res.json({
                        sessionId,
                        response: howTo,
                        tool: null,
                        actionId: null,
                        preview: null,
                        requiresConfirmation: false,
                        degraded: false,
                        responseSource: 'howto_guide',
                    });
                }
                // No tool matched â€” contextual text response
                const generated = await generateContextualResponse(message, toolDeps);
                const quality = await ensureCoachResponseQuality(db, message, generated, {
                    degraded: Boolean(llmFallback),
                    reason: llmFallback?.reason || null,
                });
                storeMessage(db, sessionId, 'coach', quality.response);
                logQualityEvent(db, makeId, {
                    eventType: 'generated',
                    kind: quality.replaced ? 'phase9_vague_replaced' : 'phase9_contextual',
                    severity: quality.replaced ? 'medium' : 'low',
                    title: quality.replaced ? 'Fallback contextual reemplazo respuesta vaga' : 'Fallback contextual',
                    description: quality.response,
                    sessionId,
                    responseSource: llmFallback ? 'phase9_fallback' : (quality.replaced ? 'quality_fallback' : 'phase9_contextual'),
                });

                return res.json({
                    sessionId,
                    response: quality.response,
                    tool: null,
                    actionId: null,
                    preview: null,
                    requiresConfirmation: false,
                    degraded: Boolean(llmFallback) || quality.replaced,
                    responseSource: llmFallback ? 'phase9_fallback' : (quality.replaced ? 'quality_fallback' : 'phase9_contextual'),
                });
            }

            // Tool matched â€” run preview
            const toolDef = TOOL_DEFINITIONS[toolName];
            const preview = await runToolPreview(toolName, message);

            if (!preview) {
                const fallback = `Herramienta "${toolName}" no disponible en este momento.`;
                storeMessage(db, sessionId, 'coach', fallback);
                return res.json({ sessionId, response: fallback, tool: toolName, actionId: null, requiresConfirmation: false });
            }

            // Build response text
            const response = preview.summary;

            // If tool is read-only (noAction) or non-mutating, no confirmation needed
            if (preview.noAction || !toolDef.mutating) {
                storeMessage(db, sessionId, 'coach', response, { toolName });
                logCoachEvent(db, 'generated', toolName, preview, null);

                return res.json({
                    sessionId,
                    response,
                    tool: toolName,
                    actionId: null,
                    preview,
                    requiresConfirmation: false,
                });
            }

            // Mutating tool â€” create pending action
            const actionId = makeId('act');
            const expiresAt = new Date(Date.now() + ACTION_TTL_MS).toISOString();

            storeMessage(db, sessionId, 'coach', response, {
                toolName,
                actionId,
                actionPreview: { ...preview, toolName, expiresAt },
                actionStatus: 'pending',
            });

            logCoachEvent(db, 'generated', toolName, preview, null);

            return res.json({
                sessionId,
                response,
                tool: toolName,
                actionId,
                preview,
                requiresConfirmation: true,
                expiresAt,
            });
        } catch (error) {
            logger.error('Coach chat message failed', { error: error.message });
            try {
                const safeFallback = await buildDataBackedFallback(req.body?.message || '', {
                    degraded: true,
                    reason: 'message_handler_error',
                });
                return res.status(200).json({
                    sessionId: req.body?.sessionId || null,
                    response: safeFallback,
                    tool: null,
                    actionId: null,
                    preview: null,
                    requiresConfirmation: false,
                    degraded: true,
                    responseSource: 'handler_fallback',
                });
            } catch (_fallbackError) {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // â”€â”€â”€ POST /api/coach/chat/confirm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    app.post('/api/coach/chat/confirm', validate(CoachChatConfirmSchema), async (req, res) => {
        try {
            const { actionId, confirm, sessionId } = req.validatedBody;
            const db = await getDb();

            // Find the pending action
            const actionMsg = db.queryOne(
                `SELECT * FROM coach_messages WHERE action_id = ? AND action_status = 'pending'`,
                [actionId]
            );

            if (!actionMsg) {
                return res.status(404).json({ error: 'Accion no encontrada o ya procesada' });
            }

            // Check TTL
            const preview = JSON.parse(actionMsg.action_preview || '{}');
            const expiresAt = preview.expiresAt ? new Date(preview.expiresAt).getTime() : 0;
            if (expiresAt > 0 && Date.now() > expiresAt) {
                db.exec(
                    `UPDATE coach_messages SET action_status = 'expired' WHERE action_id = ?`,
                    [actionId]
                );
                // AR-001: Clear conversation state on expiration
                completePendingAction(db, sessionId);

                return res.status(410).json({ error: 'Accion expirada. Solicita una nueva propuesta.' });
            }

            // Cancel flow
            if (!confirm) {
                db.exec(
                    `UPDATE coach_messages SET action_status = 'cancelled' WHERE action_id = ?`,
                    [actionId]
                );
                // AR-001: Clear conversation state on cancel
                completePendingAction(db, sessionId);

                const cancelMsg = 'Accion cancelada. No se realizaron cambios.';
                storeMessage(db, sessionId, 'coach', cancelMsg);
                logCoachEvent(db, 'rejected', preview.toolName || 'unknown', preview, null);

                return res.json({
                    executed: false,
                    actionId,
                    response: cancelMsg,
                });
            }

            // Confirm flow â€” execute
            const toolName = preview.toolName || actionMsg.tool_name;
            const result = await runToolExecute(toolName, preview);

            // Update action status
            db.exec(
                `UPDATE coach_messages SET action_status = 'confirmed' WHERE action_id = ?`,
                [actionId]
            );

            // AR-001: Clear conversation state on execute
            completePendingAction(db, sessionId);

            // Build result message
            const resultMsg = result.success
                ? `Listo! ${result.message || 'Accion ejecutada correctamente.'}`
                : `Error: ${result.message || 'No se pudo ejecutar la accion.'}`;

            storeMessage(db, sessionId, 'coach', resultMsg, {
                toolName,
                actionId: `${actionId}-result`,
            });

            logCoachEvent(db, 'applied', toolName, preview, result);

            return res.json({
                executed: true,
                actionId,
                result,
                response: resultMsg,
            });
        } catch (error) {
            logger.error('Coach chat confirm failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â”€â”€â”€ GET /api/coach/chat/history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    app.get('/api/coach/chat/history', async (req, res) => {
        try {
            const db = await getDb();
            const { sessionId, limit: limitStr } = req.query;
            const limit = parseInt(limitStr) || 50;

            if (!sessionId) {
                // Return recent sessions
                const sessions = db.query(
                    'SELECT * FROM coach_sessions ORDER BY started_at DESC LIMIT ?',
                    [10]
                );
                return res.json({
                    sessions: sessions.map(s => ({
                        id: s.id,
                        mode: s.mode,
                        startedAt: s.started_at,
                        endedAt: s.ended_at,
                        messageCount: s.message_count,
                        summary: s.summary,
                    })),
                });
            }

            // Return messages for a session
            const session = db.queryOne('SELECT * FROM coach_sessions WHERE id = ?', [sessionId]);
            if (!session) {
                return res.status(404).json({ error: 'Session no encontrada' });
            }

            const messages = db.query(
                'SELECT * FROM coach_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?',
                [sessionId, limit]
            );

            return res.json({
                sessionId,
                mode: session.mode,
                startedAt: session.started_at,
                messages: messages.map(m => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    tool: m.tool_name,
                    actionId: m.action_id,
                    actionStatus: m.action_status,
                    actionPreview: m.action_preview ? JSON.parse(m.action_preview) : null,
                    createdAt: m.created_at,
                })),
            });
        } catch (error) {
            logger.error('Coach chat history failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â”€â”€â”€ GET /api/coach/chat/proactive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    app.get('/api/coach/chat/proactive', async (req, res) => {
        try {
            if (!isLLMAgentEnabled()) {
                return res.json({ shouldShow: false });
            }

            const db = await getDb();
            const proactiveCheck = shouldTriggerProactive(db);

            if (!proactiveCheck.shouldTrigger) {
                return res.json({ shouldShow: false });
            }

            // Generate proactive message
            const message = await generateProactiveMessage(proactiveCheck.type, toolDeps);

            if (!message) {
                return res.json({ shouldShow: false });
            }

            // Log event to prevent re-triggering
            logCoachEvent(db, 'generated', `proactive:${proactiveCheck.type}`, null, {
                message,
                reason: proactiveCheck.reason,
            });

            return res.json({
                shouldShow: true,
                type: proactiveCheck.type,
                message,
                reason: proactiveCheck.reason,
            });
        } catch (error) {
            logger.error('Proactive check failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â”€â”€â”€ POST /api/coach/chat/style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    app.post('/api/coach/chat/style', async (req, res) => {
        try {
            const { tone, insistence, brevity } = req.body;

            // Validate
            const validTones = ['directo', 'suave'];
            const validInsistence = ['baja', 'media', 'alta'];
            const validBrevity = ['breve', 'detallado'];

            if (tone && !validTones.includes(tone)) {
                return res.status(400).json({ error: 'Invalid tone' });
            }
            if (insistence && !validInsistence.includes(insistence)) {
                return res.status(400).json({ error: 'Invalid insistence' });
            }
            if (brevity && !validBrevity.includes(brevity)) {
                return res.status(400).json({ error: 'Invalid brevity' });
            }

            // Update config
            const data = await readJson('tasks-data.json');
            data.coachStyle = {
                ...data.coachStyle,
                ...(tone && { tone }),
                ...(insistence && { insistence }),
                ...(brevity && { brevity }),
            };
            await writeJson('tasks-data.json', data);

            // Store in memory
            const db = await getDb();
            if (tone) storeMemory(db, 'coach_style_tone', tone, 1.0);
            if (insistence) storeMemory(db, 'coach_style_insistence', insistence, 1.0);
            if (brevity) storeMemory(db, 'coach_style_brevity', brevity, 1.0);

            return res.json({
                success: true,
                coachStyle: data.coachStyle,
            });
        } catch (error) {
            logger.error('Coach style update failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â”€â”€â”€ GET /api/coach/chat/style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    app.get('/api/coach/chat/style', async (req, res) => {
        try {
            const data = await readJson('tasks-data.json');
            return res.json({
                coachStyle: data.coachStyle || {
                    tone: 'directo',
                    insistence: 'media',
                    brevity: 'breve',
                },
            });
        } catch (error) {
            logger.error('Coach style fetch failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â”€â”€â”€ GET /api/coach/diagnosis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Fase 10.2: DiagnÃ³stico de carga automÃ¡tico

    app.get('/api/coach/diagnosis', async (req, res) => {
        try {
            if (!interventionEnabled) {
                return res.status(404).json({ error: 'Coach intervention disabled by feature flag' });
            }
            const { diagnoseLoadState } = await import('../helpers/coach-capacity-diagnosis.js');
            const diagnosis = await diagnoseLoadState(toolDeps);
            return res.json(diagnosis);
        } catch (error) {
            logger.error('Diagnosis failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â”€â”€â”€ GET /api/coach/checkin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Fase 10.2: Check-in nocturno (trigger)

    app.get('/api/coach/checkin', async (req, res) => {
        try {
            if (!interventionEnabled || !checkinEnabled) {
                return res.status(404).json({ error: 'Coach check-in disabled by feature flag' });
            }
            const { shouldTriggerCheckin, generateCheckinMessage } = await import('../helpers/coach-checkin.js');
            const db = await getDb();
            const check = shouldTriggerCheckin(db);

            if (!check.should) {
                return res.json({ shouldShow: false, reason: check.reason });
            }

            const checkin = await generateCheckinMessage(toolDeps);

            // Log event to prevent re-triggering
            logCoachEvent(db, 'generated', 'checkin:evening', null, { message: checkin.message });

            return res.json({
                shouldShow: true,
                message: checkin.message,
                data: checkin.data,
            });
        } catch (error) {
            logger.error('Checkin trigger failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â”€â”€â”€ POST /api/coach/checkin/response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Fase 10.2: Process check-in response

    app.post('/api/coach/checkin/response', async (req, res) => {
        try {
            if (!interventionEnabled || !checkinEnabled) {
                return res.status(404).json({ error: 'Coach check-in disabled by feature flag' });
            }
            const { processCheckinResponse } = await import('../helpers/coach-checkin.js');
            const { response, checkinData } = req.body;

            if (!response) {
                return res.status(400).json({ error: 'Response required' });
            }

            const result = await processCheckinResponse(response, checkinData || {}, toolDeps);

            return res.json(result);
        } catch (error) {
            logger.error('Checkin response processing failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â”€â”€â”€ GET /api/coach/patterns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Fase 10.2: Get all patterns for display

    app.get('/api/coach/patterns', async (req, res) => {
        try {
            if (!interventionEnabled) {
                return res.status(404).json({ error: 'Coach intervention disabled by feature flag' });
            }
            const { getAllPatterns } = await import('../helpers/coach-pattern-memory.js');
            const db = await getDb();
            const patterns = getAllPatterns(db);
            return res.json({ patterns });
        } catch (error) {
            logger.error('Get patterns failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â"€â"€â"€ POST /api/coach/patterns/analyze â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    // Fase 10.2: Trigger pattern analysis

    app.post('/api/coach/patterns/analyze', async (req, res) => {
        try {
            if (!interventionEnabled) {
                return res.status(404).json({ error: 'Coach intervention disabled by feature flag' });
            }
            const { analyzeCompletionPatterns } = await import('../helpers/coach-pattern-memory.js');
            const result = await analyzeCompletionPatterns(toolDeps);
            return res.json(result);
        } catch (error) {
            logger.error('Pattern analysis failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â"€â"€â"€ GET /api/activity â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    // Fase 10.3B: Unified activity log (coach events + quality events + usage events)

    app.get('/api/activity', async (req, res) => {
        try {
            const db = await getDb();
            const { limit: limitStr, offset: offsetStr, type } = req.query;
            const limit = parseInt(limitStr) || 50;
            const offset = parseInt(offsetStr) || 0;

            // Build WHERE clause
            const conditions = [];
            const params = [];

            if (type) {
                conditions.push('event_type = ?');
                params.push(type);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            // Get coach_events as activity source
            const events = db.query(`
                SELECT
                    id,
                    event_type,
                    rule_id,
                    severity,
                    title,
                    description,
                    reason,
                    suggested_action,
                    action_result,
                    created_at
                FROM coach_events
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const total = db.queryOne(`
                SELECT COUNT(*) as count FROM coach_events ${whereClause}
            `, params)?.count || 0;

            const activities = events.map(e => ({
                id: e.id,
                type: e.event_type,
                category: e.rule_id?.startsWith('quality:') ? 'quality' :
                          e.rule_id?.startsWith('chat_tool:') ? 'chat_action' :
                          e.rule_id?.startsWith('proactive:') ? 'proactive' :
                          e.rule_id?.startsWith('checkin:') ? 'checkin' :
                          'recommendation',
                severity: e.severity,
                title: e.title,
                description: e.description,
                reason: e.reason,
                suggestedAction: e.suggested_action ? JSON.parse(e.suggested_action) : null,
                result: e.action_result ? JSON.parse(e.action_result) : null,
                timestamp: e.created_at,
            }));

            return res.json({
                activities,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total,
                },
            });
        } catch (error) {
            logger.error('Activity log failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â"€â"€â"€ GET /api/coach/metrics â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    // Fase 10.3B: Aggregated quality metrics

    app.get('/api/coach/metrics', async (req, res) => {
        try {
            const db = await getDb();
            const { period } = req.query; // 'day', 'week', 'month', 'all' (default: week)
            const periodFilter = period || 'week';

            // Calculate date range
            let sinceDate = null;
            const now = new Date();
            if (periodFilter === 'day') {
                sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            } else if (periodFilter === 'week') {
                sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (periodFilter === 'month') {
                sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }

            const dateFilter = sinceDate ? 'AND created_at >= ?' : '';
            const dateParams = sinceDate ? [sinceDate.toISOString()] : [];

            // Quality events metrics
            const qualityEvents = db.query(`
                SELECT rule_id, COUNT(*) as count
                FROM coach_events
                WHERE rule_id LIKE 'quality:%' ${dateFilter}
                GROUP BY rule_id
            `, dateParams);

            const qualityMetrics = {};
            qualityEvents.forEach(e => {
                const key = e.rule_id.replace('quality:', '');
                qualityMetrics[key] = e.count;
            });

            // Context loss rate (vague replacements / total responses)
            const totalResponses = db.queryOne(`
                SELECT COUNT(*) as count FROM coach_events
                WHERE event_type = 'generated' ${dateFilter}
            `, dateParams)?.count || 0;

            const vagueReplaced = qualityMetrics.vague_replaced || 0;
            const contextLossRate = totalResponses > 0 ? (vagueReplaced / totalResponses) : 0;

            // Recommendation acceptance rate (applied / (applied + rejected))
            const applied = db.queryOne(`
                SELECT COUNT(*) as count FROM coach_events
                WHERE event_type = 'applied' ${dateFilter}
            `, dateParams)?.count || 0;

            const rejected = db.queryOne(`
                SELECT COUNT(*) as count FROM coach_events
                WHERE event_type = 'rejected' ${dateFilter}
            `, dateParams)?.count || 0;

            const acceptanceRate = (applied + rejected) > 0 ? (applied / (applied + rejected)) : 0;

            // Slot filling success (completed / started)
            const slotFillStarted = qualityMetrics.slot_fill_started || 0;
            const slotFillCompleted = qualityMetrics.pending_slots_ready || 0;
            const slotCompletionRate = slotFillStarted > 0 ? (slotFillCompleted / slotFillStarted) : 0;

            // How-to questions answered
            const howToCount = qualityMetrics.howto_guidance || 0;

            // Multi-turn flow metrics
            const pendingMissingSlotsCount = qualityMetrics.pending_missing_slot || 0;

            return res.json({
                period: periodFilter,
                since: sinceDate ? sinceDate.toISOString() : null,
                metrics: {
                    totalResponses,
                    contextLossRate: parseFloat(contextLossRate.toFixed(4)),
                    acceptanceRate: parseFloat(acceptanceRate.toFixed(4)),
                    slotCompletionRate: parseFloat(slotCompletionRate.toFixed(4)),
                    recommendationsApplied: applied,
                    recommendationsRejected: rejected,
                    vagueResponsesReplaced: vagueReplaced,
                    howToQuestionsAnswered: howToCount,
                    multiTurnFlowsInProgress: pendingMissingSlotsCount,
                },
                breakdown: qualityMetrics,
            });
        } catch (error) {
            logger.error('Metrics calculation failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // â"€â"€â"€ GET /api/coach/metrics/weekly â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    // Fase 10.3B: Weekly quality report

    app.get('/api/coach/metrics/weekly', async (req, res) => {
        try {
            const db = await getDb();
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Get all metrics for the week using direct DB queries
            const weekAgoStr = weekAgo.toISOString();

            const totalResponses = db.queryOne(`
                SELECT COUNT(*) as count FROM coach_events
                WHERE event_type = 'generated' AND created_at >= ?
            `, [weekAgoStr])?.count || 0;

            const vagueReplaced = db.queryOne(`
                SELECT COUNT(*) as count FROM coach_events
                WHERE rule_id = 'quality:vague_replaced' AND created_at >= ?
            `, [weekAgoStr])?.count || 0;

            const applied = db.queryOne(`
                SELECT COUNT(*) as count FROM coach_events
                WHERE event_type = 'applied' AND created_at >= ?
            `, [weekAgoStr])?.count || 0;

            const rejected = db.queryOne(`
                SELECT COUNT(*) as count FROM coach_events
                WHERE event_type = 'rejected' AND created_at >= ?
            `, [weekAgoStr])?.count || 0;

            const contextLossRate = totalResponses > 0 ? (vagueReplaced / totalResponses) : 0;
            const acceptanceRate = (applied + rejected) > 0 ? (applied / (applied + rejected)) : 0;

            // Calculate adherence (tasks completed this week)
            const data = await readJson('tasks-data.json');
            const tasks = data.tasks || [];
            const thisWeekTasks = tasks.filter(t => t.thisWeek && t.status === 'active');
            const completedThisWeek = tasks.filter(t => t.thisWeek && t.status === 'done');
            const adherenceRate = thisWeekTasks.length > 0
                ? completedThisWeek.length / (thisWeekTasks.length + completedThisWeek.length)
                : 0;

            // Get objectives progress
            const objectives = db.query(`
                SELECT id, title, status, progress
                FROM objectives
                WHERE status = 'active'
            `);

            const objectivesAtRisk = objectives.filter(o => o.progress < 30).length;

            // Top wins and failures
            const wins = [];
            const failures = [];

            if (acceptanceRate >= 0.7) {
                wins.push(`Alta tasa de aceptacion de recomendaciones (${(acceptanceRate * 100).toFixed(1)}%)`);
            }
            if (contextLossRate <= 0.1) {
                wins.push(`Baja tasa de perdida de contexto (${(contextLossRate * 100).toFixed(1)}%)`);
            }
            if (adherenceRate >= 0.6) {
                wins.push(`Buena adherencia semanal (${(adherenceRate * 100).toFixed(1)}%)`);
            }

            if (contextLossRate > 0.2) {
                failures.push(`Alta perdida de contexto (${(contextLossRate * 100).toFixed(1)}%) - revisar respuestas vagas`);
            }
            if (acceptanceRate < 0.5) {
                failures.push(`Baja aceptacion de recomendaciones (${(acceptanceRate * 100).toFixed(1)}%) - revisar calidad`);
            }
            if (objectivesAtRisk > 0) {
                failures.push(`${objectivesAtRisk} objetivo(s) en riesgo (< 30% progreso)`);
            }

            // Recommended fixes
            const fixes = [];
            if (contextLossRate > 0.15) {
                fixes.push('Mejorar slot normalization para reducir respuestas vagas');
            }
            if (adherenceRate < 0.5) {
                fixes.push('Validar sobrecarga de capacidad semanal');
            }

            return res.json({
                period: 'week',
                since: weekAgo.toISOString(),
                until: now.toISOString(),
                summary: {
                    totalResponses,
                    contextLossRate: parseFloat(contextLossRate.toFixed(4)),
                    acceptanceRate: parseFloat(acceptanceRate.toFixed(4)),
                    adherenceRate: parseFloat(adherenceRate.toFixed(4)),
                    objectivesAtRisk,
                },
                wins,
                failures,
                recommendedFixes: fixes,
            });
        } catch (error) {
            logger.error('Weekly report failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });
}

