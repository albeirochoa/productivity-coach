# Assistant Runtime Backlog (Fase 10.3-10.6)

Date: 2026-02-15
Status: Ready for execution
Owner: Coach platform team

## 1) Goal

Convert the current chat behavior into an assistant runtime that:

1. Keeps conversation continuity across turns.
2. Completes pending actions without losing context.
3. Produces coach-quality responses (not support-bot replies).
4. Uses memory and telemetry to improve plans week by week.

## 2) Scope

Included:

1. Session state machine + slot filling.
2. Pending action lifecycle (draft, waiting_input, ready, confirmed, executed, canceled, expired).
3. Response quality policy and anti-vague fallback.
4. Coach decision engine v2 (next best actions with explainability).
5. Coach-first UX for recommendations and pending actions.
6. Coaching quality metrics and replay validation.

Not included (defer to Fase 11+):

1. Fully autonomous mode without confirmation.
2. Multi-user accounts and permissions.
3. External integrations (Telegram, Todoist sync, etc).

## 3) Execution order

1. Sprint A: Continuity core (Fase 10.3A)
2. Sprint B: Assistant response quality (Fase 10.3B)
3. Sprint C: Decision engine v2 (Fase 10.4)
4. Sprint D: Coach-first UX + proactivity (Fase 10.5)
5. Sprint E: Quality system + replay (Fase 10.6)

---

## 4) Sprint A - Continuity Core (Fase 10.3A)

### AR-001 Session state model

Implement:

1. Add `conversation_state` persistence per session:
   `intent`, `pendingActionId`, `requiredSlots`, `collectedSlots`, `lastUserGoal`, `updatedAt`.
2. Utility functions:
   `loadConversationState(sessionId)`, `saveConversationState(sessionId, patch)`, `clearConversationState(sessionId)`.

Acceptance criteria:

1. State survives across multiple user messages in same session.
2. State clears when action is executed/canceled/expired.

Tests:

1. Unit: save/load/merge/clear state.
2. Integration: state preserved after 3-turn flow.

### AR-002 Pending action resolver

Implement:

1. Priority rule in message pipeline:
   if `pendingAction` exists, process slot completion before new intent matching.
2. Branches:
   `missing_slot` -> ask only next missing field.
   `all_slots_ready` -> build preview.
   `confirmed` -> execute.

Acceptance criteria:

1. Assistant does not jump to generic answer while action is pending.
2. 2-turn create objective flow succeeds from natural text.

Tests:

1. E2E: "crea objetivo aprender a nadar" -> asks period -> "primer semestre 2026" -> preview/execution.

### AR-003 Slot normalization

Implement normalizers:

1. Period:
   `primer semestre 2026` -> `2026-H1`
   `segundo trimestre 2026` -> `2026-Q2`
2. Date:
   `manana`, `hoy`, `lunes` -> `YYYY-MM-DD`.
3. Area:
   map user label to `areaId` with alias matching.

Acceptance criteria:

1. Slot parser handles Spanish natural phrases reliably.
2. Invalid values return concrete correction message.

Tests:

1. Unit table-driven tests for 20+ expressions.

### AR-004 No-generic rule while pending

Implement:

1. Hard guard in response layer:
   if `pendingAction` exists, block generic fallback templates.
2. Replace with continuation response:
   "Para completar X solo falta Y".

Acceptance criteria:

1. Zero generic fallback responses during pending action flows.

Tests:

1. Integration: force degraded mode and verify continuation response.

---

## 5) Sprint B - Assistant Response Quality (Fase 10.3B)

### AR-005 Coach response composer

Implement fixed response contract:

1. Estado actual (1 sentence)
2. Recomendacion (specific)
3. Por que (data signal)
4. Siguiente paso (single action)

Acceptance criteria:

1. 90%+ non-empty responses follow contract.
2. Tip de Oro only when useful (not mandatory every turn).

Tests:

1. Unit snapshots for response formatting.

### AR-006 Degraded fallback with value

Implement:

1. Remove vague templates in degraded mode.
2. Fallback must include:
   what failed + what is still possible + one concrete next step.

Acceptance criteria:

1. No response contains only "intenta mas tarde".

Tests:

1. Simulate LLM/tool failure and assert useful fallback payload.

### AR-007 Memory write policy

Implement:

1. Save only high-signal memory:
   accepted recommendations, rejected reasons, preferred time windows.
2. Confidence scoring and decay.

Acceptance criteria:

1. Repeated behavior changes recommendation style in later sessions.

Tests:

1. Integration: repeated accepts in morning -> assistant prefers morning blocks.

### AR-007B Coach Knowledge Base + Retrieval (RAG optional)

Implement:

1. Create a curated knowledge base (short docs/playbooks) for:
   GTD capture/clarify, Eisenhower, Time Blocking, Deep Work, OKR cadence, weekly review, overload rescue.
2. Add "App handbook" entries: how to do core actions in this app (areas, inbox, objectives, calendar, projects).
3. Optional retrieval layer (RAG) over this knowledge base:
   - Retrieve top-k relevant sections by query
   - Inject into response generation
   - Never use RAG as source of truth for user state (tasks/blocks/objectives) -> always use tools.

