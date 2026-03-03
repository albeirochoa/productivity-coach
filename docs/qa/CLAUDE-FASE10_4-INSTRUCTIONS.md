# Claude Execution Prompt - Fase 10.4 (Motor de Coaching v2 + Skills Compuestas)

Date: 2026-02-16
Status: Ready to use

Use this exact prompt in Claude:

```text
Implement Fase 10.4: Motor de Coaching v2 + Skills Compuestas for productivity-coach.

Read first:
1) docs/ROADMAP.md (Fase 10.4 section)
2) docs/ASSISTANT-RUNTIME-BACKLOG.md (Sprint C: AR-008..AR-010)
3) docs/COACH-METHOD.md
4) docs/INTEGRATION-CONTRACTS.md
5) docs/RELEASE-PLAN-MVP2.md (Increment 6 / 10.4)

Scope (must include):
Decision Engine v2:
- Next-best-actions ranking using capacity, deadlines, KR risk, historical adherence
- Weekly plan pack: must-do / should-do / not-this-week + capacity summary
- Explainability payload: reason, impact, tradeoff, confidence for every recommendation

Skills compuestas (High Impact):
1) smart_process_inbox
   - inbox -> task linked to objective + scheduled block (1 confirm)
2) plan_and_schedule_week
   - plan week + auto-link objectives + create calendar blocks (1 confirm)
3) batch_reprioritize
   - one-click auto-redistribute when overload detected
4) breakdown_milestone
   - split milestone into sub-tasks and distribute into calendar

Out of scope:
- 10.5 UX panel (coach-first UI)
- RAG/KB improvements beyond current structure
- Any breaking changes to existing endpoints

Hard constraints:
1) Do NOT break Phase 8/9/9.1/10.2 behavior.
2) Guardrails remain final authority for mutations.
3) Every new mutation requires explicit confirm unless already in act-mode with valid actionId flow.
4) No duplication of business logic in prompts. Logic in backend tools.

Implementation hints:
- Reuse capacity + risk signals from coach-rules-engine.
- New composed tools should use existing lower-level tools for actual writes.
- Persist decision metadata in coach_events for audit.

Deliverables:
1) Backend: decision engine v2 with ranking + explainability payload.
2) Backend: 4 composed tools wired into LLM tool registry.
3) Docs: update ROADMAP.md + RELEASE-PLAN-MVP2.md + INTEGRATION-CONTRACTS.md
4) QA: docs/qa/FASE10_4-SUMMARY.md with 8–10 scenarios.

Tests required:
- Unit: ranking deterministic for fixed dataset
- Integration: weekly plan pack for overloaded and balanced cases
- Integration: each composed tool produces preview + confirmation flow
- Build: npm run build (web) if feasible

Final report must include:
- Files changed + why
- Mapping to AR-008..AR-010 + 4 composed tools
- Test commands and results
- Manual QA steps (5–10 min)
```
```
