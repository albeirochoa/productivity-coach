# Fase 10.3B - Quick Start

**Status**: ✅ Completed (2026-02-15)
**Duration**: ~2 hours

---

## What's New

3 new API endpoints for coaching quality metrics:

1. **`GET /api/activity`** - Unified activity log
2. **`GET /api/coach/metrics?period=week`** - Aggregated metrics
3. **`GET /api/coach/metrics/weekly`** - Weekly quality report

Plus:
- **Conversation replay harness** for regression testing
- **Coach knowledge base** foundation (for RAG in future)

---

## Quick Test (2 minutes)

### 1. Build Check
```bash
cd web
npm run build
# Expected: ✓ built in ~4s
```

### 2. Module Load Check
```bash
node -e "import('./web/server/routes/coach-chat-routes.js').then(() => console.log('✓ OK')).catch(e => console.error('✗', e.message))"
# Expected: ✓ OK
```

### 3. Start Server
```bash
cd web
npm run dev
# Server starts on http://localhost:5173
# Backend on http://localhost:3000
```

### 4. Test Activity Endpoint
```bash
curl http://localhost:3000/api/activity?limit=10
# Expected: JSON with activities array
```

### 5. Test Metrics
```bash
curl http://localhost:3000/api/coach/metrics?period=week
# Expected: JSON with contextLossRate, acceptanceRate, etc.
```

### 6. Run Replay Suite
```bash
node web/qa/conversation-replay.mjs
# Expected: 10/10 scenarios pass (requires server running)
```

---

## New Endpoints

### GET /api/activity

**Purpose**: Unified activity log from coach_events

**Query params**:
- `limit` (default: 50)
- `offset` (default: 0)
- `type` (filter: 'generated', 'applied', 'rejected', 'blocked')

**Response**:
```json
{
  "activities": [
    {
      "id": "ce-...",
      "type": "generated",
      "category": "chat_action",
      "severity": "medium",
      "title": "Chat action: plan_week",
      "description": "...",
      "timestamp": "2026-02-15T..."
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### GET /api/coach/metrics

**Purpose**: Aggregated quality metrics

**Query params**:
- `period`: 'day', 'week', 'month', 'all' (default: 'week')

**Response**:
```json
{
  "period": "week",
  "since": "2026-02-08T...",
  "metrics": {
    "totalResponses": 45,
    "contextLossRate": 0.0444,
    "acceptanceRate": 0.7333,
    "slotCompletionRate": 0.8571,
    "recommendationsApplied": 11,
    "recommendationsRejected": 4,
    "vagueResponsesReplaced": 2,
    "howToQuestionsAnswered": 3,
    "multiTurnFlowsInProgress": 1
  },
  "breakdown": { ... }
}
```

---

### GET /api/coach/metrics/weekly

**Purpose**: Weekly quality report with insights

**Response**:
```json
{
  "period": "week",
  "since": "2026-02-08T...",
  "until": "2026-02-15T...",
  "summary": {
    "totalResponses": 45,
    "contextLossRate": 0.0444,
    "acceptanceRate": 0.7333,
    "adherenceRate": 0.6250,
    "objectivesAtRisk": 1
  },
  "wins": [
    "Alta tasa de aceptacion de recomendaciones (73.3%)",
    "Baja tasa de perdida de contexto (4.4%)"
  ],
  "failures": [
    "1 objetivo(s) en riesgo (< 30% progreso)"
  ],
  "recommendedFixes": [
    "Validar sobrecarga de capacidad semanal"
  ]
}
```

---

## Conversation Replay

**Purpose**: Detect context loss in multi-turn flows

**Location**: `web/qa/conversation-replay.mjs`

### Run all scenarios:
```bash
node web/qa/conversation-replay.mjs
```

### Run single scenario:
```bash
node web/qa/conversation-replay.mjs create-objective-2-turns
```

### Scenarios included (10):
1. `create-objective-2-turns` - Slot filling continuity
2. `create-objective-1-turn-complete` - All slots in one message
3. `affirmative-followup-inbox` - "si" resolves to action
4. `how-to-objectives` - Deterministic guide
5. `context-loss-prevention` - No vague fallback during pending
6. `slot-normalization-period` - Natural Spanish normalization
7. `cancel-flow` - State clears on cancel
8. `multiple-slots-objective` - Multi-slot collection
9. `llm-fallback-quality` - LLM failure → data-backed response
10. `how-to-calendar` - App feature guidance

---

## Coach Knowledge Base

**Location**: `docs/coach-kb/`

**Structure**:
```
coach-kb/
├── README.md (foundation)
├── methodologies/ (GTD, Time Blocking, OKR, Deep Work)
├── app-handbook/ (Inbox, Calendar, Objectives, Projects, Areas)
└── scenarios/ (Overload rescue, Weekly planning, Morning routine)
```

**Future**: Can be indexed for RAG retrieval (vector DB + embeddings)

**Rule**: RAG only for stable knowledge, NOT for user state (always use tools/DB)

---

## Files Changed

**Created**:
- `web/qa/conversation-replay.mjs` (340 L)
- `docs/coach-kb/README.md`
- `docs/qa/FASE10_3B-SUMMARY.md` (full docs)
- `docs/qa/FASE10_3B-QUICK-START.md` (this file)

**Modified**:
- `web/server/routes/coach-chat-routes.js` (+180 L)
- `docs/RELEASE-PLAN-MVP2.md` (status updated)
- `docs/ROADMAP.md` (Fase 10.3B completed)

---

## Rollback (if needed)

```bash
# Revert endpoints
git checkout HEAD~1 web/server/routes/coach-chat-routes.js

# Remove replay harness (optional)
rm web/qa/conversation-replay.mjs

# Keep knowledge base (no side effects)
```

**No schema changes**, **no data loss risk**.

---

## Next Steps (Fase 10.4)

1. Decision Engine v2
   - Next-best-actions ranking
   - Explainability payloads (reason, impact, tradeoff, confidence)
   
2. Optional: RAG implementation
   - Index coach-kb/ with embeddings
   - Top-k retrieval by query

3. Coach-first UX
   - Activity view in UI
   - Pending action banner
   - Coach command center panel

---

**Questions?** See `docs/qa/FASE10_3B-SUMMARY.md` for full documentation.
