# ⏱️ Capacity Planning API Reference

**Last Updated**: 2026-02-11
**Status**: ✅ Phase 3 Day 1 - Complete
**Related**: [Capacity Schema](../architecture/capacity-schema.md) | [API Reference](./api-reference.md)

---

## 🎯 Overview

The Capacity Planning module enables users to define their available work capacity and validate task commitments against realistic constraints. It prevents overload by calculating daily/weekly capacity based on work hours, breaks, and buffer time.

**Key Concept**: A user with 8 work hours can't realistically commit to 8 hours of focused work daily because of breaks, context switching, and unexpected interruptions.

---

## 📐 Configuration Model

Every user has a capacity configuration that drives all calculations:

```json
{
  "work_hours_per_day": 8,
  "buffer_percentage": 20,
  "break_minutes_per_day": 60,
  "work_days_per_week": 5
}
```

### Parameters

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `work_hours_per_day` | integer | 8 | 1-24 | Total hours available for work per day |
| `buffer_percentage` | integer | 20 | 0-50 | % of time reserved for unexpected work, meetings, context switching |
| `break_minutes_per_day` | integer | 60 | 0-180 | Lunch, coffee breaks, mental breaks (minutes) |
| `work_days_per_week` | integer | 5 | 1-7 | Days per week when you work (e.g., 5 = Mon-Fri) |

---

## 🧮 Capacity Calculation Formula

### Daily Capacity

```
Total Available = work_hours_per_day × 60 minutes

Available (after breaks) = Total Available - break_minutes_per_day

Usable (after buffer) = Available × (1 - buffer_percentage / 100)
```

**Example** (defaults):
```
Total Available = 8h × 60 = 480 minutes
Available = 480 - 60 (breaks) = 420 minutes (7 hours)
Usable = 420 × (1 - 0.20) = 336 minutes (5.6 hours)
```

**Meaning**: With 8-hour work days, 1-hour breaks, and 20% buffer, you can realistically commit to **5.6 hours** of focused tasks per day.

### Weekly Capacity

```
Weekly Total = Daily Total × work_days_per_week
Weekly Available = Daily Available × work_days_per_week
Weekly Usable = Daily Usable × work_days_per_week
```

**Example** (5-day work week):
```
Weekly Total = 480 × 5 = 2,400 minutes (40 hours)
Weekly Available = 420 × 5 = 2,100 minutes (35 hours)
Weekly Usable = 336 × 5 = 1,680 minutes (28 hours)
```

---

## 🔌 API Endpoints

### 1. GET /api/capacity/config

Retrieve the current user's capacity configuration.

**Request**:
```bash
curl http://localhost:3000/api/capacity/config
```

**Response** (200 OK):
```json
{
  "work_hours_per_day": 8,
  "buffer_percentage": 20,
  "break_minutes_per_day": 60,
  "work_days_per_week": 5
}
```

**Error** (500):
```json
{
  "error": "Failed to read configuration"
}
```

---

### 2. PATCH /api/capacity/config

Update one or more capacity configuration fields.

**Request**:
```bash
curl -X PATCH http://localhost:3000/api/capacity/config \
  -H "Content-Type: application/json" \
  -d '{
    "work_hours_per_day": 9,
    "buffer_percentage": 25
  }'
```

**Response** (200 OK):
```json
{
  "work_hours_per_day": 9,
  "buffer_percentage": 25,
  "break_minutes_per_day": 60,
  "work_days_per_week": 5
}
```

**Validation**:
- `work_hours_per_day`: Clamped to [1, 24]
- `buffer_percentage`: Clamped to [0, 50]
- `break_minutes_per_day`: Clamped to [0, 180]
- `work_days_per_week`: Clamped to [1, 7]

**Response** (400 Bad Request):
```json
{
  "error": "Invalid configuration value"
}
```

---

### 3. GET /api/capacity/week

Get the week's capacity summary and current load.

**Request**:
```bash
curl http://localhost:3000/api/capacity/week
```

