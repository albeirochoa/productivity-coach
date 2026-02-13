# 🚀 Productivity Coach - Roadmap to Production

**Fecha**: 2026-02-11
**Autor**: Codex Agent
**Status**: 📋 Plan estratégico definido

---

## 🎯 Visión Final

Un coach de productividad que no solo te muestra tareas, sino que **planifica tu tiempo real**, **mide tu progreso estratégico** y **actúa proactivamente** como un asistente ejecutivo.

### Criterios de Éxito ("Producto Final")

- ✅ Planificación por **bloques horarios** sin saturar capacidad
- ✅ Vista **semanal completa** con replanificación en minutos
- ✅ Tareas enlazadas a **metas estratégicas** medibles (OKR/KR)
- ✅ Coach que **sugiere, explica y ejecuta** con confirmación
- ✅ Sistema **estable, recuperable** y sin pérdida de datos

---

## 📊 Estado Actual (Baseline)

### ✅ Completado

| Componente | Estado | Notas |
|-----------|--------|-------|
| **Frontend modular** | ✅ | App.jsx refactorizado (160 líneas), componentes separados |
| **Backend modular** | ✅ | server.js → app.js + routes/ + helpers/ (29 endpoints) |
| **Sistema de tareas** | ✅ | CRUD completo, toggle, esta semana |
| **Proyectos con milestones** | ✅ | Creación, secciones, commit a semana |
| **Inbox procesable** | ✅ | Captura, edición, procesamiento a tareas |
| **Stats básicas** | ✅ | Completadas, pendientes, streak |
| **Chat básico** | ✅ | OpenAI integration (sin tools) |

### ⚠️ Limitaciones Actuales

- **No hay time blocking**: tareas sin horarios específicos
- **Capacidad ciega**: puedes comprometer 20 horas en un día de 8h
- **Sin estrategia**: no hay OKRs, metas ni KRs
- ~~**Persistencia frágil**: JSON files sin backups automáticos~~ ✅ Resuelto (Fase 1)
- **Coach pasivo**: solo responde, no sugiere proactivamente
- ~~**Sin migraciones**: cambios de schema requieren edición manual~~ ⏳ Pendiente (Fase 2)

---

## 🗺️ Fases del Roadmap

### **Fase 0: Definición y Alcance** ✅ Completada

**Objetivo**: Congelar contrato y definir éxito del MVP

**Tareas**:
- [x] Documento de casos de uso diarios (golden hour, checkin, review)
- [x] Checklist de funcionalidad "MVP completo"
- [x] Congelar API contracts actuales (versionado)
- [x] Definir límites: qué NO hará el coach v1.0

**Entregable**: [docs/MVP-CONTRACT.md](MVP-CONTRACT.md)

**Status**: ✅ Completado (2026-02-11)

---

### **Fase 1: Estabilidad Técnica Base** ✅ Completada

**Objetivo**: Versión estable y recuperable

**Tareas**:
- [x] Script de backup automático diario de `tasks-data.json` + `profile.json`
- [x] Logs centralizados (winston) → `logs/error.log` + `logs/combined.log`
- [x] Healthcheck endpoint (`GET /health`)
- [x] Validación de schema con Zod en 4 endpoints críticos
- [x] Request logging middleware
- [x] Error handling global
- [x] Backup management API (`POST /api/backup/create`, `GET /api/backup/list`)

**Entregable**: [docs/FASE1-ESTABILIDAD.md](FASE1-ESTABILIDAD.md)

**Archivos Creados**:
- `web/server/helpers/backup-manager.js` - Sistema de backups
- `web/server/helpers/logger.js` - Winston logging
- `web/server/helpers/validators.js` - Zod schemas

**Dependencias Añadidas**:
- `winston` - Logging
- `zod` - Validación

**Status**: ✅ Completado (2026-02-11)
**Duración**: 2 horas

---

### **Fase 2: Modelo de Datos Robusto** ✅ COMPLETADA

