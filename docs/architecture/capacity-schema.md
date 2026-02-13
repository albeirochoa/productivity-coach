# 🗄️ Capacity Planning Schema & Architecture

**Last Updated**: 2026-02-11
**Status**: ✅ Phase 3 Day 1 - Complete
**Related**: [Capacity API](../web-app/capacity-planning.md) | [Data Schema](./data-schema.md) | [Migration 002](../../web/server/db/migrations/002_capacity.sql)

---

## 📋 Overview

Phase 3 Day 1 introduced capacity planning to the Productivity Coach. This document defines:
1. Database schema changes
2. In-memory data structures
3. Calculation algorithms
4. Data flow through the system

---

## 🗃️ Database Schema

### Migration 002: Capacity Planning

**File**: `web/server/db/migrations/002_capacity.sql`

Adds 4 new columns to the `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN work_hours_per_day INTEGER DEFAULT 8;
ALTER TABLE profiles ADD COLUMN buffer_percentage INTEGER DEFAULT 20;
ALTER TABLE profiles ADD COLUMN break_minutes_per_day INTEGER DEFAULT 60;
ALTER TABLE profiles ADD COLUMN work_days_per_week INTEGER DEFAULT 5;
```

### Updated profiles Table Schema

```sql
CREATE TABLE profiles (
  id INTEGER PRIMARY KEY,
  name TEXT,
  roles TEXT,              -- JSON array
  life_areas TEXT,         -- JSON object
  goals_2026 TEXT,         -- JSON object

  -- Phase 3: Capacity Planning
  work_hours_per_day INTEGER DEFAULT 8,
  buffer_percentage INTEGER DEFAULT 20,
  break_minutes_per_day INTEGER DEFAULT 60,
  work_days_per_week INTEGER DEFAULT 5,

  created_at TEXT,
  updated_at TEXT
);
```

### Field Constraints

| Column | Type | Default | Min | Max | Description |
|--------|------|---------|-----|-----|-------------|
| `work_hours_per_day` | INTEGER | 8 | 1 | 24 | Total work hours per day |
| `buffer_percentage` | INTEGER | 20 | 0 | 50 | % reserved for unexpected work |
| `break_minutes_per_day` | INTEGER | 60 | 0 | 180 | Break time in minutes |
| `work_days_per_week` | INTEGER | 5 | 1 | 7 | Days worked per week |

### Default Configuration

The MVP uses sensible defaults for a typical developer:
- **8 hours** work per day (standard full-time)
- **20% buffer** (1.6 hours for interruptions)
- **60 minutes** breaks (1 hour lunch)
- **5 days/week** (Monday-Friday)

**Result**: 5.6 usable hours per day, 28 hours per week

---

## 📊 In-Memory Configuration

When the backend reads capacity config from the database, it creates this structure:

```javascript
// From profile.json or profiles table
const capacityConfig = {
  work_hours_per_day: 8,
  buffer_percentage: 20,
  break_minutes_per_day: 60,
  work_days_per_week: 5
};
```

This is used by the `capacity-calculator.js` module for all calculations.

---

## 🧮 Calculation Engine

**File**: `web/server/helpers/capacity-calculator.js` (238 lines)

### 1. calculateDailyCapacity(config)

Calculates available and usable capacity for a single day.

```javascript
export function calculateDailyCapacity(config) {
  const totalMinutes = config.work_hours_per_day * 60;
  const availableMinutes = totalMinutes - config.break_minutes_per_day;
  const usableMinutes = Math.floor(
    availableMinutes * (1 - config.buffer_percentage / 100)
  );

  return {
    total: totalMinutes,           // e.g., 480 (8 hours)
    available: availableMinutes,   // e.g., 420 (7 hours)
    usable: usableMinutes,         // e.g., 336 (5.6 hours)
  };
}
```

**Example Output**:
```javascript
{
  total: 480,      // 8 hours in minutes
  available: 420,  // 480 - 60 (breaks)
  usable: 336      // 420 * 0.8 (after 20% buffer)
}
```

### 2. calculateWeeklyCapacity(config)

Extends daily capacity to full work week.

```javascript
export function calculateWeeklyCapacity(config) {
  const daily = calculateDailyCapacity(config);
  const workDays = config.work_days_per_week;

  return {
    total: daily.total * workDays,
    available: daily.available * workDays,
    usable: daily.usable * workDays,
  };
}
```

**Example Output** (5-day week):
```javascript
{
  total: 2400,      // 480 * 5
  available: 2100,  // 420 * 5
  usable: 1680      // 336 * 5
}
```

### 3. calculateWeeklyLoad(tasks)

Sums estimated minutes for all tasks marked `thisWeek: true`.

```javascript
export function calculateWeeklyLoad(tasks) {
  let totalMinutes = 0;

  for (const task of tasks) {
    if (task.thisWeek && task.status !== 'done' && task.status !== 'archived') {
      totalMinutes += task.estimated_minutes || 0;
    }
  }

  return totalMinutes;
}
```

