# 🎯 Plan de Ejecución MVP - Productivity Coach v1.0

**Fecha**: 2026-02-11
**Objetivo**: MVP funcional y estable el 2026-03-05
**Duración Estimada**: 17-20 días hábiles
**Status**: 📋 En ejecución

---

## 🗓️ Timeline de Trabajo

### Semana 1 (Feb 11-15): Fase 2 - Base de Datos Robusta

**Fase 2: Migración a SQLite** (5 días)

**Tareas**:
- [ ] **Day 1 (Feb 11)**: Diseñar SQLite schema
  - Crear archivo `docs/SQLITE-SCHEMA.md`
  - Mapear JSON → SQLite
  - Definir migraciones versioning

- [ ] **Day 2 (Feb 12)**: Crear migration system
  - Instalar `better-sqlite3` o `sqlite3`
  - Crear `web/server/db/migrations/`
  - Script: `001_init.sql` (crear tablas)

- [ ] **Day 3 (Feb 13)**: Escribir JSON → SQLite migrator
  - Script reversible (puede volver a JSON)
  - Validar integridad de datos
  - Test con datos reales

- [ ] **Day 4 (Feb 14)**: Implementar query layer
  - Reemplazar `json-store.js` con DB queries
  - Todos los endpoints usan SQLite
  - Mantener backups de BD

- [ ] **Day 5 (Feb 15)**: Testing & validation
  - Smoke tests (endpoints funcionan)
  - Data integrity checks
  - Rollback procedure probado
  - Deploy local validado

**Entregable**: `web/db/productivity-coach.sqlite` + migration scripts

---

### Semana 2 (Feb 18-22): Fases 3-5 - Capacidad & Calendario

**Fase 3: Capacidad y Estimación** (2 días)

- [ ] **Día 1**: Agregar campo `estimatedMinutes` a tasks/milestones
  - Migration SQL
  - API para actualizar estimaciones
  - Frontend: input para time estimate

- [ ] **Día 2**: Motor de capacidad diaria
  - GET `/api/capacity?date=2026-02-18`
  - Respuesta: `{available: 480, committed: 340, free: 140}`
  - Alerta en UI si > 100%

**Entregable**: Dashboard con "Capacidad: 6/8h usadas"

---

**Fase 4: Time Blocking** (2 días)

- [ ] **Día 1**: Entidad `calendar_blocks`
  - Table: `calendar_blocks(id, taskId, startAt, endAt, status)`
  - API: `POST /api/blocks`, `PATCH /api/blocks/:id/move`
  - Validación: sin solapamientos

- [ ] **Día 2**: Vista de calendario
  - React component: `CalendarView.jsx`
  - Drag & drop bloques de hora
  - Visual feedback de capacidad por día

**Entregable**: Calendar component funcional

---

**Fase 5: Planificación Semanal Visual** (1 día)

- [ ] Vista semanal con capacidad por día
  - Columnas: Lun-Dom
  - Cada día: capacidad disponible
  - Drag-and-drop tareas a días
  - Auto-sugerencia de distribución

**Entregable**: WeekPlannerView component

---

### Semana 3 (Feb 25-Mar 01): Fases 6-8 - Inteligencia del Coach

**Fase 6: Capa Estratégica (OKR)** (2 días)

- [ ] **Día 1**: Entidad `objectives` y `key_results`
  - Table: objectives(id, title, period, status)
  - Table: key_results(id, objectiveId, metric, target, current)
  - Migration SQL

- [ ] **Día 2**: UI para OKRs
  - Component: `ObjectivesView.jsx`
  - Enlazar tareas con KRs
  - Mostrar progreso automático

**Entregable**: Objectives management funcional

---

**Fase 7: Motor de Decisiones** (1 día)

- [ ] Reglas determinísticas del coach
  - Detectar: saturación, deadlines en riesgo, OKRs sin progreso
  - Generar sugerencias explicables
  - Ejemplo: "Tienes 10h comprometidas para un día de 8h. Sugiero mover 2h a mañana."

**Entregable**: Coach logic engine

---

**Fase 8: Chat con Acciones** (1 día)

- [ ] Integrar motor de decisiones al chat
  - Chat puede: plan_week, schedule_block, reprioritize
  - Modo: "suggest" (solo habla) vs "act" (ejecuta)
  - Historial de decisiones del coach

**Entregable**: Smart chat funcional

---

### Semana 4 (Mar 02-05): Fases 9-10 - Polish & QA

**Fase 9: Personalización** (1 día)

- [ ] Perfil de productividad
  - `workHoursPerDay`, `peakHours`, `breakTime`
  - Estilo de feedback: directo/suave
  - Rutinas: weekly review, daily preparation
  - Guardar preferencias en BD

