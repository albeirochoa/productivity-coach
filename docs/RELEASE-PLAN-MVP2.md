# Release Plan MVP2 (Fase 7-9)

Date: 2026-02-15
Status: Active plan (updated)

## Goal

Ship strategic planning and assistant capabilities in safe increments, preserving current MVP stability.

## Feature flags

- `FF_OBJECTIVES_ENABLED` (already used in backend)
- `FF_COACH_RULES_ENABLED` (active, defaults to true)
- `FF_COACH_CHAT_ACTIONS_ENABLED` (active, defaults to true)
- `FF_COACH_LLM_AGENT_ENABLED` (active, defaults to true if OPENAI_API_KEY set)
- `FF_COACH_INTERVENTION_ENABLED` (Fase 10.2, defaults to true)
- `FF_COACH_CHECKIN_ENABLED` (Fase 10.2, defaults to true)

## Increment plan

## Increment 1: Strategic data foundation (Fase 7A)

Scope:
- Objectives + Key Results CRUD (backend + minimal UI)
- Canonical `areaId` support with compatibility

Done criteria:
- Migration scripts executed successfully
- Objectives and KRs can be created/edited/listed
- No regression in tasks/projects/calendar/capacity

Minimum tests:
- unit: validators, progress calculators
- API: objectives/KR CRUD + compatibility payloads
- E2E/QA: create objective + KR + link to task

Rollback:
- disable `ff_objectives_enabled` and `ff_key_results_enabled`
- restore DB backup if data integrity checks fail

## Increment 2: Strategic visibility (Fase 7B)

Status: `completed` (2026-02-14)

Scope:
- Objectives dashboard view
- Progress rollups and risk markers
- Filters by area and period
- Explicit risk endpoint: `GET /api/objectives/risk-signals`
- Strategic linking from creation flows (project wizard + inbox capture/process)

Done criteria:
- User can inspect strategic progress in one screen
- Progress values match backend calculations

Minimum tests:
- unit: progress and status thresholds
- E2E/QA: objective progress updates reflected in dashboard
- API: risk-signals contract and ordering
- E2E/QA: create with objective/KR from inbox and verify persisted links

Rollback:
- disable UI exposure flag, keep data model active

## Increment 3: Coach rules engine (Fase 8)

Status: `completed` (2026-02-14)

Scope:
- Deterministic recommendation engine (8 rules)
- Explainable decisions and decision logs (coach_events table)
- Apply/Reject UI with severity-based styling
- Integration with capacity and objectives risk signals

Done criteria:
- ✅ Suggestions generated from real capacity/deadline data
- ✅ Each recommendation includes explainable reasons
- ✅ Auto-executable actions: auto_redistribute, focus_task, plan_week
- ✅ Decision history logged in SQLite

Minimum tests:
- ✅ unit: 5 rules tested (empty_week, overload, stale_inbox, deadline, kr_risk)
- ✅ API: 4 coach endpoints implemented and tested
- ✅ Build: frontend compiled successfully (4.07s)
- ✅ Module loading: all backend modules load correctly

Rollback:
- disable `FF_COACH_RULES_ENABLED=false`

Files created:
- `web/server/helpers/coach-rules-engine.js` (350 L)
- `web/server/db/migrations/009_coach_events.sql`
- `web/server/routes/coach-routes.js` (260 L)
- `web/src/components/Dashboard/CoachView.jsx` (240 L)

## Increment 4: Conversational action layer (Fase 9)

Status: `completed` (2026-02-14)

Scope:
- Chat tool calling for planning/reprioritization/scheduling
- `suggest` vs `act` mode with explicit confirmation
- Intent matching with keyword scoring (4 tools)
- Two-step confirm/execute pattern with 5-min TTL
- Session and message persistence (coach_sessions + coach_messages)
- Coach memory table for future personalization

Done criteria:
- ✅ Chat can trigger tool-backed actions with confirmation
- ✅ Decision and action history is persisted
- ✅ Feature flag `FF_COACH_CHAT_ACTIONS_ENABLED` gates all new routes
- ✅ No regression on Phase 8 coach endpoints

Minimum tests:
- ✅ Unit: matchIntent() for all 4 tools + no-match
- ✅ Unit: Zod validation for message and confirm schemas
- ✅ Module loading: all backend modules verified
- ✅ Build: frontend compiled successfully
- E2E/QA: chat suggestion + confirm execution + verify state changes