**Returns**: Total committed minutes for the week

### 4. detectOverload(weeklyCapacity, weeklyLoad)

Checks if load exceeds available capacity.

```javascript
export function detectOverload(weeklyCapacity, weeklyLoad) {
  const overloaded = weeklyLoad > weeklyCapacity.usable;
  const overloadMinutes = overloaded
    ? weeklyLoad - weeklyCapacity.usable
    : 0;

  return {
    is_overloaded: overloaded,
    overload_minutes: overloadMinutes,
    utilization_percent: Math.round(
      (weeklyLoad / weeklyCapacity.usable) * 100
    ),
  };
}
```

**Example Scenarios**:

```javascript
// Comfortable
detectOverload(
  { usable: 1680 },  // 28 hours
  420                 // 7 hours committed
)
// → { is_overloaded: false, utilization_percent: 25 }

// Overloaded
detectOverload(
  { usable: 1680 },
  2100                // 35 hours committed
)
// → { is_overloaded: true, overload_minutes: 420, utilization_percent: 125 }
```

### 5. suggestRedistribution(tasks, weeklyCapacity)

Recommends which lower-priority tasks to defer.

```javascript
export function suggestRedistribution(tasks, weeklyCapacity) {
  const weeklyLoad = calculateWeeklyLoad(tasks);

  if (weeklyLoad <= weeklyCapacity.usable) {
    return [];  // No redistribution needed
  }

  const excess = weeklyLoad - weeklyCapacity.usable;
  const thisWeekTasks = tasks.filter(t => t.thisWeek && t.status !== 'done');

  // Sort by priority (lower priority first)
  thisWeekTasks.sort((a, b) => (a.priority || 999) - (b.priority || 999));

  const suggestions = [];
  let accumulated = 0;

  for (const task of thisWeekTasks) {
    if (accumulated >= excess) break;
    accumulated += task.estimated_minutes || 0;
    suggestions.push({
      task: task.title,
      estimated_minutes: task.estimated_minutes,
      suggestion: 'Move to next week or reduce scope'
    });
  }

  return suggestions;
}
```

### 6. formatMinutes(minutes)

Converts minutes to human-readable format.

```javascript
export function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
```

**Examples**:
- `336` → `"5h 36m"`
- `480` → `"8h"`
- `45` → `"45m"`

### 7. getCapacityColor(utilizationPercent)

Returns visual indicator color based on utilization.

```javascript
export function getCapacityColor(utilizationPercent) {
  if (utilizationPercent <= 70) return 'green';
  if (utilizationPercent <= 90) return 'yellow';
  return 'red';
}
```

| Range | Color | Meaning |
|-------|-------|---------|
| 0-70% | 🟢 Green | Comfortable, room for more |
| 70-90% | 🟡 Yellow | Getting full, careful adding |
| 90%+ | 🔴 Red | Overloaded, redistribute |

---

## 🔄 Data Flow Architecture

### Daily Capacity Calculation Flow

```
User Profile (profiles table)
         ↓
    Read capacity config
    (work_hours_per_day, buffer_percentage, etc.)
         ↓
  calculateDailyCapacity()
         ↓
  {total, available, usable} per day
         ↓
  calculateWeeklyCapacity() [multiply by work_days_per_week]
         ↓
  {total, available, usable} per week
```

### Load Calculation Flow

```
Tasks Table (tasks table, filtered by thisWeek = true)
         ↓
  Extract estimated_minutes from each active task
         ↓
  calculateWeeklyLoad()
         ↓
  Sum of committed minutes
         ↓
  detectOverload(capacity, load)
         ↓
  {is_overloaded, utilization_percent, overload_minutes}
```

### Request-Response Example

```
GET /api/capacity/week
         ↓
  Read capacity config from profiles table
  Read tasks filtered by thisWeek = true
         ↓
  capacity = calculateWeeklyCapacity(config)
  load = calculateWeeklyLoad(tasks)
  status = detectOverload(capacity, load)
         ↓
  Return {config, capacity, load, status}
```

---

## 📝 Tasks Table Integration

Each task now has an `estimated_minutes` field (optional):

```javascript
// In tasks-data.json or tasks table
{
  "id": "task-123",
  "title": "Design onboarding flow",
  "type": "simple",
  "status": "active",
  "thisWeek": true,
  "estimated_minutes": 120,  // NEW in Phase 3
  "created_at": "2026-02-11T10:00:00Z"
}
```

**Rules**:
- ✅ Only count if `thisWeek: true`
- ✅ Exclude if `status: "done"` or `status: "archived"`
- ✅ If missing, assume 0 (legacy tasks)

---

## 🔌 Capacity Routes

**File**: `web/server/routes/capacity-routes.js` (262 lines)

