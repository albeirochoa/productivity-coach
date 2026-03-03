# Claude Execution Prompt - Sprint A (Fase 10.3A)

Date: 2026-02-15
Status: Ready to use

Use this exact prompt in Claude:

```text
Implement only Sprint A (Fase 10.3A) from docs/ASSISTANT-RUNTIME-BACKLOG.md.

Scope is strictly AR-001..AR-004:
1) AR-001 Session state model
2) AR-002 Pending action resolver
3) AR-003 Slot normalization
4) AR-004 No-generic rule while pending

Read first:
- docs/ASSISTANT-RUNTIME-BACKLOG.md
- docs/COACH-METHOD.md
- docs/INTEGRATION-CONTRACTS.md
- docs/RELEASE-PLAN-MVP2.md

Hard constraints:
1) Do not break Phase 8/9/9.1/10.2 behavior.
2) Keep guardrails as final authority for all mutations.
3) Do not implement Sprint B/C/D/E in this task.
4) Avoid vague fallback responses when a pending action exists.
5) If data is missing, ask only for the next required slot.

Implementation requirements:
1) Persist conversation state per session:
   - intent
   - pendingActionId
   - requiredSlots
   - collectedSlots
   - lastUserGoal
   - updatedAt
2) Route priority:
   - if pending action exists, resolve slots first
   - only if no pending action, proceed to normal intent flow
3) Slot normalization for Spanish natural language:
   - period examples: "primer semestre 2026", "segundo trimestre 2026"
   - date examples: "hoy", "mañana", "lunes"
   - area mapping: user label -> areaId
4) Response policy:
   - block generic fallback templates while pending
   - respond with continuation style: "Para completar X solo falta Y"

Acceptance criteria (must all pass):
1) Multi-turn objective creation does not lose context:
   - "crea el objetivo aprender a nadar"
   - ask for period
   - "primer semestre del 2026"
   - preview/execution continues same action (no reset)
2) No generic fallback response appears during pending-action flow.
3) State is cleared on execute/cancel/expire.
4) Build passes and no critical regressions.

Required tests:
1) Unit:
   - state save/load/merge/clear
   - slot normalization table tests (20+ cases)
2) Integration:
   - 3-turn pending action flow
   - degraded mode with pending action (must continue, not fallback generic)
3) Build:
   - npm run build (web)

Deliverables in your final report:
1) Files changed and why
2) Mapping AR-001..AR-004 -> implemented evidence
3) Test results with exact commands and outcomes
4) Manual QA steps (5-10 min)
5) Remaining risks (if any)
```

## Quick Manual QA After Claude Finishes

1. Start backend and frontend.
2. In chat:
   1) `crea el objetivo aprender a nadar`
   2) respond with `primer semestre del 2026`
3. Expected:
   1) Assistant keeps action context.
   2) It does not switch to generic support text.
   3) It proceeds to preview or create objective flow.

