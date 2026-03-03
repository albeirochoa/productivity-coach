# Productivity Coach LITE - Roadmap

Date: 2026-02-16
Status: Draft (public-lite track)

## Goal

Ship a public, low-friction version focused on planning and follow-through, not advanced configuration.

## Product stance

1. Coach-led planning is the core value.
2. Hide complexity; expose only what drives weekly execution.
3. One objective at a time, two KRs max.

## Core surfaces (3 screens)

1. **Hoy**
   - Top 3 tasks
   - 2-3 focus blocks suggested
2. **Semana**
   - Prioritized list within capacity
   - Capacity bar + overflow warning
3. **Coach**
   - Diagnosis + 3 recommendations
   - Apply / Postpone / Explain

## MVP LITE Scope

### Must have

1. Guided weekly plan (mandatory)
   - Force selection of 3 objectives max
   - Capacity-based task limit
   - 2–3 blocks per day suggestion
2. Daily review (5 minutes)
   - What moved, what dropped, what remains
3. Overload rescue
   - One-click reprioritization
4. One objective active at a time
5. Two KRs max per objective
6. Simple task creation + calendar blocks
7. Coach recommendations with explainability (reason + impact)

### Nice to have (post-MVP)

1. Habit tracking
2. Simple templates (content, learning)
3. Weekly report summary

### Explicitly out of scope

1. Multi-objective portfolios
2. Project milestones and sections
3. Advanced calendar drag/drop views
4. Deep customization of styles and rules
5. Full chat-based CRUD

## Phases

### Phase L1 - Core planning (2 weeks)

Deliverables:
- Guided weekly plan flow
- Capacity validation + overload rescue
- Coach recommendations v2

Acceptance:
- User produces a realistic weekly plan in < 3 minutes

### Phase L2 - Daily review (1 week)

Deliverables:
- Daily review flow
- Auto-adjust tasks for today

Acceptance:
- Daily review completed in < 5 minutes

### Phase L3 - Minimal release (1 week)

Deliverables:
- Onboarding (objective + 2 KRs + first weekly plan)
- Basic analytics (adherence, overloads)
- Privacy-safe logs

Acceptance:
- New user completes onboarding in < 10 minutes

## Success metrics

1. Weekly plan adherence >= 70%
2. Overload incidents reduced week over week
3. Daily review completion >= 4 times per week

## Feature flags (lite)

- `FF_LITE_MODE_ENABLED`
- `FF_LITE_WEEKLY_PLAN_REQUIRED`
- `FF_LITE_DAILY_REVIEW_REQUIRED`