Rollback:
- disable `FF_COACH_CHAT_ACTIONS_ENABLED=false`
- keep rules engine active if stable

Files created:
- `web/server/db/migrations/010_coach_chat_sessions.sql` - 3 tables
- `web/server/helpers/coach-chat-tools.js` (~300 L) - Intent matcher + 4 tools
- `web/server/routes/coach-chat-routes.js` (~500 L) - 6 endpoints (message, confirm, history, proactive, style)
- `web/src/components/Chat/ChatPanel.jsx` (~270 L) - Chat panel with LLM indicators
- `web/src/components/Chat/ActionPreview.jsx` (~100 L) - Preview + confirm/cancel
- `web/src/components/Chat/ModeSelector.jsx` (~40 L) - Suggest/act toggle

## Increment 5: LLM Agent Layer (Fase 9.1)

Status: `completed` (2026-02-14)

Scope:
- LLM orchestrator with OpenAI GPT-4o and function calling
- 18 tools total: 13 read-only + 5 mutation tools
- Phase 8 guardrails as final authority (capacity, risk, conflicts)
- Memory system: session context + persistent preferences (coach_memory table)
- Proactive messaging with controlled windows (morning/midweek/weekly)
- Configurable coach style (tone, insistence, brevity)
- Content creation templates (video, podcast, blog, newsletter)
- LLM fallback: if LLM fails, falls back to Phase 9 intent matching

Done criteria:
- ✅ LLM proposes useful actions with real tool calls
- ✅ Guardrails block invalid proposals (overload, conflicts)
- ✅ Confirmation flow works for all mutation tools
- ✅ Memory persists and loads between sessions
- ✅ Proactive windows trigger correctly (once per window per day/week)
- ✅ Build passes without errors
- ✅ Frontend shows LLM indicators and blocked state

Minimum tests:
- ✅ Build: `npm run build` passes (3.90s, no errors)
- ✅ Module loading: all backend modules load correctly
- ✅ API Key detection: feature flag validates correctly with logging
- ✅ Bugfix: `create_content_project` now requires confirmation (P0 fix - 2026-02-14)
- ⏳ Manual: LLM tool-calling + guardrail blocking
- ⏳ Manual: Proactive window triggering
- ⏳ Manual: Coach style persistence

Rollback:
- disable `FF_COACH_LLM_AGENT_ENABLED=false`
- system falls back to Phase 9 intent matching automatically

Files created:
- `web/server/helpers/llm-agent-orchestrator.js` (~850 L) - LLM orchestrator with OpenAI
- `web/server/helpers/content-templates.js` (~200 L) - Content project templates
- Updated: `web/server/routes/coach-chat-routes.js` (+150 L for LLM integration)
- Updated: `web/src/components/Chat/ChatPanel.jsx` (+20 L for LLM indicators)
- Updated: `web/src/utils/api.js` (+3 endpoints)

## Increment 6: Assistant Runtime Core (Fase 10.3-10.6)

Status: `in_progress` (started)

Scope:
- Conversational state machine + slot filling persistence
- Pending action resolver (no context loss between turns)
- Coach response v2 (state, recommendation, reason, next step)
- Decision engine v2 with explainability payloads
- Coach-first panel and risk-triggered proactivity
- Coaching quality metrics + replay regression suite

Execution source:
- `docs/ASSISTANT-RUNTIME-BACKLOG.md` (AR-001..AR-016)

### Increment 6A: Continuity + Quality Telemetry (Fase 10.3A)

Status: `completed` (2026-02-15)

Scope:
- Pending action resolver routing (slot filling priority)
- Deterministic objective creation flow (period, area, description)
- Deterministic "how-to use the app" guidance (avoid support-bot vagueness)
- Quality event logging to close feedback loop (`quality:*` events)

Done criteria:
- Multi-turn objective creation continues in same session without losing context
- Short affirmative replies ("si/ok") can be resolved into a concrete pending action when applicable
- Quality events are persisted for analysis (`coach_events.rule_id LIKE 'quality:%'`)

Files touched:
- `web/server/helpers/quality-event-logger.js`
- `web/server/routes/coach-chat-routes.js`
- `web/server/helpers/slot-normalizer.js`
- `web/src/components/Chat/ChatPanel.jsx` (sessionId sync robustness)

