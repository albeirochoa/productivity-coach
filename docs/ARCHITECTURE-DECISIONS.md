# Architecture Decisions (ADR)

Date: 2026-02-14
Owner: Productivity Coach Team
Scope: Fase 7+ (OKR, Coach Engine, Conversational Agent)

## How to use this file

- One ADR per major change.
- Status values: `proposed`, `accepted`, `deprecated`, `rejected`.
- If an ADR changes schema/API, reference:
  - `docs/INTEGRATION-CONTRACTS.md`
  - `docs/DATA-MIGRATION-PLAN.md`
  - `docs/RELEASE-PLAN-MVP2.md`

---

## ADR-001: Strategic Layer (Objectives + Key Results)

- Status: `accepted`
- Decision:
  - Add first-class modules for `objectives` and `key_results`.
  - Keep task/project execution model unchanged, add links instead of replacing current flows.
- Context:
  - Current app supports tasks, projects, calendar, and capacity.
  - Fase 7 requires measurable strategic progress.
- Impact:
  - Backend: new routes and persistence for objectives and key results.
  - Frontend: new objectives view and linkage UI in task/project editors.
  - Data: new tables, plus optional foreign keys in tasks/projects.
- Risks:
  - Over-modeling too early.
  - User friction if linking is mandatory at creation time.
- Mitigation:
  - Start with optional linking + progressive enforcement.
  - Add QA scenarios for objective progress and linkage consistency.

---

## ADR-002: Area compatibility strategy (`category` -> `areaId`)

- Status: `accepted`
- Decision:
  - Treat `category` as compatibility alias and move canonical relation to `areaId`.
  - During migration window, support both fields in API payloads.
- Context:
  - Fase 6.1 completed area normalization using dynamic categories.
  - Fase 7+ needs stable IDs to avoid name-based breakage.
- Impact:
  - Backend: normalize requests, return stable area relation.
  - Frontend: write/read `areaId` first, fallback to `category`.
  - Data: migration + backfill + validation.
- Risks:
  - Partial migration causing mixed data.
- Mitigation:
  - Migration checks + read fallback + release gates.

---

## ADR-003: Coach architecture split (Rules first, LLM second)

- Status: `accepted`
- Decision:
  - Fase 8: deterministic coach rules and explainable decisions.
  - Fase 9: conversational layer calls internal tools over the same rule engine.
- Context:
  - Need reliable planning before autonomous actions.
- Impact:
  - Backend: decision engine service + tool endpoints.
  - Frontend: suggestions panel, then chat action confirmations.
- Risks:
  - LLM hallucinations if business logic is in prompts only.
- Mitigation:
  - Keep business rules server-side.
  - Chat can suggest and request actions, but execution uses validated tools.

---

## ADR-004: Safe rollout with feature flags

- Status: `accepted`
- Decision:
  - New strategic and coach features are flag-gated by default.
  - Rollout by increment with rollback switches.
- Context:
  - Personal production use needs low risk and quick recovery.
- Impact:
  - Add config flags in backend and frontend.
  - Add release checklist and rollback steps per increment.
- Risks:
  - Dead code path drift if flags stay disabled for long.
- Mitigation:
  - Short-lived flags and QA coverage for both ON/OFF paths.

---

## ADR-005: Strategic risk signals as first-class backend contract

- Status: `accepted`
- Decision:
  - Add dedicated endpoint `GET /api/objectives/risk-signals`.
  - Compute KR risk server-side (no-progress, stalling, deviation vs expected progress by period).
  - Expose ranked `focusWeek` recommendations from the same contract.
- Context:
  - Fase 7B requires explicit and explainable risk detection.
  - UI dashboard and future coach rules need a stable source of strategic risk truth.
- Impact:
  - Backend: objective routes include risk assessment and sorting logic.
  - Frontend: objectives dashboard renders summary cards, focus list, and risk badges on KR rows.
  - Coach readiness: Fase 8 can consume risk signals without duplicating logic.
- Risks:
  - False positives if thresholds are too strict.
  - Rule drift if UI tries to infer risk independently.
- Mitigation:
  - Keep thresholds centralized in backend.
  - Expose reasons and scores for each risk item.
  - Validate with QA scenarios and tune thresholds incrementally.
