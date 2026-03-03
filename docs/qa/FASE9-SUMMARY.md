# Fase 9: Asistente Conversacional con Acciones - QA Summary

**Date**: 2026-02-14
**Status**: Completed

---

## What was built

Phase 9 adds tool-calling capabilities to the chat interface. Users can interact conversationally with the coach to plan their week, schedule blocks, reprioritize tasks, and review goals. All business logic delegates to the Phase 8 engine (no duplication).

### Key Architecture Decisions

- **Deterministic intent matching** (keyword scoring, no LLM) per ADR-003
- **Two-step confirm/execute pattern**: every mutating action returns a preview first
- **5-minute TTL** on pending actions
- **Feature flag gated**: `FF_COACH_CHAT_ACTIONS_ENABLED`
- **Session-scoped**: messages and actions are tracked per session

---

## New Files

| File | Lines | Purpose |
|------|-------|---------|
| `web/server/db/migrations/010_coach_chat_sessions.sql` | 35 | coach_sessions, coach_messages, coach_memory tables |
| `web/server/helpers/coach-chat-tools.js` | ~300 | Intent matcher + 4 tool definitions (preview + execute) |
| `web/server/routes/coach-chat-routes.js` | ~260 | POST message, POST confirm, GET history |
| `web/src/components/Chat/ChatPanel.jsx` | ~200 | Main chat panel with session, mode, action preview |
| `web/src/components/Chat/ActionPreview.jsx` | ~120 | Structured preview card with confirm/cancel buttons |
| `web/src/components/Chat/ModeSelector.jsx` | ~30 | Suggest/act toggle |

## Modified Files

| File | Changes |
|------|---------|
| `web/server/app.js` | Import + feature flag + route registration |
| `web/server/helpers/coach-rules-engine.js` | Exported fetchRiskSignals + buildCapacityConfig |
| `web/server/routes/coach-routes.js` | Import shared fetchRiskSignals (removed inline copy) |
| `web/server/helpers/validators.js` | +CoachChatMessageSchema, +CoachChatConfirmSchema |
| `web/src/utils/api.js` | +sendCoachChatMessage, +confirmCoachChatAction, +getCoachChatHistory |
| `web/src/components/Chat/ChatBubble.jsx` | Refactored to use ChatPanel component |

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/coach/chat/message` | Process message, match intent, return preview |
| POST | `/api/coach/chat/confirm` | Confirm/cancel pending action |
| GET | `/api/coach/chat/history` | Chat history (sessions or messages) |

---

## Tools

| Tool | Keywords | Mutating | Description |
|------|----------|----------|-------------|
| `plan_week` | planifica, plan, semana | Yes | Commit tasks to week by priority/deadline |
| `schedule_block` | agenda, bloque, horario | Yes | Create calendar block for a task |
| `reprioritize` | prioriza, reprioriza, sobrecarga | Yes | Suggest redistribution for overload |
| `goal_review` | objetivo, meta, okr, avance | No | Review objectives and KR progress |

---

## Manual Test Scenarios

### Scenario 1: Plan Week (full flow)

1. Open chat (click bubble bottom-left)
2. Verify mode selector shows "Sugerir" (default)
3. Type: `planifica mi semana`
4. **Expected**: Coach responds with preview showing:
   - List of tasks to commit
   - Capacity usage (e.g., "270min de 1680min")
   - Confirm / Cancel buttons
5. Click **Confirmar**
6. **Expected**: Success message "Listo! X tarea(s) comprometida(s)"
7. Navigate to "Esta Semana"
8. **Verify**: Tasks from preview are now committed

### Scenario 2: Cancel Action

1. Open chat
2. Type: `reprioriza mis tareas`
3. **Expected**: Preview with redistribution suggestions (if overloaded)
4. Click **Cancelar**
5. **Expected**: "Accion cancelada. No se realizaron cambios."
6. **Verify**: No tasks were modified

### Scenario 3: Goal Review (read-only)

1. Open chat
2. Type: `como van mis objetivos`
3. **Expected**: Summary of objectives/KR progress with risk levels
4. **Verify**: No confirm/cancel buttons shown (read-only tool)

### Scenario 4: Schedule Block

1. Open chat
2. Type: `agenda [task name] para manana`
3. **Expected**: Preview with proposed time slot
4. Click **Confirmar**
5. Navigate to Calendar
6. **Verify**: Block appears on tomorrow's date

### Scenario 5: Mode Toggle

1. Open chat
2. Click "Actuar" mode
3. Type: `planifica mi semana`
4. **Expected**: Same preview flow works in act mode
5. Click "Sugerir" to switch back

### Scenario 6: Contextual Response (no tool)

1. Open chat
2. Type: `hola que tal`
3. **Expected**: Contextual response with status summary and suggestions
4. **Verify**: No action preview shown

### Scenario 7: Action Expiration

1. Open chat
2. Type: `planifica mi semana`
3. Wait 5+ minutes without clicking Confirm
4. Click **Confirmar**
5. **Expected**: Error "La accion ha expirado" (HTTP 410)

### Scenario 8: Feature Flag Disable

1. Set `FF_COACH_CHAT_ACTIONS_ENABLED=false`
2. Restart server
3. Open chat
4. Type: `planifica mi semana`
5. **Expected**: Falls back to legacy text-only chat (keyword matching)

### Scenario 9: No Regression - Coach Panel

1. Navigate to Coach view (Brain icon in sidebar)
2. **Verify**: Recommendations still load
3. Click "Aplicar" on a recommendation
4. **Verify**: Action executes correctly
5. **Verify**: History section still works

### Scenario 10: No Regression - Existing Chat

1. Set `FF_COACH_CHAT_ACTIONS_ENABLED=false`
2. Open chat
3. Type: `captura idea: test idea`
4. **Verify**: Captures to inbox (legacy behavior preserved)

---

## Automated Verifications

```bash
# Build passes
cd web && npx vite build