**Entregable**: User profile settings

---

**Fase 10: QA Final** (1 día)

- [ ] Tests E2E de flujos completos
  - Golden hour flow
  - Weekly planning flow
  - Project completion flow

- [ ] Pruebas de regresión
  - Todos los endpoints responden
  - UI no tiene bugs visuales
  - Performance aceptable

- [ ] Validar rollback & restore
  - Backups funcionan
  - Migración SQL reversible
  - Documentación completa

**Entregable**: MVP v1.0 stable

---

## 📊 Distribución de Esfuerzo

```
Fase 2: SQLite        ██████░░░░ 30% (5 días)
Fase 3-5: Features    ██████░░░░ 30% (5 días)
Fase 6-8: Intelligence██████░░░░ 25% (4 días)
Fase 9-10: Polish     ███░░░░░░░ 15% (2 días)
─────────────────────────────────
TOTAL:                           16 días (aprox)
```

---

## 🎯 Criterios de Éxito para MVP

### Funcionalidad
- [ ] Capturar idea en < 10 segundos
- [ ] Planificar semana en < 15 minutos
- [ ] Completar tarea en < 3 clics
- [ ] Sistema NO pierde datos
- [ ] UI responde inmediatamente (< 100ms)

### Usabilidad
- [ ] Funciona SIN leer documentación
- [ ] Errores son claros y accionables
- [ ] Sistema guía hacia próxima acción
- [ ] Puedo deshacer acciones importantes

### Confiabilidad
- [ ] App NO crashea durante uso normal
- [ ] Datos persisten entre reinicios
- [ ] Backups se crean automáticamente
- [ ] Errores se loggean para debugging

### Productividad Personal
- [ ] Uso app TODOS los días
- [ ] Completo > 80% de tareas comprometidas
- [ ] Sistema ahorra tiempo vs sistema anterior
- [ ] Me siento más organizado

---

## 🛠️ Tech Stack Confirmado

### Backend
- Node.js + Express
- SQLite (better-sqlite3)
- Winston (logging)
- Zod (validation)
- OpenAI API (project analysis)

### Frontend
- React 19
- Vite
- Tailwind CSS
- Framer Motion
- DND Kit
- Lucide React

### Persistencia
- SQLite database
- Backups automáticos en `backups/`
- Migration system versionado

### DevOps (Post-MVP)
- GitHub repo
- Railway.app deployment
- Auto-deploy on push
- Docker container

---

## 📋 Checklist de Dependencias

**Ya instaladas**:
- ✅ express, react, vite, tailwind
- ✅ winston, zod
- ✅ framer-motion, lucide-react, dnd-kit
- ✅ axios, cors, body-parser

**Por instalar**:
- [ ] `better-sqlite3` (DB)
- [ ] `migrate-on-db` (migraciones) o custom

**Total nuevas**: 1-2 dependencias

---

## 🚀 Cómo Empezar Fase 2 (Mañana)

### 1. Setup inicial
```bash
cd web
npm install better-sqlite3
mkdir -p server/db/migrations
touch server/db/migrations/001_init.sql
```

### 2. Crear schema SQLite
```sql
-- server/db/migrations/001_init.sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT,
  status TEXT,
  thisWeek BOOLEAN,
  estimatedMinutes INTEGER,
  createdAt TEXT,
  completedAt TEXT
);

-- ... más tablas
```

### 3. Migración JSON → SQLite
```javascript
// server/db/migrate.js
// Leer tasks-data.json
// Insertar en SQLite
// Validar integridad
```

### 4. Actualizar routes
```javascript
// Cambiar readJson/writeJson
// Usar queries SQLite
```

---

## ⏰ Daily Standup Template

Cada día:
```
✅ Qué completé
🔜 Qué harás hoy
🚧 Bloqueos/riesgos
📊 % progreso
```

---

## 📞 Comunicación & Help

Si gets stuck:
1. Check `docs/` para context
2. Review `logs/error.log`
3. Test endpoint manualmente
4. Ask for help (describe error + context)

---

## 🎉 Victory Condition

**MVP v1.0 Released**: 2026-03-05

```
✅ SQLite migration complete
✅ Capacity planning working
✅ Calendar & time blocking functional
✅ OKRs & strategic tracking enabled
✅ Coach AI suggestions operational
✅ All tests passing
✅ No data loss
✅ Ready for daily use
```

---

**Next**: Start Fase 2 tomorrow (Feb 12)
**Review**: Weekly checkpoints

🚀 **Vamos con todo!**
