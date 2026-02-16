# Integration Contracts (Fase 7+)

Date: 2026-02-14
Status: Draft v1

## Goal

Define contracts between current modules (tasks/projects/calendar/capacity/areas) and new modules (objectives/key_results/coach tools) with backward compatibility.

## 1) Canonical field contracts

| Domain | Canonical field | Compatibility alias | Required |
|---|---|---|---|
| Area relation | `areaId` | `category` | Yes (new records) |
| Task strategic link | `keyResultId` | none | No (Phase 7 start) |
| Project strategic link | `objectiveId` | none | No (Phase 7 start) |

Rules:
- API responses should include canonical fields.
- During migration window, requests may include `category`; backend maps to `areaId`.

## 2) Objectives contracts

### `POST /api/objectives`

Request:
```json
{
  "title": "Grow coaching revenue Q2",
  "period": "2026-Q2",
  "status": "active",
  "areaId": "area_work",
  "description": "Main quarterly objective"
}
```

Response:
```json
{
  "id": "obj_123",
  "title": "Grow coaching revenue Q2",
  "period": "2026-Q2",
  "status": "active",
  "areaId": "area_work",
  "progress": 0,
  "createdAt": "2026-02-14T00:00:00.000Z",
  "updatedAt": "2026-02-14T00:00:00.000Z"
}
```

### `GET /api/objectives`

Query params:
- `status=active|paused|done`
- `period=YYYY-QN`
- `areaId=<id>`

## 3) Key Results contracts

### `POST /api/key-results`

Request:
```json
{
  "objectiveId": "obj_123",
  "title": "Reach $30k MRR",
  "metricType": "number",
  "startValue": 10000,
  "targetValue": 30000,
  "currentValue": 10000,
  "unit": "usd"
}
```

Response:
```json
{
  "id": "kr_123",
  "objectiveId": "obj_123",
  "title": "Reach $30k MRR",
  "metricType": "number",
  "startValue": 10000,
  "targetValue": 30000,
  "currentValue": 10000,
  "progress": 0,
  "status": "on_track"
}
```

### `PATCH /api/key-results/:id/progress`

Request:
```json
{
  "currentValue": 12500
}
```

Response:
```json
{
  "id": "kr_123",
  "currentValue": 12500,
  "progress": 12.5,
  "status": "on_track"
}
```

### `GET /api/objectives/risk-signals`

Response:
```json
{
  "generatedAt": "2026-02-14T10:00:00.000Z",
  "summary": {
    "totalKrs": 8,
    "riskCount": 3,
    "highRiskCount": 1,
    "stalledCount": 1,
    "noProgressCount": 2,
    "behindScheduleCount": 2
  },
  "risks": [
    {
      "id": "kr_123",
      "title": "Reach $30k MRR",
      "objectiveId": "obj_123",
      "objectiveTitle": "Grow coaching revenue Q2",
      "objectivePeriod": "2026-Q2",
      "progress": 25,
      "status": "at_risk",
      "risk": {
        "level": "high",
        "score": 4,
        "reasons": [
          { "code": "behind_expected_progress", "label": "Deviation vs expected progress" }
        ]
      }
    }
  ],
  "focusWeek": []
}
```

## 4) Task/Project linkage contracts

### Task update

`PATCH /api/tasks/:id`
```json
{
  "areaId": "area_work",
  "objectiveId": "obj_123",
  "keyResultId": "kr_123"
}
```

### Project create (current canonical flow)

`POST /api/projects`
```json
{
  "category": "area_work",
  "objectiveId": "obj_123"
}
```

### Inbox capture and processing (creation flow linkage)

`POST /api/inbox`
```json
{
  "text": "Follow up key clients",
  "type": "work",
  "category": "area_work",
  "objectiveId": "obj_123",
  "keyResultId": "kr_123"
}
```

`POST /api/inbox/:type/:id/process`
```json
{
  "taskType": "simple",
  "thisWeek": true,
  "category": "area_work",
  "objectiveId": "obj_123",
  "keyResultId": "kr_123"
}
```

Compatibility:
- If payload includes `category`, backend maps to `areaId` when possible.

## 5) Coach contracts (Fase 8)