**Objetivo**: Persistencia confiable para crecimiento

**Tareas Completadas**:
- [x] Definir schema final (tasks, projects, milestones, sections, inbox, stats, profiles)
- [x] Migrar JSON → SQLite con abstraction layer reversible
- [x] Sistema de migraciones versionado (db-manager.js + migrations/)
- [x] Query layer con validación (db-store.js mantiene interface JSON)
- [x] Migración 001_init.sql: Schema completo de base de datos
- [x] Migración 002_capacity.sql: Campos de capacity planning
- [x] Migración 003_templates.sql: Sistema de plantillas de proyectos

**Entregables**:
- `web/server/db/db-manager.js` - Gestor de migraciones y conexión SQLite
- `web/server/helpers/db-store.js` - Abstraction layer (JSON interface → SQLite)
- `web/server/db/migrations/001_init.sql` - Schema inicial
- `web/server/db/migrations/002_capacity.sql` - Capacity planning
- `web/server/db/migrations/003_templates.sql` - Templates system

**Status**: ✅ COMPLETADA (2026-02-11)
**Duración**: 2 horas

**Notas técnicas**:
- Zero breaking changes: db-store.js mantiene interface idéntica a json-store.js
- Auto-migración al iniciar servidor
- Templates table se crea on-the-fly si migración no corrió
- Better-sqlite3 con WAL mode para mejor concurrencia

---

### **Fase 3: Capacidad y Estimación** ✅ COMPLETADA

**Objetivo**: Motor de capacity usable

**Tareas Completadas (Day 1 - Backend Core)**:
- [x] Calculadora de capacidad (capacity-calculator.js - 7 funciones)
- [x] Configuración de usuario: `work_hours_per_day`, `buffer_percentage`, `break_minutes_per_day`, `work_days_per_week`
- [x] Cálculo de carga diaria/semanal
- [x] 5 Endpoints API: config, week, today, validate-commitment, auto-redistribute
- [x] Migraciones SQLite (002_capacity.sql)

**Tareas Completadas (Day 2 - Validaciones y Redistribución)**:
- [x] Validación automática al comprometer milestones (HTTP 409 si overload)
- [x] Endpoint de redistribución automática con preview
- [x] Sistema de warnings con mensaje detallado de sobrecarga
- [x] Soporte para force=true para bypass de validación
- [x] Actualizado TaskSchema para incluir milestones
- [x] Todos los flujos testeados y funcionando

**Tareas Completadas (Day 3 - UI Integration)**:
- [x] Componente CapacityAlert para mostrar warnings de sobrecarga
- [x] Hook useCapacity para gestionar estado de capacidad
- [x] Integración con ThisWeekView (banner de capacidad con progreso)
- [x] Manejo de errores HTTP 409 en ProjectCard con diálogo de confirmación
- [x] Auto-redistribute UI con preview y ejecución
- [x] Actualizado api.js con endpoints de capacidad
- [x] Build exitoso sin errores

**Entregables**:
- Day 1: API backend completamente funcional ✅
- Day 2: Sistema de validación y redistribución automática ✅
- Day 3: UI completa con alertas y visualización de capacidad ✅

**Status**: ✅ COMPLETADA (2026-02-11 Days 1-3)
**Duración**: 2.5 horas

---

### **Fase 4: Gestión de Proyectos Mejorada** ✅ COMPLETADA

**Objetivo**: Herramientas completas para gestionar proyectos

**Tareas Completadas**:
- [x] Sistema de plantillas de proyectos (templates)
- [x] Guardar proyectos como plantillas reutilizables
- [x] UI de gestión de plantillas (TemplateManager)
- [x] Archivar proyectos (status: 'archived')
- [x] Eliminar proyectos permanentemente
- [x] Filtrado automático de proyectos archivados
- [x] Confirmaciones claras para acciones destructivas

