# 📊 SQLite Schema - Productivity Coach

**Fecha**: 2026-02-11
**Status**: Design Phase (Day 1)
**Database**: `productivity-coach.sqlite`

---

## 🎯 Objetivo

Migrar de JSON files a SQLite manteniendo:
- ✅ Todos los datos existentes
- ✅ Misma API (endpoints NO cambian)
- ✅ Reversibilidad (poder volver a JSON si es necesario)
- ✅ Performance (queries optimizadas)

---

## 📐 Schema Design

### 1. CORE TABLES

#### `profiles` - Información de usuario
```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL,
  created_date TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/Bogota',
  language TEXT DEFAULT 'es',
  weekly_checkin_day TEXT DEFAULT 'monday',
  weekly_review_day TEXT DEFAULT 'friday',
  midweek_check_day TEXT DEFAULT 'wednesday',
  max_weekly_commitments INTEGER DEFAULT 6,
  -- JSON columns for complex data structures
  roles TEXT,        -- JSON array
  life_areas TEXT,   -- JSON object
  work_patterns TEXT, -- JSON object
  challenges TEXT,   -- JSON object
  goals_2026 TEXT,   -- JSON object
  preferences TEXT   -- JSON object
);
```

**Notas**:
- `roles`, `life_areas`, `goals_2026` → JSON porque son arrays/objects complejos
- SQLite soporta JSON nativamente con funciones `json_extract()`, `json_array()`, etc.
- Mantiene flexibilidad sin duplicar datos

---

#### `tasks` - Tareas simples y proyectos
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'simple' | 'project'
  status TEXT NOT NULL, -- 'active' | 'done' | 'archived'
  category TEXT,
  strategy TEXT, -- Para proyectos: 'goteo' | 'batching' | 'blitzing'

  -- Commitment
  this_week BOOLEAN DEFAULT 0,
  week_committed TEXT, -- ISO week format 'YYYY-Www'

  -- Hierarchy
  parent_id TEXT, -- Para proyectos hijos
  current_milestone INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT NOT NULL,
  completed_at TEXT,

  -- Metadata
  migrated_from TEXT, -- JSON para rastrear origen
  processed_from TEXT, -- JSON para rastrear si vino de inbox

  -- Indexes
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_this_week (this_week),
  INDEX idx_category (category)
);
```

**Notas**:
- `type='project'` → puede tener milestones y seciones
- `type='simple'` → tarea directa, sin milestones
- `parent_id` permite jerarquía (proyecto hijo)
- `week_committed` = '2026-W07' (ISO format)
- `migrated_from`, `processed_from` → JSON para metadata histórica

---

#### `milestones` - Hitos dentro de proyectos
```sql
CREATE TABLE milestones (
  id TEXT PRIMARY KEY, -- 'milestone-1', 'milestone-2', etc
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_estimate INTEGER, -- minutos (1-480)
  completed BOOLEAN DEFAULT 0,
  completed_at TEXT,
  section_id TEXT, -- Para agrupar en secciones

  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  INDEX idx_task_id (task_id),
  INDEX idx_completed (completed)
);
```

**Notas**:
- Cada milestone pertenece a exactamente 1 task (proyecto)
- `time_estimate` en minutos para cálculos de capacidad
- Cascade delete para mantener integridad

---

#### `sections` - Agrupaciones dentro de proyectos
```sql
CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,

  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  INDEX idx_task_id (task_id)
);
```

**Notas**:
- Opcional: agrupa milestones en categorías
- Ej: "Setup", "Content", "Deployment" dentro de un proyecto

---

#### `committed_milestones` - Milestones comprometidos para la semana
```sql
CREATE TABLE committed_milestones (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  task_id TEXT NOT NULL,
  milestone_id TEXT NOT NULL,
  committed_at TEXT NOT NULL,

  UNIQUE(task_id, milestone_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
  INDEX idx_task_id (task_id)
);
```

**Notas**:
- Many-to-many: un task puede tener múltiples milestones comprometidos
- `committed_at` para auditar cuándo se comprometió
- Garantiza no duplicados con UNIQUE constraint

---

### 2. INBOX TABLES

#### `inbox` - Items de captura rápida
```sql
CREATE TABLE inbox (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- 'work' | 'personal'
  text TEXT NOT NULL,
  due_date TEXT, -- ISO date
  priority TEXT, -- 'low' | 'normal' | 'high'
  reminders TEXT, -- JSON array
  created_at TEXT NOT NULL,

  INDEX idx_category (category),
  INDEX idx_created_at (created_at)
);
```

**Notas**:
- Todos los inbox items en UNA tabla, diferenciados por `category`
- `reminders` → JSON array (vacío en MVP)
- Auditoría con `created_at`

---

### 3. STATS TABLES

#### `stats` - Estadísticas globales
```sql
CREATE TABLE stats (
  id TEXT PRIMARY KEY DEFAULT 'default',
  total_weeks INTEGER DEFAULT 0,
  total_commitments INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  projects_completed INTEGER DEFAULT 0,
  monthly_completion_rates TEXT, -- JSON object
  last_updated TEXT NOT NULL
);
```

**Notas**:
- Una sola fila (id='default')
- `monthly_completion_rates` → JSON para flexibilidad
- `last_updated` para saber cuándo se recalculó

---

#### `streak_history` - Histórico de racha diaria (Fase 3+)
```sql
CREATE TABLE streak_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
  completed_count INTEGER,
  task_ids TEXT, -- JSON array
  created_at TEXT NOT NULL
);
```

**Notas**:
- Opcional para MVP pero útil para analytics
- Será usado en Fase 3 para cálculos de capacidad

---

### 4. METADATA TABLES

#### `migrations` - Control de versiones de schema
```sql
CREATE TABLE migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT UNIQUE NOT NULL, -- '001', '002', etc
  name TEXT NOT NULL, -- 'init_schema', 'add_cascade_deletes', etc
  executed_at TEXT NOT NULL,
  execution_time_ms INTEGER,
  status TEXT DEFAULT 'success' -- 'success' | 'failed'
);
```

**Notas**:
- Registra cada migración ejecutada
- Permite volver a versiones anteriores
- Ejecutado automáticamente al startup

---

#### `backup_metadata` - Control de backups (Fase 1+)
```sql
CREATE TABLE backup_metadata (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  created_at TEXT NOT NULL,
  size_bytes INTEGER,
  checksum TEXT,
  status TEXT DEFAULT 'success'
);
```

**Notas**:
- Registra backups de la BD (complementa backup-manager.js)
- Permite restauración inteligente

---

## 🔄 JSON → SQLite Mapping

### Profile (tasks-data.json.config → profiles)
```json
ANTES:
{
  "config": {
    "name": "Albeiro",
    "timezone": "America/Bogota",
    ...
  }
}