### `GET /api/coach/recommendations`

**Status**: ✅ Implemented (2026-02-14)

Response:
```json
{
  "generatedAt": "2026-02-14T10:00:00.000Z",
  "count": 3,
  "recommendations": [
    {
      "id": "rec-1708000000-0",
      "ruleId": "overload_detected",
      "severity": "high",
      "title": "Sobrecarga detectada",
      "description": "Tienes más tareas de las que puedes completar esta semana",
      "reason": "28.5 horas comprometidas, capacidad: 20.0 horas",
      "suggestedAction": {
        "type": "auto_redistribute",
        "label": "Redistribuir automáticamente",
        "payload": {}
      },
      "data": {
        "committedHours": 28.5,
        "capacityHours": 20.0,
        "overloadHours": 8.5
      },
      "generatedAt": "2026-02-14T10:00:00.000Z"
    }
  ]
}
```

Rules implemented:
- `overload_detected` - Capacity overload (high)
- `deadline_approaching` - Tasks due in 2-3 days (medium)
- `kr_at_risk` - Key results at risk (high/medium)
- `unlinked_tasks` - Tasks without area (low)
- `stale_inbox` - Inbox items >7 days (medium)
- `idle_project` - Projects without progress (low)
- `empty_week` - No committed tasks (medium)
- `low_completion_rate` - <50% completion (medium)

### `POST /api/coach/apply`

**Status**: ✅ Implemented (2026-02-14)

Request:
```json
{
  "recommendationId": "rec-1708000000-0",
  "actionType": "auto_redistribute",
  "payload": {}
}
```

Response:
```json
{
  "success": true,
  "message": "Redistribución automática completada",
  "tasksModified": 3,
  "changes": [
    { "taskId": "task_123", "action": "deferred", "from": "thisWeek", "to": "someday" }
  ]
}
```

Auto-executable actions:
- `auto_redistribute` - Defer low-priority tasks
- `focus_task` - Mark high priority + commit
- `plan_week` - Auto-commit top tasks

### `POST /api/coach/reject`

**Status**: ✅ Implemented (2026-02-14)

Request:
```json
{
  "recommendationId": "rec-1708000000-0",
  "ruleId": "overload_detected",
  "reason": "Descartada por el usuario"
}
```

Response:
```json
{
  "success": true,
  "message": "Recomendación descartada"
}
```

### `GET /api/coach/history`

**Status**: ✅ Implemented (2026-02-14)

Query params:
- `limit=20` (default)
- `type=generated|applied|rejected` (optional filter)

Response:
```json
{
  "count": 10,
  "events": [
    {
      "id": "ce-1708000000-abc123",
      "eventType": "applied",
      "ruleId": "auto_redistribute",
      "severity": "medium",
      "title": "Acción aplicada: auto_redistribute",
      "description": "Redistribución automática completada",
      "suggestedAction": {
        "type": "auto_redistribute",
        "payload": {}
      },
      "actionResult": {
        "success": true,
        "tasksModified": 3
      },
      "createdAt": "2026-02-14T10:00:00.000Z"
    }
  ]
}
```

## 6) Coach chat contracts (Fase 9 - implemented)

**Status**: ✅ Implemented (2026-02-14)

### `POST /api/coach/chat/message`

Process a chat message, match intent to tools, return preview or text response.

Request:
```json
{
  "message": "Planifica mi semana",
  "sessionId": "cs-123456",
  "mode": "suggest"
}
```

Response (with tool match):
```json
{
  "sessionId": "cs-123456",
  "response": "3 tarea(s) a comprometer. Carga total: 4.5h de 6.0h disponibles",
  "tool": "plan_week",
  "actionId": "act-789",
  "preview": {
    "changes": [
      { "taskId": "task-1", "title": "Deploy API", "type": "simple", "minutes": 60, "action": "commit_to_week" }
    ],
    "summary": "3 tarea(s) a comprometer...",
    "warnings": [],
    "impact": { "tasksCommitted": 3, "minutesUsed": 270, "capacityTotal": 1680, "capacityUsedPct": 75 },
    "reason": "Tareas ordenadas por prioridad y fecha limite..."
  },
  "requiresConfirmation": true,
  "expiresAt": "2026-02-14T12:05:00.000Z"
}
```