**Entregables**:
- `web/src/components/TemplateManager.jsx` - UI de gestión de plantillas
- `web/src/components/ProjectWizard/` - Wizard actualizado con templates
- `web/src/utils/api.js` - Funciones archiveProject, deleteProject, templates CRUD
- `web/src/components/shared/ProjectCard.jsx` - Botones archive/delete con confirmaciones

**Status**: ✅ COMPLETADA (2026-02-12)
**Duración**: 3 horas

---

### **Fase 5: Calendario Real (Time Blocking)** ✅ COMPLETADA

**Objetivo**: Agenda real por horas

**Tareas Completadas**:
- [x] Entidad `calendar_blocks` (startTime, endTime, taskId, status, notes)
- [x] API: `POST /api/calendar/blocks`, `PATCH /api/calendar/blocks/:id`, `DELETE`
- [x] Validaciones: solapamiento, capacidad, horario laboral
- [x] Vista de calendario diario en UI
- [x] Arrastre de tareas a bloques (drag & drop)

**Entregables**:
- `web/server/db/migrations/004_calendar_blocks.sql` - Schema SQLite
- `web/server/routes/calendar-routes.js` - 5 endpoints CRUD + validaciones
- `web/server/helpers/db-store.js` - Funciones readCalendarBlocks, createCalendarBlock, etc
- `web/src/hooks/useCalendar.js` - Hook para gestión de estado de calendario
- `web/src/components/Dashboard/CalendarDayView.jsx` - Vista completa con drag & drop
- `web/src/utils/api.js` - Funciones de calendario integradas

**Status**: ✅ COMPLETADA (2026-02-12)
**Duración**: 2.5 horas

---

### **Fase 6: Planificación Semanal Visual + UX Polish** ✅ COMPLETADA

**Objetivo**: Tablero semanal operativo + navegación intuitiva

**Tareas Completadas**:
- [x] Vista semanal con columnas por dia (CalendarWeekView)
- [x] Vista mensual (CalendarMonthView)
- [x] Drag-and-drop de tareas a dias desde sidebar
- [x] Pestana "Hoy" con tareas del dia (TodayView)
- [x] Pestana "Algun dia" para tareas sin compromiso semanal (SomedayView)
- [x] Reorden de sidebar: Inbox > Hoy > Esta Semana > Algun dia > Calendario > Proyectos
- [x] Desplegables independientes en sidebar (Inbox, Hoy, Esta Semana, Algun dia)
- [x] Drag & drop bidireccional sidebar <-> area de trabajo
- [x] Drop zones en sidebar: arrastrar tarea a "Esta Semana" o "Algun dia" para moverla
- [x] Drop zones en area de trabajo (TodayView, ThisWeekView, SomedayView)
- [x] Visual feedback al arrastrar sobre sidebar (ring cyan + "Soltar aqui")
- [x] GripVertical + cursor grab en todas las tarjetas arrastrables
- [x] Tareas arrastrables en todas las vistas del area de trabajo

**Bugs corregidos**:
- [x] Fix: "Esta Semana" no renderizaba en area de trabajo (solo sidebar)
- [x] Fix: "Error al agregar tarea" en proyectos (Zod rechazaba sectionId: null)
- [x] Fix: Fecha/prioridad no se guardaban (faltaban columnas en SQLite)
- [x] Fix: Migration 005 - due_date y priority en tasks
- [x] Fix: Migration 006 - category, priority, due_date en milestones
- [x] Fix: EditMilestoneModal ahora tiene todos los campos (categoria, prioridad, fecha, duracion)
- [x] Fix: Desplegables del sidebar se cerraban al navegar a otra pestana
- [x] Fix: "Hoy" no mostraba tareas (filtro demasiado restrictivo con dueDate)
- [x] Fix: PATCH milestone endpoint acepta category, priority, dueDate
- [x] Fix: db-store.js syncTasks/readAllTasks incluyen due_date, priority para tasks y milestones
- [x] Fix: mapInboxRow faltaba campo category