### Endpoints Implemented

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/capacity/config` | Retrieve capacity configuration |
| PATCH | `/api/capacity/config` | Update capacity settings |
| GET | `/api/capacity/week` | Get weekly capacity + load summary |
| GET | `/api/capacity/today` | Get today's capacity + load |
| POST | `/api/capacity/validate-commitment` | Validate if task fits |

All endpoints:
- ✅ Read from database (Phase 2 SQLite or Phase 1 JSON)
- ✅ Apply validation (clamp values to allowed ranges)
- ✅ Log via Winston
- ✅ Return consistent JSON responses
- ✅ Handle errors gracefully

### Example Route: GET /api/capacity/week

```javascript
app.get('/api/capacity/week', async (req, res) => {
  try {
    // 1. Read capacity config
    const profile = await readJson('profile.json');
    const config = profile.capacity || {};

    // 2. Read all tasks
    const data = await readJson('tasks-data.json');

    // 3. Calculate capacity
    const capacity = calculateWeeklyCapacity(config);
    const load = calculateWeeklyLoad(data.tasks);
    const status = detectOverload(capacity, load);

    // 4. Build response
    res.json({
      config,
      weekly_capacity: {
        total_minutes: capacity.total,
        available_minutes: capacity.available,
        usable_minutes: capacity.usable,
      },
      weekly_load: {
        total_minutes: load,
        tasks: data.tasks.filter(t => t.thisWeek && t.status !== 'done'),
      },
      status: {
        utilization_percent: status.utilization_percent,
        remaining_minutes: capacity.usable - load,
        is_overloaded: status.is_overloaded,
        overload_minutes: status.overload_minutes,
      },
    });
  } catch (error) {
    logger.error('Capacity calc failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🔐 Data Persistence

### Phase 1 (Current MVP)
- Capacity config stored in `profile.json`
- Task estimates stored inline in `tasks-data.json`
- JSON backup every 24 hours

### Phase 2 (SQLite)
- Capacity config in `profiles.capacity_*` columns
- Task estimates in `tasks.estimated_minutes` column
- SQLite backup after each change

### Migration Strategy
Capacity fields have sensible defaults, so migration is safe:
- Users without explicit config default to 8/20/60/5
- Tasks without `estimated_minutes` treated as 0-minute work

---

## ⚠️ Business Rules

### 1. Capacity is per User
Each profile has its own capacity config. Multi-user support requires adjusting this per user.

### 2. Load Only Counts This Week
```javascript
// Only these tasks count toward weekly load:
tasks.filter(t => t.thisWeek && t.status !== 'done' && t.status !== 'archived')
```

### 3. Buffer is Mandatory
The 20% buffer exists because:
- No one works 100% on planned tasks
- ~20% is reserved for: Slack, meetings, unexpected issues, context switching

### 4. Estimates are User Input
The system **trusts** the user's estimate. It:
- ✅ Warns if total load exceeds capacity
- ✅ Never blocks task creation (soft constraint)
- ✅ Suggests redistribution (not enforced)

---

## 🚀 Performance Considerations

### Calculation Speed
- `calculateDailyCapacity()`: <1ms (4 arithmetic operations)
- `calculateWeeklyLoad()`: O(n) where n = tasks (filter + sum)
- Typical n=30 tasks: <5ms

### Database Indexes
When migrated to SQLite Phase 2, add:
```sql
CREATE INDEX idx_tasks_this_week ON tasks(this_week)
    WHERE status NOT IN ('done', 'archived');
```

This makes weekly load calculation near-instant for 1000+ tasks.

---

## 📈 Future Enhancements (Post-MVP)

### Phase 4: Time Blocking
```sql
ALTER TABLE tasks ADD COLUMN scheduled_start DATETIME;
ALTER TABLE tasks ADD COLUMN scheduled_end DATETIME;
```

This enables:
- ✅ Actual calendar blocking
- ✅ Conflict detection (overlapping time blocks)
- ✅ Realistic daily schedules

### Phase 5: Weekly Planning
```sql
-- Weekly redistribution history
CREATE TABLE weekly_plans (
  id INTEGER PRIMARY KEY,
  week_starting DATE,
  total_load INTEGER,
  redistributed_tasks TEXT,  -- JSON array
  created_at DATETIME
);
```

### Phase 6: OKR Integration
Link capacity to strategic goals:
```sql
ALTER TABLE tasks ADD COLUMN key_result_id INTEGER;
-- Then measure: "How much capacity is this quarter's OKRs consuming?"
```

---

## 🔗 Related Documentation

- **[Capacity Planning API](../web-app/capacity-planning.md)** - Complete endpoint docs
- **[Data Schema](./data-schema.md)** - Overall data model
- **[Tech Stack](./tech-stack.md)** - Node + Express + SQLite
- **[Database Migration 002](../../web/server/db/migrations/002_capacity.sql)** - SQL source

---

**Last Updated**: 2026-02-11
**Next Milestone**: Phase 4 (Time Blocking) - adds calendar integration