Response (no tool match):
```json
{
  "sessionId": "cs-123456",
  "response": "Tienes 5 tareas para esta semana...",
  "tool": null,
  "actionId": null,
  "preview": null,
  "requiresConfirmation": false
}
```

Available tools:
- `plan_week` — Commits tasks to week by priority/deadline within capacity
- `schedule_block` — Creates a calendar block for a task
- `reprioritize` — Detects overload and suggests redistribution
- `goal_review` — Reviews objectives and KR progress (read-only, no confirmation)

### `POST /api/coach/chat/confirm`

Confirm or cancel a pending action.

Request:
```json
{
  "actionId": "act-789",
  "confirm": true,
  "sessionId": "cs-123456"
}
```

Response (confirmed):
```json
{
  "executed": true,
  "actionId": "act-789",
  "result": {
    "success": true,
    "action": "plan_week",
    "committed": [{ "taskId": "task-1", "title": "Deploy API" }],
    "message": "3 tarea(s) comprometida(s) para esta semana"
  },
  "response": "Listo! 3 tarea(s) comprometida(s) para esta semana"
}
```

Response (cancelled):
```json
{
  "executed": false,
  "actionId": "act-789",
  "response": "Accion cancelada. No se realizaron cambios."
}
```

Error responses:
- `404` — Action not found or already processed
- `410` — Action expired (5-minute TTL)

### `GET /api/coach/chat/history`

Query params:
- `sessionId` — Session ID (optional, returns sessions list if omitted)
- `limit=50` — Max messages to return

Response (with sessionId):
```json
{
  "sessionId": "cs-123",
  "mode": "suggest",
  "startedAt": "2026-02-14T12:00:00.000Z",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Planifica mi semana",
      "tool": null,
      "actionId": null,
      "actionStatus": null,
      "createdAt": "2026-02-14T12:00:00.000Z"
    },
    {
      "id": "msg-2",
      "role": "coach",
      "content": "3 tarea(s) a comprometer...",
      "tool": "plan_week",
      "actionId": "act-789",
      "actionStatus": "confirmed",
      "actionPreview": { "..." : "..." },
      "createdAt": "2026-02-14T12:00:01.000Z"
    }
  ]
}
```

Response (without sessionId):
```json
{
  "sessions": [
    {
      "id": "cs-123",
      "mode": "suggest",
      "startedAt": "2026-02-14T12:00:00.000Z",
      "endedAt": null,
      "messageCount": 4,
      "summary": null
    }
  ]
}
```

## 7) LLM Agent contracts (Fase 9.1 - implemented)

**Status**: ✅ Implemented (2026-02-14)

### `GET /api/coach/chat/proactive`

Check if a proactive message should be shown (morning brief, midweek check, weekly review).

Response (should show):
```json
{
  "shouldShow": true,
  "type": "morning_brief",
  "message": "☀️ **Buenos días!**\n\nHoy tienes **3 tareas** programadas...",
  "reason": "Proactive morning_brief window active (7-9h)"
}
```

Response (no trigger):
```json
{
  "shouldShow": false
}
```

Windows:
- `morning_brief` — 7-9 AM, daily
- `midweek_check` — Wed 12-2 PM, weekly
- `weekly_review` — Fri 4-6 PM, weekly

### `GET /api/coach/chat/style`

Get current coach style configuration.

Response:
```json
{
  "coachStyle": {
    "tone": "directo",
    "insistence": "media",
    "brevity": "breve"
  }
}
```

### `POST /api/coach/chat/style`

Update coach style configuration.

Request:
```json
{
  "tone": "suave",
  "insistence": "alta",
  "brevity": "detallado"
}
```

Options:
- `tone`: `"directo"` (action-oriented) | `"suave"` (encouraging)
- `insistence`: `"baja"` (suggest once) | `"media"` (2-3 reminders) | `"alta"` (persistent)
- `brevity`: `"breve"` (<2 sentences) | `"detallado"` (with reasoning)

Response:
```json
{
  "success": true,
  "coachStyle": {
    "tone": "suave",
    "insistence": "alta",
    "brevity": "detallado"
  }
}
```