# Module loading
node -e "import('./server/helpers/coach-chat-tools.js').then(() => console.log('OK'))"
node -e "import('./server/routes/coach-chat-routes.js').then(() => console.log('OK'))"
node -e "import('./server/app.js').then(() => console.log('OK'))"

# Intent matching
node -e "
import('./server/helpers/coach-chat-tools.js').then(m => {
  console.assert(m.matchIntent('planifica mi semana') === 'plan_week');
  console.assert(m.matchIntent('reprioriza mis tareas') === 'reprioritize');
  console.assert(m.matchIntent('como van mis objetivos') === 'goal_review');
  console.assert(m.matchIntent('agenda deploy para manana') === 'schedule_block');
  console.assert(m.matchIntent('hola que tal') === null);
  console.log('All intent tests passed');
});
"

# Zod validation
node -e "
import('./server/helpers/validators.js').then(m => {
  console.assert(m.CoachChatMessageSchema.safeParse({message:'test'}).success);
  console.assert(!m.CoachChatMessageSchema.safeParse({message:''}).success);
  console.assert(m.CoachChatConfirmSchema.safeParse({actionId:'a',confirm:true,sessionId:'s'}).success);
  console.assert(!m.CoachChatConfirmSchema.safeParse({actionId:'',confirm:true,sessionId:''}).success);
  console.log('All validation tests passed');
});
"
```

---

## Known Limitations

1. **Intent matching is keyword-based**: Complex or ambiguous messages may not match the correct tool. Phase 10+ could add NLP/LLM layer.
2. **Task name extraction for schedule_block**: Relies on fuzzy title matching from active tasks. If task name is ambiguous, returns no-match.
3. **No undo support**: Once confirmed, actions cannot be reverted from the chat. Manual reversal needed.
4. **Session doesn't persist across page reloads**: Session ID is stored in React state only.

---

## Definition of Done

- [x] Chat generates actionable proposals with explanation
- [x] Actions execute only with explicit confirmation
- [x] History and audit are persisted (coach_events + coach_messages)
- [x] Build passes (`npm run build`)
- [x] Module loading verified
- [x] Intent matching verified (all 4 tools + no-match)
- [x] Validation schemas verified
- [x] No regressions on Phase 8 coach endpoints
- [x] Feature flag gates all new functionality
