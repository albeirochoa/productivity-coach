# FASE 10.1 - QA Checklist (Coach-first + Anti-vague)

Date: 2026-02-15
Scope: Response quality, degraded mode, and 5 core coaching cases

## Preconditions

1. Backend and frontend running.
2. `FF_COACH_CHAT_ACTIONS_ENABLED=true`.
3. Optional LLM mode:
- with `OPENAI_API_KEY` for normal path
- without key to validate degraded fallback path

## Case 1 - Weekly planning

Prompt:
- `Ayudame a planificar mi semana`

Expected:
1. Response is specific (not generic support text).
2. Includes current state and concrete next step.
3. If actionable mutation is proposed, it requires confirmation.

Pass criteria:
- No vague phrases.
- Preview/action flow works when applicable.

## Case 2 - Daily review

Prompt:
- `Como deberia organizar hoy mi dia`

Expected:
1. Response references current workload.
2. Recommends a realistic focus sequence for today.
3. Includes one clear next action.

Pass criteria:
- Response includes state + recommendation + next step.

## Case 3 - Overload rescue

Prompt:
- `Estoy sobrecargado, ayudame a recuperar control`

Expected:
1. Coach identifies overload risk if present.
2. Suggests reprioritization or redistribution.
3. If mutation is proposed, requires explicit confirmation.

Pass criteria:
- Advice is tied to capacity and not generic.

## Case 4 - Objective follow-up

Prompt:
- `Como van mis objetivos y que debo priorizar`

Expected:
1. Response references objective/KR context when available.
2. Recommends focus aligned to objectives at risk.

Pass criteria:
- Output is strategic and data-backed.

## Case 5 - Weekly close

Prompt:
- `Hazme un cierre semanal y que mejorar para la siguiente`

Expected:
1. Mentions completion trend and pending risk.
2. Gives one concrete improvement for next week.

Pass criteria:
- Response is actionable and not template-like.

## Anti-vague guard tests

Test A:
1. Force degraded mode (disable API key or induce model error).
2. Send a broad planning prompt.

Expected:
1. Response still contains useful state summary and actionable recommendation.
2. API includes `degraded=true`.
3. `responseSource` is fallback-related (`phase9_fallback`, `quality_fallback`, or `handler_fallback`).

Test B:
1. Validate no output contains these phrases as final response:
- `Parece que hubo un problema al obtener la informacion necesaria`
- `No puedo acceder a la informacion actual`
- `Intenta nuevamente mas tarde`

Expected:
1. Backend replaces vague text with deterministic coaching fallback.

## API verification checklist

For `POST /api/coach/chat/message`, verify:
1. `response` is present and actionable.
2. `degraded` exists when fallback is used.
3. `responseSource` exists when fallback/quality gate is used.
4. Mutation previews still include `requiresConfirmation=true`.

## Exit criteria

1. 5/5 core cases pass.
2. Anti-vague guard tests pass.
3. No regression on confirm/cancel flow.