### LLM-Enhanced Chat Response

When `FF_COACH_LLM_AGENT_ENABLED=true`, `/api/coach/chat/message` returns additional fields:

Response (LLM-powered):
```json
{
  "sessionId": "cs-123",
  "response": "He analizado tu semana. Tienes sobrecarga de 3 horas...",
  "tool": "reprioritize",
  "actionId": "act-456",
  "preview": {
    "changes": [...],
    "summary": "...",
    "llmReasoning": "Based on your current capacity and deadlines..."
  },
  "requiresConfirmation": true,
  "llmPowered": true
}
```

Response (blocked by guardrails):
```json
{
  "sessionId": "cs-123",
  "response": "⚠️ No puedo planificar tu semana porque ya estas sobrecargado...",
  "tool": "plan_week",
  "llmPowered": true,
  "blocked": true
}
```

LLM Tools (18 total):
- **Read tools (13)**: get_context_snapshot, list_inbox, list_today, list_week, list_someday, list_projects, get_project, list_calendar_blocks, get_calendar_day, list_objectives, get_kr_risk_signals, get_capacity_status, get_profile
- **Mutation tools (5)**: plan_week, schedule_block, reprioritize, goal_review, create_content_project

Content templates:
- `contenido:video` — 5 milestones (645 min total)
- `contenido:podcast` — 5 milestones (345 min total)
- `contenido:blog` — 5 milestones (345 min total)
- `contenido:newsletter` — 4 milestones (225 min total)

## 7.1) Coach-first response quality contract (Fase 10.1)

**Status**: Planned + partial backend implementation (anti-vague fallback)

Goal:
- Prevent vague support-like responses and always return actionable coaching output.

Rules:
1. Every coach response should include practical guidance tied to current app state.
2. If LLM output is vague, backend replaces it with deterministic data-backed fallback.
3. If LLM fails, backend degrades gracefully to contextual coaching response (not generic apology).

Additional response fields for `POST /api/coach/chat/message`:
- `degraded` (boolean): true when advanced mode failed or quality fallback replaced text.
- `responseSource` (string): one of `llm`, `preview_summary`, `phase9_contextual`, `phase9_fallback`, `quality_fallback`, `handler_fallback`.

Example (degraded fallback):
```json
{
  "sessionId": "cs-123",
  "response": "No pude usar el modo avanzado en este turno (timeout), pero puedo ayudarte con un plan basado en datos actuales. Estado actual: 4 tarea(s) activas esta semana...",
  "tool": null,
  "actionId": null,
  "preview": null,
  "requiresConfirmation": false,
  "degraded": true,
  "responseSource": "phase9_fallback"
}
```

Minimum quality checklist (response-level):
1. `estado`: one factual snapshot line.
2. `recomendacion`: one concrete recommendation.
3. `razon`: implicit or explicit reason tied to user data.
4. `siguiente paso`: one executable next step.

## 7.2) Coach intervention contracts (Fase 10.2 - implemented)

**Status**: Implemented (2026-02-15)

Goal:
- Add a coach intervention layer that can *diagnose load*, *run check-ins*, and *store patterns*.
- Add a non-breaking interceptor for task creation/moves that can return advisories and (optionally) block via explicit opt-in.

### Feature flags (10.2)

- `FF_COACH_INTERVENTION_ENABLED=false`
  - Disables `/api/coach/diagnosis`, `/api/coach/patterns`, `/api/coach/patterns/analyze` (HTTP `404`)
  - Disables interceptor advisories (tasks endpoints and agent mutations will not attach intervention metadata)
- `FF_COACH_CHECKIN_ENABLED=false`
  - Disables `/api/coach/checkin` and `/api/coach/checkin/response` (HTTP `404`)

### `GET /api/coach/diagnosis`