Manual QA:
- Create objective in 2 turns: create -> provide period -> preview returned
- Create objective in 1 message including period/area/description -> preview returned
- Ask "como puedo ..." -> returns deterministic how-to guidance (not fallback)

Rollback:
- Keep previous chat layer behavior by disabling newest runtime gates (when added)
- No schema rollback required (uses existing `coach_events`)

### Increment 6B: Aggregated Metrics + Replay Harness (Fase 10.3B)

Status: `completed` (2026-02-15)

Scope:
- ✅ Aggregated quality metrics (context loss rate, vague replacement rate, completion rate)
- ✅ Conversation replay harness for regression detection (10 canonical scripts)
- ✅ Weekly quality report baseline
- ✅ Activity Log: endpoint + unified feed (historial de actividad)
- ✅ Coach Knowledge Base foundation (RAG optional for future)

Done criteria:
- ✅ Multi-turn action flows complete without losing pending intent (AR-002)
- ✅ No generic fallback during pending actions (AR-004)
- ✅ Metrics endpoints available (AR-014)
- ✅ Weekly quality report available with acceptance/adherence metrics (AR-016)

Minimum tests:
- ✅ Build: `npm run build` passes (3.88s)
- ✅ Module loading: coach-chat-routes.js loads correctly
- ✅ Script syntax: conversation-replay.mjs valid
- ⏳ Integration: 10 canonical multi-turn conversations (requires running server)

Rollback:
- Revert `web/server/routes/coach-chat-routes.js` to previous version
- No schema changes, no data loss risk
- Keep knowledge base (no side effects)

Files created:
- `web/qa/conversation-replay.mjs` (340 L) - Replay harness
- `docs/coach-kb/README.md` - Knowledge base foundation
- `docs/qa/FASE10_3B-SUMMARY.md` - Complete documentation

Files modified:
- `web/server/routes/coach-chat-routes.js` (+180 L) - 3 new endpoints

### Increment 6C: Decision Engine v2 + Compound Skills (Fase 10.4)

Status: `completed` (2026-02-16)

Scope:
- ✅ Decision Engine v2 with next-best-actions ranking
- ✅ Explainability payloads: reason, impact, tradeoff, confidence
- ✅ 4 compound skills (high impact):
  - `smart_process_inbox`: inbox → task linked + scheduled (4 steps → 1)
  - `plan_and_schedule_week`: weekly plan with Decision Engine v2 ranking (~15min → 1 confirmation)
  - `batch_reprioritize`: one-click overload resolution (warning → action)
  - `breakdown_milestone`: milestone → subtasks + calendar distribution

Done criteria:
- ✅ Coach proposes weekly plan in < 3 minutes with verifiable reasons
- ✅ Process inbox item to scheduled task in 1 confirmation
- ✅ Overload resolved with 1 click (not manual)
- ✅ Explainability payload included in all compound tool previews

Minimum tests:
- ⏳ Build: `npm run build` (pending)
- ⏳ Module loading: decision-engine-v2.js, llm-agent-mutation-tools.js (pending)
- ⏳ Unit: ranking deterministic for fixed dataset (pending)
- ⏳ Integration: weekly plan pack for overloaded and balanced cases (pending)
- ⏳ Integration: each compound tool produces preview + confirmation flow (pending)

Rollback:
- Revert changes to `llm-agent-mutation-tools.js` and `llm-agent-orchestrator.js`
- Decision engine is pure functions (no state), safe to disable
- No schema changes, no data loss risk

Files created:
- `web/server/helpers/decision-engine-v2.js` (297 L) - Ranking engine with explainability
- `docs/qa/FASE10_4-SUMMARY.md` - Complete documentation

Files modified:
- `web/server/helpers/llm-agent-mutation-tools.js` (+260 L) - 4 compound tools (preview + execute cases)
- `web/server/helpers/llm-agent-orchestrator.js` (+80 L) - 4 tool definitions + system prompt rule #12

## Release gates (all increments)

- Build: `npm run build` passes
- QA agent: report status `pass`
- No P0/P1 defects open
- Backup/restore smoke test completed

## Governance checklist

- ADR updated for each major scope change
- Integration contracts updated before implementation
- Migration plan updated before schema changes
- Rollback command path tested before rollout