**Response** (200 OK):
```json
{
  "config": {
    "work_hours_per_day": 8,
    "buffer_percentage": 20,
    "break_minutes_per_day": 60,
    "work_days_per_week": 5
  },
  "weekly_capacity": {
    "total_minutes": 2400,
    "available_minutes": 2100,
    "usable_minutes": 1680
  },
  "weekly_load": {
    "total_minutes": 420,
    "tasks": [
      {
        "id": "task-123",
        "title": "Design onboarding flow",
        "estimated_minutes": 120
      },
      {
        "id": "task-456",
        "title": "Code review",
        "estimated_minutes": 60
      }
    ]
  },
  "status": {
    "utilization_percent": 25,
    "remaining_minutes": 1260,
    "is_overloaded": false
  }
}
```

**Fields Explained**:
- `utilization_percent`: (weekly_load / usable_minutes) × 100
- `remaining_minutes`: usable_minutes - total_load
- `is_overloaded`: true if weekly_load > usable_minutes

---

### 4. GET /api/capacity/today

Get today's capacity and committed tasks.

**Request**:
```bash
curl http://localhost:3000/api/capacity/today
```

**Response** (200 OK):
```json
{
  "date": "2026-02-11",
  "day_of_week": "wednesday",
  "config": {
    "work_hours_per_day": 8,
    "buffer_percentage": 20,
    "break_minutes_per_day": 60
  },
  "daily_capacity": {
    "total_minutes": 480,
    "available_minutes": 420,
    "usable_minutes": 336
  },
  "daily_load": {
    "total_minutes": 240,
    "tasks": [
      {
        "id": "task-789",
        "title": "Review pull requests",
        "estimated_minutes": 120
      },
      {
        "id": "task-101",
        "title": "Client meeting",
        "estimated_minutes": 60
      },
      {
        "id": "task-102",
        "title": "Documentation",
        "estimated_minutes": 60
      }
    ]
  },
  "status": {
    "utilization_percent": 71,
    "remaining_minutes": 96,
    "color": "yellow",
    "message": "Good pace - room for one more small task"
  }
}
```

**Status Colors**:
- 🟢 **Green** (0-70%): Comfortable pace, room for more
- 🟡 **Yellow** (70-90%): Getting full, be careful with additions
- 🔴 **Red** (90%+): Overloaded, recommend redistribution

---

### 5. POST /api/capacity/validate-commitment

Check if adding a task/milestone would cause overload.

**Request**:
```bash
curl -X POST http://localhost:3000/api/capacity/validate-commitment \
  -H "Content-Type: application/json" \
  -d '{
    "estimated_minutes": 240,
    "scope": "week"
  }'
```

**Scope Options**:
- `"day"`: Check if fits in today's available capacity
- `"week"`: Check if fits in this week's available capacity

**Response** (200 OK):
```json
{
  "valid": false,
  "reason": "Would exceed weekly capacity by 96 minutes",
  "current_load": 1584,
  "available_capacity": 1680,
  "estimated_load_after": 1824,
  "recommendation": "Consider: (1) extending timeline, (2) reducing scope, (3) increasing capacity"
}
```

**Response** (200 OK - Valid):
```json
{
  "valid": true,
  "reason": "Fits comfortably in weekly capacity",
  "current_load": 420,
  "available_capacity": 1680,
  "estimated_load_after": 660,
  "utilization_after_percent": 39
}
```

---

## 📊 Response Examples

### Weekly Overload Scenario

```json
{
  "weekly_capacity": {
    "total_minutes": 2400,
    "available_minutes": 2100,
    "usable_minutes": 1680
  },
  "weekly_load": {
    "total_minutes": 2100,
    "tasks": [...]
  },
  "status": {
    "utilization_percent": 125,
    "remaining_minutes": -420,
    "is_overloaded": true,
    "overload_minutes": 420,
    "redistribution_suggestions": [
      {
        "task": "Lower priority project work",
        "estimated_minutes": 240,
        "suggestion": "Move to next week or reduce scope"
      }
    ]
  }
}
```

### Daily Capacity Colors