Response:
```json
{
  "generatedAt": "2026-02-15T00:00:00.000Z",
  "state": "equilibrado",
  "capacity": {
    "usable": 1680,
    "used": 1125,
    "remaining": 555,
    "utilizationPct": 67,
    "formatted": { "usable": "28.0h", "used": "18.8h", "remaining": "9.3h" }
  },
  "metrics": {
    "committedTasks": 27,
    "doneTasks": 13,
    "overdueTasks": 1,
    "staleInboxItems": 0,
    "rescheduledTasks": 2,
    "completionRate": 33
  },
  "diagnosis": {
    "primaryRisk": "Tasa de completitud baja (33%). 1 tarea(s) vencida(s).",
    "recommendation": "Reducir compromisos o eliminar bloqueadores",
    "nextAction": "Revisa objetivos y prioriza por impacto",
    "impactExpected": "Progreso constante hacia metas",
    "tipDeOro": "El equilibrio no es estático, ajusta cada semana."
  }
}
```

### `GET /api/coach/checkin`

Response:
```json
{
  "shouldShow": true,
  "message": "🌙 Check-in nocturno ...",
  "data": { "incompleteTasks": [{ "id": "task-1", "title": "..." }] }
}
```

Notes:
- When not in window / already shown today, returns `{ "shouldShow": false }`.

### `POST /api/coach/checkin/response`

Request:
```json
{
  "response": "Hoy me interrumpieron con reuniones.",
  "checkinData": { "incompleteTasks": [{ "id": "task-1", "title": "..." }] }
}
```

Response:
```json
{
  "success": true,
  "classification": { "category": "interruptions", "label": "Interrupciones/reuniones" },
  "recommendation": "Protege bloques de Deep Work (2h sin interrupciones) mañana."
}
```

### `GET /api/coach/patterns`

Response:
```json
{
  "patterns": [
    { "type": "productive_hours", "value": { "hours": [9, 10, 11] }, "confidence": 0.7 }
  ]
}
```

### `POST /api/coach/patterns/analyze`

Response:
```json
{ "success": true, "patternsAnalyzed": 4 }
```

### Interceptor contract (Tasks API + agent mutations)

The interceptor attaches advisory metadata for capacity impact and alternatives.

1) `POST /api/tasks` may return:
```json
{
  "id": "task-123",
  "title": "Nueva tarea",
  "thisWeek": true,
  "interceptor": {
    "mode": "soft_block",
    "message": "⚠️ ... excedería tu capacidad semanal ...",
    "requiresConfirmation": true,
    "alternatives": [
      { "action": "move_to_someday", "label": "Mover a \"Algún día\" sin fecha" }
    ]
  }
}
```

2) To make it blocking (opt-in), clients can send:
- `enforceInterceptor=true` (request body)
- `force=true` to bypass

If blocked, server returns HTTP `409` with `{ error, message, interceptor }`.

3) Agent mutation tools (`create_task`, `update_task`, `create_calendar_block`, `update_calendar_block`) may return:
- `interceptor` and/or `deepWork` objects in mutation results to surface advisories in chat UX.

## 8) Compound Skills contracts (Fase 10.4 - implemented)

**Status**: ✅ Implemented (2026-02-16)

### Decision Engine v2

Response payload structure (from `buildExplainabilityPayload`):

```json
{
  "reason": "Tarea vencida. Key Result en riesgo: \"Reach $30k MRR\".",
  "impact": "Completar \"Deploy API\" (1.0h). Reduce riesgo en KR asociado. Evita retraso.",
  "tradeoff": "Poca capacidad restante después de esta tarea",
  "confidence": 90
}
```

Used by all compound tools for transparent decision-making.

### `smart_process_inbox`

Processes inbox item → creates task linked to objective + optionally schedules calendar block.

**Request** (via LLM tool call):
```json
{
  "inboxId": "inbox-work-123456",
  "type": "work",
  "areaId": "area_work",
  "objectiveId": "obj_q2_2026",
  "keyResultId": "kr_revenue_30k",
  "date": "2026-02-20",
  "startTime": "10:00"
}
```

**Response** (mutation preview):
```json
{
  "preview": {
    "changes": [
      { "type": "inbox_delete", "inboxId": "inbox-work-123456", "text": "Follow up key clients" },
      { "type": "task_create", "taskId": "task-xyz", "title": "Follow up key clients" },
      { "type": "calendar_block_create", "blockId": "block-789", "date": "2026-02-20", "startTime": "10:00" }
    ],
    "summary": "Procesar inbox → tarea + agendada\n- \"Follow up key clients\"\n- Vinculada a: obj_q2_2026\n- Agendada: 2026-02-20 10:00",
    "impact": { "inboxProcessed": 1, "tasksCreated": 1, "blocksCreated": 1 },
    "reason": "Procesar inbox item y vincular a objetivo en un solo paso."
  },
  "requiresConfirmation": true
}
```