Acceptance criteria:

1. "How do I ..." questions are answered with actionable steps, not generic chat.
2. Coaching guidance references an explicit methodology or playbook step.
3. No hallucinated "features" that the app doesn't have.

Tests:

1. Integration: ask 10 "how-to" questions -> must cite real app flows and avoid vague responses.

---

## 6) Sprint C - Decision Engine v2 (Fase 10.4)

### AR-008 Next-best-actions ranking

Implement ranking function using:

1. Capacity remaining.
2. Deadlines urgency.
3. Objective/KR risk.
4. Historical adherence.

Acceptance criteria:

1. Returns top actions with deterministic score breakdown.

Tests:

1. Unit: ranking deterministic for fixed dataset.

### AR-009 Weekly plan pack

Implement:

1. Generate week plan with:
   must-do, should-do, not-this-week.
2. Include total minutes vs capacity summary.

Acceptance criteria:

1. Plan generated in one request and usable without manual sorting.

Tests:

1. Integration: weekly plan generated under overloaded and balanced scenarios.

### AR-010 Explainability payload

Implement payload fields:

1. `reason`
2. `impact`
3. `tradeoff`
4. `confidence`

Acceptance criteria:

1. Every recommendation card has all four fields.

Tests:

1. API contract tests for recommendation schema.

---

## 7) Sprint D - Coach-first UX + Proactivity (Fase 10.5)

### AR-011 Pending action UI

Implement:

1. "Accion en curso" banner in chat.
2. Missing slots checklist.
3. Resume/cancel controls.

Acceptance criteria:

1. User can see exactly why the assistant asked each follow-up question.

Tests:

1. Manual QA: 5 multi-turn flows with zero confusion.

### AR-012 Coach command center

Implement dashboard panel:

1. Riesgos actuales.
2. Plan recomendado.
3. Foco del dia.
4. Tradeoffs.

Acceptance criteria:

1. User can run the day from coach panel without typing commands.

Tests:

1. E2E: apply recommendation from panel updates tasks/calendar.

### AR-013 Risk-triggered proactivity

Implement:

1. Triggers by risk signals, not clock-only.
2. Frequency adaptation by accept/reject history.

Acceptance criteria:

1. Proactive messages reduce spam and improve acceptance rate.

Tests:

1. Simulation: high reject history lowers trigger frequency.

---

## 8) Sprint E - Quality System + Replay (Fase 10.6)

### AR-014 Coaching telemetry

Implement metrics:

1. recommendation_acceptance_rate
2. weekly_adherence_rate
3. reschedule_ratio
4. objective_progress_delta
5. vague_response_rate
6. activity_log_coverage (percent of core actions logged)

Acceptance criteria:

1. Metrics available weekly in one endpoint/report.
2. Activity feed available for manual inspection.

Tests:

1. Unit/integration for metrics computation.
2. Integration: activity feed returns most recent events.

### AR-015 Conversation replay harness

Implement:

1. Replay runner for historical chat scenarios.
2. Assertions for continuity and execution quality.

Acceptance criteria:

1. Regression suite catches context-loss failures.

Tests:

1. 10 canonical conversations in replay set.

### AR-016 Weekly quality report

Implement:

1. Auto-generated report:
   wins, failures, drift, top fixes.
2. Include top 3 prompt/rule adjustments for next week.

Acceptance criteria:

1. Team can decide next tuning steps from report only.

Tests:

1. Snapshot test for report structure.

---

## 9) Feature flags and rollout

Use controlled rollout:

1. `FF_COACH_RUNTIME_STATE_ENABLED` (AR-001..004)
2. `FF_COACH_RESPONSE_V2_ENABLED` (AR-005..007)
3. `FF_COACH_DECISION_V2_ENABLED` (AR-008..010)
4. `FF_COACH_PANEL_V2_ENABLED` (AR-011..013)
5. `FF_COACH_QUALITY_REPLAY_ENABLED` (AR-014..016)

Rollback:

1. Disable last enabled flag.
2. Keep previous stable layer active.
3. Preserve logs/state for diagnosis.

## 10) Definition of done (global)

A sprint is done only if all are true:

1. Build passes (`npm run build`).
2. New unit/integration tests pass.
3. QA checklist updated under `docs/qa`.
4. No new vague response pattern in sampled conversations.
5. No regression in create/move/rename/edit core actions.

## 11) Implementation prompt for Claude

Use this exact instruction:

```text
Implement Sprint <A|B|C|D|E> from docs/ASSISTANT-RUNTIME-BACKLOG.md.

Constraints:
1) Do not break existing Phase 8/9/9.1 behavior.
2) Keep guardrails as final authority for mutations.
3) Add or update tests for every AR ticket touched.
4) Update docs/qa with a checklist and real expected outcomes.
5) Return: files changed, acceptance criteria mapping, how to test in 5-10 minutes.
```