**Entregables**:
- `web/src/components/Dashboard/TodayView.jsx` - Vista de tareas de hoy
- `web/src/components/Dashboard/SomedayView.jsx` - Vista de tareas sin compromiso
- `web/src/components/Dashboard/CalendarWeekView.jsx` - Vista semanal
- `web/src/components/Dashboard/CalendarMonthView.jsx` - Vista mensual
- `web/src/components/Dashboard/CalendarView.jsx` - Selector dia/semana/mes
- `web/server/db/migrations/005_task_due_date_priority.sql` - Columnas task
- `web/server/db/migrations/006_milestone_category_priority_duedate.sql` - Columnas milestone
- Sidebar.jsx reescrito con drop zones + desplegables independientes

**Status**: ✅ COMPLETADA (2026-02-13)
**Duracion**: ~4 horas

---

### **Fase 7: Capa Estratégica (OKR/Metas)** 🎯

**Objetivo**: Seguimiento estratégico real

**Tareas**:
- [ ] Módulo `objectives` (quarterly/annual)
- [ ] Módulo `key_results` con métricas
- [ ] Enlace task → KR → Objective
- [ ] Cálculo de avance automático
- [ ] Detección de riesgo (KR sin progreso)
- [ ] Vista de objetivos en dashboard

**Entregable**: ObjectivesView component

---

### **Fase 8: Motor de Decisiones del Coach** 🧠

**Objetivo**: "Coach lógico" confiable (sin IA generativa primero)

**Tareas**:
- [ ] Reglas de priorización determinísticas
- [ ] Detección de conflictos: saturación, deadlines, objetivos sin avance
- [ ] Sistema de recomendaciones explicables
- [ ] Logs de decisiones con razones
- [ ] UI de sugerencias con accept/reject

**Entregable**: Coach con reglas + explicaciones

---

### **Fase 9: Asistente Conversacional con Acciones** 💬

**Objetivo**: Chat que no solo habla, también organiza

**Tareas**:
- [ ] Tools internas: `plan_week`, `schedule_block`, `reprioritize`, `goal_review`
- [ ] Modo `suggest` vs `act` con confirmación
- [ ] Historial de decisiones del chat
- [ ] Integración con motor de decisiones (Fase 8)
- [ ] UI de confirmación de acciones

**Entregable**: Chat con function calling real

---

### **Fase 10: Personalización de Coaching** 🎨

**Objetivo**: Coach adaptado a tu forma de trabajar

**Tareas**:
- [ ] Perfil de productividad: horas pico, energía, límites
- [ ] Configuración de estilo de feedback (directo/suave)
- [ ] Rutinas automáticas: revisión semanal, preparación diaria
- [ ] Métricas de adherencia (% de bloques cumplidos)
- [ ] Tracking de mejora continua

**Entregable**: ProfileSettings component + rutinas

---

### **Fase 11: QA Final y Producción Personal** ✅

**Objetivo**: Versión final lista para uso diario continuo

**Tareas**:
- [ ] Tests E2E de flujos completos (Playwright/Cypress)
- [ ] Pruebas de regresión sobre API y UI
- [ ] Plan de rollback probado
- [ ] Script de restauración de backup probado
- [ ] Documentación de usuario final
- [ ] Deploy local optimizado (Docker?)

**Entregable**: Productivity Coach v1.0 stable

---

## 🔄 Estrategia de Ejecución

### Principios de Desarrollo

1. **Zero Breaking Changes**: cada fase mantiene compatibilidad hacia atrás
2. **Incremental Value**: cada fase entrega valor usable inmediato
3. **Data First**: migración de datos antes de features que la requieren
4. **Test Coverage**: crítico antes de Fase 2 (migración a SQLite)
5. **Documentation Driven**: docs actualizadas con cada fase

### Orden de Prioridad

```
Alta: Fases 0, 1, 2 (fundación estable)
Media: Fases 3, 4, 5 (capacidad + calendario)
Estratégica: Fases 6, 7, 8 (OKR + coach inteligente)
Polish: Fases 9, 10 (personalización + QA)
```