### `plan_and_schedule_week`

Generates weekly plan using Decision Engine v2 ranking (deadline + KR risk + capacity fit).

**Request**:
```json
{
  "commitCount": 5
}
```

**Response** (mutation preview):
```json
{
  "preview": {
    "changes": [
      {
        "type": "task_commit",
        "taskId": "task-1",
        "title": "Deploy API",
        "estimatedMinutes": 60,
        "explainability": {
          "reason": "Fecha límite inminente. Alineado con objetivos estratégicos.",
          "impact": "Completar \"Deploy API\" (1.0h). Evita retraso.",
          "tradeoff": null,
          "confidence": 90
        }
      }
    ],
    "summary": "Plan semanal: 5 tarea(s) comprometidas\n- Must-do: 3\n- Should-do: 2\n- Carga total: 18.8h / 28.0h\n- Capacidad restante: 9.3h",
    "impact": {
      "tasksCommitted": 5,
      "totalMinutes": 1125,
      "capacityUsedPct": 67
    },
    "reason": "Plan generado con Decision Engine v2: ranking por deadline, KR risk, y capacidad."
  },
  "requiresConfirmation": true
}
```

### `batch_reprioritize`

One-click redistribution when overload detected. Defers low-priority tasks without KR risk.

**Request**:
```json
{}
```

**Response** (mutation preview):
```json
{
  "preview": {
    "changes": [
      { "type": "task_defer", "taskId": "task-5", "title": "Update docs", "estimatedMinutes": 60, "reason": "Baja prioridad, sin riesgo estratégico" }
    ],
    "summary": "Redistribuir 3 tarea(s) a \"Algún día\"\n- Sobrecarga: 3.5h\n- Liberado: 3.0h",
    "impact": {
      "tasksDeferred": 3,
      "minutesFreed": 180,
      "capacityAfterPct": 85
    },
    "reason": "Sobrecarga detectada. Diferir tareas de menor impacto estratégico."
  },
  "requiresConfirmation": true
}
```

### `breakdown_milestone`

Splits milestone into subtasks and commits first subtask to week.

**Request**:
```json
{
  "projectId": "project-api-v2",
  "milestoneId": "milestone-1",
  "subtaskCount": 3
}
```

**Response** (mutation preview):
```json
{
  "preview": {
    "changes": [
      { "type": "subtask_create", "taskId": "task-sub-1", "title": "Database schema - Paso 1", "parentId": "project-api-v2", "thisWeek": true },
      { "type": "subtask_create", "taskId": "task-sub-2", "title": "Database schema - Paso 2", "parentId": "project-api-v2", "thisWeek": false },
      { "type": "subtask_create", "taskId": "task-sub-3", "title": "Database schema - Paso 3", "parentId": "project-api-v2", "thisWeek": false }
    ],
    "summary": "Descomponer milestone \"Database schema\" en 3 sub-tareas\n- Proyecto: API v2\n- Comprometida esta semana: 1 (primera sub-tarea)",
    "impact": {
      "subtasksCreated": 3,
      "tasksCommitted": 1
    },
    "reason": "Milestone grande descompuesto para facilitar progreso incremental."
  },
  "requiresConfirmation": true
}
```

## 9) Compatibility matrix

| Module | Current | Phase 7+ contract | Phase 10.4+ |
|---|---|---|---|
| Tasks | CRUD + capacity + calendar links | add `areaId`, optional `keyResultId` | unchanged, consumed by compound tools |
| Projects | milestones + commit flow | add `areaId`, optional `objectiveId` | milestone breakdown via compound tool |
| Areas | dynamic categories | stable ID relation (`areaId`) | unchanged |
| Capacity | week/today/status views | unchanged, consumed by coach rules | consumed by Decision Engine v2 |
| Chat | message endpoint | add tool-backed action endpoints + LLM orchestration | 4 new compound tools available |