DESPUÉS:
INSERT INTO profiles (name, timezone, ...)
VALUES ('Albeiro', 'America/Bogota', ...);
```

### Tasks (tasks-data.json.tasks → tasks + milestones)
```json
ANTES:
{
  "tasks": [{
    "id": "task-123",
    "title": "...",
    "type": "project",
    "milestones": [
      { "id": "milestone-1", "title": "...", ... },
      { "id": "milestone-2", "title": "...", ... }
    ]
  }]
}

DESPUÉS:
INSERT INTO tasks (id, title, type, ...)
VALUES ('task-123', '...', 'project', ...);

INSERT INTO milestones (id, task_id, title, ...)
VALUES ('milestone-1', 'task-123', '...', ...);

INSERT INTO milestones (id, task_id, title, ...)
VALUES ('milestone-2', 'task-123', '...', ...);
```

### Inbox (tasks-data.json.inbox → inbox)
```json
ANTES:
{
  "inbox": {
    "work": [
      { "id": "...", "text": "...", "date": "..." }
    ],
    "personal": [...]
  }
}

DESPUÉS:
INSERT INTO inbox (id, category, text, created_at)
VALUES ('...', 'work', '...', '...');
```

### Stats (tasks-data.json.stats → stats)
```json
ANTES:
{
  "stats": {
    "tasks_completed": 1,
    "projects_completed": 0,
    ...
  }
}