```javascript
// In capacity-calculator.js
export function getCapacityColor(utilizationPercent) {
  if (utilizationPercent <= 70) return 'green';   // 🟢 Comfortable
  if (utilizationPercent <= 90) return 'yellow';  // 🟡 Getting full
  return 'red';                                    // 🔴 Overloaded
}
```

---

## 🔄 Integration with Tasks

When creating/updating tasks, include `estimated_minutes`:

```json
{
  "id": "task-123",
  "title": "Design onboarding flow",
  "type": "simple",
  "estimated_minutes": 120,
  "status": "active",
  "thisWeek": true
}
```

The system automatically:
1. ✅ Sums estimated minutes for all `thisWeek: true` tasks
2. ✅ Compares against `weekly_usable_minutes`
3. ✅ Returns warnings if overloaded
4. ✅ Suggests redistribution in UI

---

## 🚀 Frontend Integration

### Example React Hook Usage

```javascript
import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export function useCapacity() {
  const [config, setConfig] = useState(null);
  const [weekCapacity, setWeekCapacity] = useState(null);
  const [todayCapacity, setTodayCapacity] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCapacity = async () => {
      setLoading(true);
      try {
        const [cfg, week, today] = await Promise.all([
          api.get('/api/capacity/config'),
          api.get('/api/capacity/week'),
          api.get('/api/capacity/today'),
        ]);
        setConfig(cfg.data);
        setWeekCapacity(week.data);
        setTodayCapacity(today.data);
      } finally {
        setLoading(false);
      }
    };
    loadCapacity();
  }, []);

  return { config, weekCapacity, todayCapacity, loading };
}
```

### Display Capacity Indicator

```jsx
function CapacityIndicator({ weekCapacity }) {
  const { status } = weekCapacity;
  const bgColor = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }[status.color];

  return (
    <div className={`${bgColor} p-4 rounded-lg`}>
      <p>{status.utilization_percent}% of weekly capacity used</p>
      <p className="text-sm">{status.remaining_minutes} minutes available</p>
    </div>
  );
}
```

---

## ⚠️ Common Patterns

### Preventing Overload

```javascript
// Before committing to a task
const validation = await api.post('/api/capacity/validate-commitment', {
  estimated_minutes: 240,
  scope: 'week'
});

if (!validation.data.valid) {
  showWarning(`${validation.data.reason}`);
  return;
}
```

### Adjusting Capacity Settings

```javascript
// User realizes they only have 6 productive hours/day
await api.patch('/api/capacity/config', {
  work_hours_per_day: 6,
  buffer_percentage: 25  // Being more realistic
});
```

### Weekly Planning

```javascript
// At start of week: see full picture
const weekData = await api.get('/api/capacity/week');

// Then redistribute tasks based on remaining capacity
tasks.forEach(task => {
  const canFit = task.estimated_minutes <= weekData.status.remaining_minutes;
  task.recommended_for_this_week = canFit;
});
```

---

## 🔗 Related Documentation

- **[Capacity Schema & Database](../architecture/capacity-schema.md)** - Database design and calculation logic
- **[API Reference](./api-reference.md)** - Full endpoint documentation
- **[MVP Contract](../MVP-CONTRACT.md)** - What capacity planning means in MVP scope
- **[Phase 3 Implementation](../FASE3-DAY1-COMPLETADO.md)** - What was built

---

## 📝 Notes

### Why "Usable" vs "Available"?

- **Available** = Work hours minus breaks
- **Usable** = Available minus buffer for unexpected work

Example: Even though you have 7 hours available, a 20% buffer means only 5.6 hours are realistically for planned work. The other 1.4 hours absorb meetings, Slack, unexpected requests, etc.

### Estimation Best Practices

Users should estimate `estimated_minutes` based on:
- ✅ Past experience (how long similar tasks took)
- ✅ Complexity assessment
- ✅ Unknown unknowns (add 20-30% buffer per task)

Don't estimate in exact hours (people are bad at it). Use ranges:
- Simple: 30-60 minutes
- Medium: 90-180 minutes
- Complex: 240+ minutes

---

**Last Updated**: 2026-02-11
**Next Review**: When Phase 4 (Time Blocking) begins