---

## 📋 Próximos Pasos Inmediatos

1. **Ahora**: ✅ Fases 0 y 1 completadas
2. **Esta semana**: Iniciar Fase 2 (Migración a SQLite)
3. **Este mes**: Completar Fases 2 y 3 (SQLite + Capacity)

---

## 🎯 Milestones Clave

| Milestone | Fases | Status | Entregable |
|-----------|-------|--------|-----------|
| **Fundacion Solida** | 0, 1 | ✅ Completado | MVP Contract + Backend estable |
| **Persistencia Robusta** | 2 | ✅ Completado | SQLite + migraciones |
| **Capacidad & Estimacion** | 3 | ✅ Completado | API + UI + Validaciones |
| **Gestion de Proyectos** | 4 | ✅ Completado | Templates + Archive/Delete |
| **Time Blocking** | 5 | ✅ Completado | Calendario diario con drag & drop |
| **Planificacion Semanal** | 6 | ✅ Completado | Vistas semana/mes + drag bidireccional + UX |
| **Strategic Coach** | 7, 8, 9 | 🔜 Proxima | OKR + coach proactivo |
| **Production Ready** | 10, 11 | ⏳ Pendiente | v1.0 completo y probado |

---

## 📈 Progreso Actual

**Completado**: 6/11 fases (55%)
- Fase 0: ✅ MVP Contract (2026-02-11)
- Fase 1: ✅ Backend Stability (2026-02-11)
- Fase 2: ✅ SQLite Migration (2026-02-11)
- Fase 3: ✅ Capacity Planning (2026-02-11)
- Fase 4: ✅ Project Management (2026-02-12)
- Fase 5: ✅ Time Blocking (2026-02-12)
- Fase 6: ✅ Planificacion Semanal + UX (2026-02-13)

**Proximo**: Fase 7 (Capa Estrategica OKR/Metas)
**Tiempo Invertido**: ~20 horas
**Tiempo Estimado Restante**: ~10 dias

### Fase 3 Completado (Days 1-3):

**Day 1 - Backend Core**:
- ✅ Migration 002: 4 campos capacity en profiles
- ✅ capacity-calculator.js: 7 funciones core
- ✅ capacity-routes.js: 6 endpoints implementados
- ✅ db-store.js: persistencia de capacity config
- ✅ app.js: rutas registradas

**Day 2 - Validaciones**:
- ✅ Validación automática en commit-milestone (HTTP 409 si overload)
- ✅ Endpoint POST /api/capacity/auto-redistribute (preview + execute)
- ✅ Sistema de warnings detallados
- ✅ Actualizado TaskSchema (Zod) para incluir milestones
- ✅ Tests E2E: validación funciona correctamente

**Day 3 - UI Integration**:
- ✅ CapacityAlert component (warnings con auto-fix)
- ✅ useCapacity hook (gestión de estado)
- ✅ ThisWeekView: banner de capacidad con progreso visual
- ✅ ProjectCard: manejo de HTTP 409 con diálogo de confirmación force
- ✅ App.jsx: integración completa de capacity system
- ✅ api.js: endpoints de capacidad agregados
- ✅ Build frontend exitoso sin errores

---

### Fase 4 Completado (2026-02-12):

**Templates System**:
- ✅ Migration 003: templates table en SQLite
- ✅ db-store.js: auto-create templates table si no existe
- ✅ API: GET/DELETE/PATCH /api/tasks/templates
- ✅ ProjectWizard: selector de plantillas + "Sin plantilla" option
- ✅ WizardStep3: checkbox "Guardar como plantilla" cuando manual
- ✅ TemplateManager component: UI completa para CRUD de templates
- ✅ Sidebar: botón "Mis Plantillas"

**Archive & Delete**:
- ✅ api.js: archiveProject(), deleteProject()
- ✅ ProjectCard: botones Archive/Delete con confirmaciones
- ✅ useAppData: filtrado automático de proyectos archivados
- ✅ Confirmaciones diferenciadas: reversible vs permanente