DESPUÉS:
INSERT INTO stats (id, tasks_completed, projects_completed, ...)
VALUES ('default', 1, 0, ...);
```

---

## 🔐 Constraints & Integrity

### Primary Keys
- ✅ Todas las tablas tienen PK único
- ✅ SQLite genera UUIDs con `lower(hex(randomblob(16)))`

### Foreign Keys
- ✅ Habilitadas: `PRAGMA foreign_keys = ON`
- ✅ Cascade deletes para tablas dependientes
- ✅ Set NULL para relaciones opcionales

### Indexes
- ✅ Index en `status` (búsquedas frecuentes)
- ✅ Index en `type` (diferencia simple/project)
- ✅ Index en `this_week` (lista semanal)
- ✅ Index en `category` (filtrar por área)

### Unique Constraints
- ✅ `(task_id, milestone_id)` en committed_milestones
- ✅ `version` en migrations
- ✅ `date` en streak_history

---

## 📝 View Layer (Optional)

Para simplificar queries complejas:

```sql
-- Vista: Tareas de esta semana expandidas
CREATE VIEW this_week_expanded AS
SELECT
  t.id, t.title, t.type, t.status,
  CASE WHEN t.type = 'project'
    THEN (SELECT COUNT(*) FROM milestones WHERE task_id = t.id)
    ELSE 0
  END as milestone_count,
  CASE WHEN t.type = 'project'
    THEN (SELECT COUNT(*) FROM milestones WHERE task_id = t.id AND completed = 1)
    ELSE 0
  END as milestones_completed
FROM tasks t
WHERE t.this_week = 1 AND t.status = 'active';
```

---

## 🚀 Migration Strategy

### Phase 1: Design (Hoy)
- ✅ Schema definido
- ✅ Mapping JSON ↔ SQL documentado
- ✅ Constraints definidos

### Phase 2: Implementation (Mañana)
1. Instalar `better-sqlite3`
2. Crear tabla migrations
3. Ejecutar migración `001_init.sql`
4. Crear `db-manager.js` con queries optimizadas

### Phase 3: Migration (Day 3)
1. Leer `tasks-data.json` y `profile.json`
2. Insertar en SQLite preservando exactamente los datos
3. Validar integridad (counts, relationships)
4. Guardar JSON original como backup

### Phase 4: Integration (Day 4)
1. Reemplazar `readJson/writeJson` con DB queries
2. Actualizar routes para usar `db.query()` en lugar de archivo
3. Mantener backups automáticos de BD

### Phase 5: Testing (Day 5)
1. Smoke tests de todos los endpoints
2. Validar restauración desde backup
3. Performance check (tiempo de query)
4. Rollback plan si es necesario

---

## 🔄 Reversibility Plan

Si necesitamos volver a JSON:

```bash
# Exportar SQLite → JSON
npm run db:export-json

# Resultado:
# - tasks-data.json (reconstruido desde BD)
# - profile.json (reconstruido desde BD)
# - Byte-for-byte idéntico al original (si migramos bien)
```

---

## 📊 Performance Expectations

### Antes (JSON)
```
GET /api/tasks/this-week:
- Leer archivo (I/O disk)
- Parse JSON (~300ms si archivo > 1MB)
- Filter en memoria
- Total: ~300-500ms
```

### Después (SQLite)
```
GET /api/tasks/this-week:
- Query SQL con WHERE this_week = 1
- Index hit en idx_this_week
- Total: ~5-10ms (50x más rápido)
```

### Queries Críticas
```sql
-- Tareas esta semana (index: idx_this_week)
SELECT * FROM tasks WHERE this_week = 1;

-- Por tipo (index: idx_type)
SELECT * FROM tasks WHERE type = 'project';

-- Por estado (index: idx_status)
SELECT * FROM tasks WHERE status = 'active';

-- Inbox por categoría (index: idx_category)
SELECT * FROM inbox WHERE category = 'work';
```

---

## 🛠️ Implementation Checklist

- [ ] Day 1: Schema design ✅
- [ ] Day 2: Create migration system
- [ ] Day 2: Run 001_init.sql
- [ ] Day 3: Write JSON→SQLite migrator
- [ ] Day 3: Validate data integrity
- [ ] Day 4: Create db-manager.js
- [ ] Day 4: Update routes to use DB
- [ ] Day 4: Test all endpoints
- [ ] Day 5: Write comprehensive tests
- [ ] Day 5: Document rollback procedure

---

## 📞 Questions & Decisions

1. **JSONCompress**: ¿Almacenar JSON columns comprimidos? (No para MVP, agrega complejidad)
2. **Full-text search**: ¿FTS5 para búsqueda por título? (Phase 3+)
3. **Temporal tables**: ¿Auditoría de cambios? (Phase 4+)

---

**Status**: ✅ Day 1 Design Complete
**Next**: Day 2 - Create migration system infrastructure