---

---

### Fase 5 Completado (Days 1-3 - 2026-02-12):

**Day 1 - Backend Infrastructure**:
- ✅ Migration 004: calendar_blocks table con índices
- ✅ db-store.js: CRUD functions (readCalendarBlocks, createCalendarBlock, updateCalendarBlock, deleteCalendarBlock)
- ✅ calendar-routes.js: 5 endpoints implementados
- ✅ Validaciones: solapamiento (HTTP 409), horario laboral, formato fecha/hora
- ✅ Helper functions: calculateDuration, detectOverlap, validateWorkingHours
- ✅ Endpoint GET /api/calendar/day/:date con info de tareas

**Day 2 - UI Base**:
- ✅ api.js: 5 funciones de calendario agregadas
- ✅ useCalendar hook: gestión de estado, navegación, CRUD con error handling
- ✅ CalendarDayView component: navegación de fechas, formulario crear bloques
- ✅ TimeBlock component: visualización con estados (scheduled/in_progress/completed)
- ✅ Sidebar: botón "Calendario" agregado
- ✅ App.jsx: integración completa de CalendarView
- ✅ Build exitoso

**Day 3 - Drag & Drop**:
- ✅ DndContext integrado con @dnd-kit
- ✅ DraggableTask component: tareas arrastrables desde lista lateral
- ✅ TimeSlot component: zonas droppables por hora (9 AM - 5 PM)
- ✅ Visual feedback: highlight en hover, drag overlay
- ✅ Auto-creación de bloques de 1h al soltar tarea
- ✅ Layout de 3 columnas: tareas | calendario con time grid

---

### Fase 6 Completado (2026-02-13):

**Nuevas Vistas**:
- ✅ TodayView: tareas de hoy (dueDate = hoy + sin fecha asignada)
- ✅ SomedayView: tareas activas sin compromiso semanal (thisWeek = false)
- ✅ CalendarWeekView: vista semanal con drag & drop a dias
- ✅ CalendarMonthView: vista mensual con overview
- ✅ CalendarView: selector dia/semana/mes

**Sidebar Reescrito**:
- ✅ Nuevo orden: Inbox > Hoy > Esta Semana > Algun dia > Calendario > Proyectos
- ✅ Desplegables independientes (estado persiste al navegar)
- ✅ Drop zones en Hoy/Esta Semana/Algun dia con visual feedback
- ✅ Todas las tareas desplegadas son draggable

**Drag & Drop Bidireccional**:
- ✅ Sidebar -> Area de trabajo (drop zones en TodayView, ThisWeekView, SomedayView)
- ✅ Area de trabajo -> Sidebar (drop en botones de seccion)
- ✅ Sidebar -> Calendario (existente, drag nativo)
- ✅ GripVertical en todas las tarjetas de todas las vistas
- ✅ Protocolo unificado: dataTransfer.setData('projectId', id)

**Migraciones SQLite**:
- ✅ 005: due_date + priority en tasks (con indices)
- ✅ 006: category + priority + due_date en milestones

**Bugfixes (11 bugs corregidos)**:
- ✅ Esta Semana no renderizaba en area principal
- ✅ Zod rechazaba sectionId: null en milestones
- ✅ Fecha/prioridad no persistian (columnas faltantes en SQLite)
- ✅ EditMilestoneModal incompleto (faltaban categoria, prioridad, fecha)
- ✅ Desplegables se cerraban al navegar
- ✅ Hoy mostraba 0 tareas (filtro excluyente)
- ✅ PATCH milestone no aceptaba campos nuevos
- ✅ db-store.js no leia/escribia due_date/priority
- ✅ mapInboxRow faltaba category

---

**🚦 Status**: Fase 6 ✅ COMPLETADA | Proximo: Fase 7 Capa Estrategica (OKR/Metas)
