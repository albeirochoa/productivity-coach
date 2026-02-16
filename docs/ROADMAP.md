# 🚀 Productivity Coach - Roadmap to Production

**Fecha**: 2026-02-15
**Autor**: Codex Agent
**Status**: En ejecucion (Fases 0-9.1 completadas, Fase 10.x activa)

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
| **Backend modular** | ✅ | server.js → app.js + routes/ + helpers/ (75 endpoints registrados) |
| **Sistema de tareas** | ✅ | CRUD completo, toggle, esta semana |
| **Proyectos con milestones** | ✅ | Creación, secciones, commit a semana |
| **Inbox procesable** | ✅ | Captura, edición, procesamiento a tareas |
| **Stats básicas** | ✅ | Completadas, pendientes, streak |
| **Coach chat + acciones** | ✅ | Fase 9 completada (preview/confirm/history) |
| **LLM agent layer** | ✅ | Fase 9.1 completada (guardrails + proactividad + estilo) |

### ⚠️ Limitaciones Actuales

- **Intervencion coach aun basica**: falta cerrar motor de intervencion v2 (Fase 10.x)
- **Aprendizaje por comportamiento incompleto**: observabilidad y modelo de usuario en progreso
- **UX coach-first pendiente**: chat aun convive con patrones de soporte
- ~~**Persistencia frágil**: JSON files sin backups automáticos~~ ✅ Resuelto (Fase 1)
- ~~**Sin migraciones**: cambios de schema requieren edición manual~~ ✅ Resuelto (Fase 2)

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

### **Fase 6.1: Normalizacion de Areas (Retrofit Critico)** ✅ COMPLETADA

**Objetivo**: Hacer que `areas` sea transversal en tareas y proyectos para evitar deuda antes de OKR/Coach.

**Nota de secuencia**:
- Debio implementarse en **Fase 2 (Modelo de Datos)**.
- Se ejecuto como **bloque inmediato (Semana 6)** para no romper Fase 7+.

**Tareas Completadas**:
- [x] `category` obligatorio en `tasks` y `projects` (Zod `.min(1).default('trabajo')`)
- [x] Herencia automatica de area: `project.category` -> milestones del proyecto
- [x] UI crear/editar tarea con selector de area dinamico (useAreaCategories hook)
- [x] UI crear/editar proyecto con selector de area dinamico
- [x] Filtros por area en `Hoy`, `Esta Semana`, `Algun dia`, `Proyectos` (AreaFilter component)
- [x] Stats por area (GET /api/areas/:areaId/stats - activas, completadas, rate)
- [x] Reglas de archivado de areas sin perder historial (soft delete con status: 'archived')
- [x] Migracion de datos existentes: 34 tareas OK, 13 milestones migrados con herencia de proyecto
- [x] CRUD completo de Areas de Vida (6 endpoints REST)
- [x] Vista dedicada AreasView con filtros por estado (activa/pausada/archivada)
- [x] EditAreaModal con iconos, colores, prioridad y preview

**Criterio de salida**:
- [x] No existe tarea/proyecto sin `category` (0 registros sin asignar)
- [x] Las vistas principales soportan filtro de area sin regresiones
- [x] QA agent incluye 3 escenarios de areas (navegacion, filtro, selector en edicion)

**Entregables**:
- `web/server/routes/areas-routes.js` - 6 endpoints CRUD para areas
- `web/src/hooks/useAreas.js` - Hook de gestion de areas
- `web/src/hooks/useAreaCategories.js` - Hook de categorias dinamicas desde areas
- `web/src/components/shared/AreaFilter.jsx` - Filtro reutilizable por area
- `web/src/components/shared/AreaCard.jsx` - Tarjeta de area con stats
- `web/src/components/shared/EditAreaModal.jsx` - Modal crear/editar area
- `web/src/components/Dashboard/AreasView.jsx` - Vista principal de areas
- Actualizado: EditTaskModal, EditProjectModal, EditInboxModal, WizardStep1 (categorias dinamicas)
- Actualizado: ThisWeekView, TodayView, SomedayView, ProjectsView (filtros por area)
- Actualizado: validators.js (category obligatorio), tasks-routes.js, projects-routes.js (herencia)
- Actualizado: qa-agent.mjs (3 escenarios de areas)

**Status**: ✅ COMPLETADA (2026-02-14)
**Duracion**: ~2 horas

---

### **Fase 7: Capa Estratégica (OKR/Metas)** 🎯

**Objetivo**: Seguimiento estratégico real

**Tareas**:
- [x] Módulo `objectives` (quarterly/annual)
- [x] Módulo `key_results` con métricas
- [x] Enlace task → KR → Objective (vinculación en edición)
- [x] Cálculo de avance automático
- [x] Detección de riesgo (KR sin progreso/desvío)
- [x] Vista de objetivos en dashboard (MVP funcional)

**Documentos base (obligatorios antes de implementar)**:
- [x] `docs/ARCHITECTURE-DECISIONS.md` (ADRs de Fase 7+)
- [x] `docs/INTEGRATION-CONTRACTS.md` (contratos API entre módulos actuales y nuevos)
- [x] `docs/DATA-MIGRATION-PLAN.md` (schema, backfill, validaciones, rollback)
- [x] `docs/RELEASE-PLAN-MVP2.md` (incrementos, feature flags, criterios de done)

**Entregable**: ObjectivesView component

**Avance Fase 7A (2026-02-14)**:
- [x] Migración `007_objectives_key_results.sql` aplicada
- [x] Endpoints backend para Objectives/KR (CRUD + progreso)
- [x] Objetivos/KR en UI con UX guiada y validaciones visibles
- [x] CRUD completo UI: crear/editar/eliminar Objetivo y KR
- [x] Vinculación Objetivo/KR en edición de tareas y proyectos
- [x] Badges de contexto en Today/ThisWeek/ProjectCard
- [x] QA agent ampliado con escenarios de objetivos (create/edit/delete)

**Fase 7B completada (2026-02-14)**:
- [x] Detección de riesgo explícita por KR (sin avance / desvío)
- [x] Vinculación Objetivo/KR desde flujos de creación (no solo edición)
- [x] Dashboard estratégico con señales de riesgo y foco semanal

**Status**: ✅ COMPLETADA (Fase 7A + 7B)

---

### **Fase 8: Motor de Decisiones del Coach** 🧠 ✅

**Status**: COMPLETADA (2026-02-14)
**Duración**: ~2 horas
**Objetivo**: "Coach lógico" confiable (sin IA generativa primero)

**Tareas**:
- [x] Reglas de priorización determinísticas
- [x] Detección de conflictos: saturación, deadlines, objetivos sin avance
- [x] Sistema de recomendaciones explicables
- [x] Logs de decisiones con razones
- [x] UI de sugerencias con accept/reject

**Entregables**:
- `web/server/helpers/coach-rules-engine.js` (350 L) - 8 reglas determinísticas
- `web/server/db/migrations/009_coach_events.sql` - tabla de eventos
- `web/server/routes/coach-routes.js` (260 L) - 4 endpoints
- `web/src/components/Dashboard/CoachView.jsx` (240 L) - panel completo
- Feature flag: `FF_COACH_RULES_ENABLED=true` (default)
- Integración: app.js, api.js, MainViewRouter, Sidebar
- Tests: 5 unit tests (passed), build verification (passed)

---

### **Fase 9: Asistente Conversacional con Acciones** 💬 ✅

**Status**: COMPLETADA (2026-02-14)
**Objetivo**: Chat que no solo habla, también organiza

**Tareas**:
- [x] Tools internas: `plan_week`, `schedule_block`, `reprioritize`, `goal_review`
- [x] Modo `suggest` vs `act` con confirmación
- [x] Historial de decisiones del chat (coach_sessions + coach_messages)
- [x] Integración con motor de decisiones (Fase 8) — sin duplicar lógica
- [x] UI de confirmación de acciones (ActionPreview + ChatPanel)
- [x] Feature flag: `FF_COACH_CHAT_ACTIONS_ENABLED`
- [x] Migración 010: coach_sessions, coach_messages, coach_memory

**Entregables**:
- `web/server/db/migrations/010_coach_chat_sessions.sql` - Schema sesiones/mensajes/memoria
- `web/server/helpers/coach-chat-tools.js` (~300 L) - Intent matcher + 4 tools
- `web/server/routes/coach-chat-routes.js` (~350 L) - 3 endpoints
- `web/src/components/Chat/ChatPanel.jsx` (~200 L) - Panel de chat con acciones
- `web/src/components/Chat/ActionPreview.jsx` (~100 L) - Preview con confirm/cancel
- `web/src/components/Chat/ModeSelector.jsx` (~40 L) - Toggle suggest/act
- Refactorizado: coach-rules-engine.js (fetchRiskSignals compartido)
- Actualizado: app.js, validators.js, api.js, ChatBubble.jsx

---

### **Fase 9.1: LLM Agent Layer (Nanobot/OpenClaw-style)** ✅

**Status**: COMPLETADA (2026-02-14)
**Objetivo**: Evolucionar el chat accionable a un asistente especializado en productividad, con memoria, proactividad y personalidad de coaching.

**Tareas**:
- [x] Integrar LLM (OpenAI GPT-4o) con function/tool calling sobre tools internas existentes
- [x] Mantener reglas de Fase 8 como guardrails duros (capacidad, riesgo, validaciones)
- [x] Memoria de trabajo (sesión) y memoria persistente (coach_memory table)
- [x] Rutinas proactivas: morning brief, midweek check, weekly review con ventanas controladas
- [x] Configurar estilo de coach (directo/suave, nivel de insistencia, breve/detallado)
- [x] Modo seguro por defecto: `suggest` + confirmacion obligatoria para acciones mutantes
- [x] 13 read tools + 4 mutation tools + content creation tool
- [x] Feature flag: `FF_COACH_LLM_AGENT_ENABLED`
- [x] Frontend: indicadores LLM + badges visuales

**Entregables**:
- `web/server/helpers/llm-agent-orchestrator.js` (~850 L) - LLM orchestrator con OpenAI
- `web/server/helpers/content-templates.js` (~200 L) - Plantillas video/podcast/blog/newsletter
- `web/server/routes/coach-chat-routes.js` - Actualizado con LLM layer + proactividad + estilo
- `web/src/components/Chat/ChatPanel.jsx` - Indicador LLM + guardrails bloqueados
- `web/src/utils/api.js` - 3 nuevos endpoints (proactive, style get/post)

**Herramientas LLM**:
- **Read tools (13)**: get_context_snapshot, list_inbox/today/week/someday/projects, get_project, list_calendar_blocks, get_calendar_day, list_objectives, get_kr_risk_signals, get_capacity_status, get_profile
- **Mutation tools (5)**: plan_week, schedule_block, reprioritize, goal_review, create_content_project

**Ventanas proactivas**:
- Morning brief: 7-9 AM (daily)
- Midweek check: Wed 12-2 PM (weekly)
- Weekly review: Fri 4-6 PM (weekly)

---

### **Fase 9.2: Chat con Acceso Total (CRUD + Calendar + OKR)** ?

**Status**: COMPLETADA (2026-02-14)
**Objetivo**: Permitir que el chat ejecute CRUD completo en tareas, proyectos, inbox, areas, objetivos/KRs y calendario, con confirmacion obligatoria y guardrails.

**Tareas**:
- [x] Tools mutantes ampliadas (create/update/delete para tareas y proyectos)
- [x] CRUD de inbox desde chat (create/update/delete/process)
- [x] CRUD de areas desde chat (create/update/archive)
- [x] CRUD de objetivos y KRs desde chat (create/update/delete + update_progress)
- [x] CRUD de calendar blocks desde chat (create/update/delete)
- [x] Todas las mutaciones pasan por preview + confirm + guardrails

**Entregables**:
- `web/server/helpers/llm-agent-mutation-tools.js` - Ejecucion y previews de mutaciones
- `web/server/helpers/llm-agent-orchestrator.js` - Tools LLM ampliadas + confirmacion para create_content_project
- `web/server/routes/coach-chat-routes.js` - Ejecucion de mutaciones ampliadas
- `web/server/app.js` - Dependencias calendar update/delete en chat

---
### **Fase 10: Coach Inteligente y Adaptativo** ??

**Objetivo**: Evolucionar de chat accionable a asistente de productividad real (analiza, aconseja, planea, aprende).

**Decision de alcance (Fase 10)**:
- [x] CRUD por chat se mantiene como capacidad basica
- [x] El foco principal pasa a coaching (diagnostico + plan + aprendizaje)
- [x] Proactividad guiada por riesgo real (no solo horario)
- [ ] No entra Auto-mode sin confirmacion (se mueve a Fase 11+)
- [ ] No entra tuning avanzado continuo por experimentacion (se mueve a Fase 11+)

#### **Fase 10.1: Reenfoque y Contrato Operativo (1-2 dias)**

**Objetivo**: Congelar que es "coach real" y evitar respuestas vagas.

**Tareas**:
- [ ] Activar `docs/COACH-METHOD.md` como contrato fuente del asistente
- [ ] Definir 5 casos nucleo: weekly planning, daily review, overload rescue, objectives follow-up, weekly close
- [ ] Marcar CRUD en chat como secundario en UX (capacidad base, no propuesta principal)
- [ ] Definir "anti-vague policy" para mensajes de fallback

**Entregables**:
- `docs/COACH-METHOD.md` validado y versionado
- Actualizacion de `docs/INTEGRATION-CONTRACTS.md` para flujo coach-first
- `docs/qa/FASE10_1-CHECKLIST.md` con 5 casos nucleo y test anti-vague

**Criterio de salida**:
- [ ] Cada respuesta del coach incluye estado + recomendacion + razon + siguiente paso

#### **Fase 10.2: Coach de Intervención (Jarvis-Elite)** ✅ COMPLETADA

**Objetivo**: Convertir el chat en un coach estratégico con personalidad, diagnóstico de carga, intervención útil y aprendizaje progresivo.

**Status**: ✅ COMPLETADA (2026-02-15)
**Duración**: ~3 horas

**Tareas Completadas**:
- [x] Diagnóstico de carga automático (saturado | equilibrado | infrautilizado)
- [x] Interceptor de tareas (validación antes de crear/mover con soft block)
- [x] Protección Deep Work (detecta ventanas de alta energía + alerta tareas bajo valor)
- [x] Check-in nocturno (21:00 local con registro de motivos de no ejecución)
- [x] Memoria de patrones (horas productivas, sesgo sobreplanificación, tasa cumplimiento por área)
- [x] System Prompt "Jarvis-Elite" (fricción selectiva + realismo radical + tip de oro)
- [x] Feature flags: FF_COACH_INTERVENTION_ENABLED, FF_COACH_CHECKIN_ENABLED

**Entregables**:
- `web/server/helpers/coach-capacity-diagnosis.js` (~200 L) - Diagnóstico con 3 estados
- `web/server/helpers/coach-task-interceptor.js` (~200 L) - Interceptor con alternativas
- `web/server/helpers/coach-deep-work.js` (~180 L) - Protección Deep Work
- `web/server/helpers/coach-checkin.js` (~150 L) - Check-in nocturno
- `web/server/helpers/coach-pattern-memory.js` (~180 L) - Memoria con confidence decay
- `web/server/helpers/llm-agent-orchestrator.js` - System Prompt actualizado a Jarvis-Elite
- `web/server/routes/coach-chat-routes.js` - 5 nuevos endpoints (+100 L)
- `web/src/components/Coach/DiagnosisCard.jsx` (~140 L) - Tarjeta de diagnóstico
- `web/src/utils/api.js` - 5 nuevos endpoints integrados
- `web/src/components/Chat/ChatPanel.jsx` - Integración DiagnosisCard

**Criterio de salida**:
- [x] El coach entrega diagnóstico consistente y accionable
- [x] System prompt refleja personalidad "Jarvis-Elite"
- [x] Check-in nocturno registra contexto útil
- [x] Memoria mejora recomendaciones entre sesiones

#### **Fase 10.3: Modelo de Usuario que Aprende (Semana 2)**

**Objetivo**: Construir perfil dinamico y confiable.

**Tareas**:
- [ ] Perfil dinamico: horas productivas, capacidad real observada, cumplimiento por area
- [ ] Senales de sesgo: sobreplanificacion y postergacion recurrente
- [ ] Confianza por senal (confidence scoring con decay)
- [ ] Actualizacion incremental semanal

**Avance 10.3A (2026-02-15)**:
- [x] Telemetria de calidad base (`quality_event_logger`) integrada a chat
- [x] Eventos `quality:*` guardados en `coach_events` (slot filling, fallback, how-to, previews)
- [x] Flujo deterministico de creacion de objetivo robusto (incluye `agregar`, periodo, area, descripcion)
- [x] Normalizacion de area acento-insensitive (`salud y bienestar` -> `salud`)
- [x] Guia deterministica "como usar la app" para evitar respuestas vagas de soporte

**Entregables 10.3A**:
- `web/server/helpers/quality-event-logger.js`
- `web/server/routes/coach-chat-routes.js` (instrumentacion + objetivo deterministico + how-to)
- `web/server/helpers/slot-normalizer.js` (matching de areas mejorado)

**Entregables**:
- `coach_profile` derivado de eventos
- Reglas de confidence + decay documentadas

**Fase 10.3B (completada 2026-02-15)** ✅:
- [x] Endpoint `GET /api/activity` (feed unificado desde coach_events)
- [x] Endpoint `GET /api/coach/metrics` (métricas agregadas por período)
- [x] Endpoint `GET /api/coach/metrics/weekly` (reporte semanal con wins/failures/fixes)
- [x] Conversation replay harness (10 escenarios canónicos de regresión)
- [x] Knowledge Base del Coach (estructura base + README)
- [x] Documentación completa en `docs/qa/FASE10_3B-SUMMARY.md`
- [ ] Vista "Actividad" en UI (pendiente - solo backend completado)
- [ ] RAG opcional sobre knowledge base (futuro - estructura lista)

**Entregables 10.3B**:
- `web/qa/conversation-replay.mjs` (340 L) - Harness de regresión
- `docs/coach-kb/README.md` - Base de conocimiento curada
- `web/server/routes/coach-chat-routes.js` (+180 L) - 3 endpoints nuevos
- `docs/qa/FASE10_3B-SUMMARY.md` - Documentación completa

**Criterio de salida** (completado):
- [x] Métricas agregadas disponibles (context loss, acceptance rate, adherence)
- [x] Historial de actividad unificado (endpoint API)
- [x] Replay suite para detectar pérdida de contexto
- [ ] UI de actividad (pendiente para Fase 10.5 - UX)

#### **Fase 10.4: Motor de Coaching v2 + Skills Compuestas (Semana 3)**

**Objetivo**: Pasar de comandos a recomendaciones de alto valor con tools compuestos que reducen fricción.

**Status**: ✅ **Completado** (2026-02-16)

**Tareas - Decision Engine v2**:
- [x] Generar "next best actions" con impacto esperado
- [x] Priorizacion: capacidad real + deadlines + objetivos + cumplimiento historico
- [x] Explicabilidad obligatoria por recomendacion
- [x] Integracion con guardrails actuales

**Tareas - Skills Compuestas (High Impact)**:
- [x] `smart_process_inbox`: inbox → tarea vinculada a objetivo + agendada (reduce 4 pasos a 1)
- [x] `plan_and_schedule_week`: plan semanal + auto-link a objetivos + bloques calendario (reduce ~15min a 1 confirmación)
- [x] `batch_reprioritize`: ejecuta redistribución automática al detectar sobrecarga (convierte aviso en acción)
- [x] `breakdown_milestone`: descompone milestone en sub-tareas + distribuye en calendario

**Entregables**:
- ✅ Decision engine v2 con ranking de recomendaciones (`web/server/helpers/decision-engine-v2.js` - 297 líneas)
- ✅ Payload estandar: `reason`, `impact`, `tradeoff`, `confidence`
- ✅ `web/server/helpers/llm-agent-mutation-tools.js` - 4 nuevos tools compuestos (preview + execute)
- ✅ `web/server/helpers/llm-agent-orchestrator.js` - Tool definitions + system prompt rule #12
- ✅ Templates para breakdown integrados en mutation tools

**Criterio de salida**:
- [x] El coach propone plan semanal usable en < 3 minutos con razones verificables
- [x] Procesar inbox item a tarea agendada en 1 confirmación
- [x] Sobrecarga se resuelve con 1 click (no manualmente)

#### **Fase 10.5: Proactividad Util y UX de Asistente (Semanas 4-5)**

**Objetivo**: Que la experiencia principal sea de asistente, no chat soporte.
**Indicaciones Claude**: `docs/qa/CLAUDE-FASE10_5-INSTRUCTIONS.md`

**Tareas - Proactividad Inteligente**:
- [ ] Morning brief, midday correction y weekly review con triggers por riesgo real
- [ ] Frecuencia adaptativa basica segun aceptacion/rechazo
- [ ] Panel coach-first: riesgos, plan recomendado, foco del dia, trade-offs
- [ ] Acciones por recomendacion: `Aplicar`, `Posponer`, `No aplica`, `Explicame`

**Tareas - Skills Compuestas (Ceremonias)**:
- [ ] `end_of_day_closure`: marca completas/incompletas → mueve pendientes a mañana → registra patrón → sugiere foco
- [ ] `quarterly_okr_setup`: template para crear objetivo + KRs + proyectos alineados en un paso (como `create_learning_structure`)

**Entregables**:
- Vista Coach v2 en dashboard
- Sistema de triggers anti-spam
- `web/server/helpers/llm-agent-mutation-tools.js` - 2 skills adicionales (closure + okr_setup)
- `web/server/helpers/content-templates.js` - Template OKR trimestral

**Criterio de salida**:
- [ ] El usuario puede operar semana completa desde recomendaciones, sin depender de escribir comandos
- [ ] Ceremonia diaria de cierre en <2min con patrón registrado
- [ ] Setup trimestral en 1 confirmación

#### **Fase 10.6: Calidad y Mejora Continua (Semana 6)**

**Objetivo**: Medir impacto real y cerrar ciclo de aprendizaje.

**Tareas**:
- [ ] Metricas: acceptance rate, adherence semanal, reschedules, progreso de objetivos
- [ ] Evaluacion con replay simple de semanas previas
- [ ] Ajuste de reglas/prompts basado en datos

**Entregables**:
- Reporte semanal automatico de calidad del coach
- Checklist QA de coaching (no solo CRUD)

**Criterio de salida**:
- [ ] Tendencia de mejora en adherencia y menor sobrecarga durante 4 semanas

**Nota (fuera de Fase 10)**:
- Auto-mode sin confirmacion y tuning avanzado por experimentacion pasan a Fase 11+.

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
Polish: Fases 9.1, 10, 11 (agente + personalizacion + QA)
```

---

## 📋 Próximos Pasos Inmediatos

1. **Completado**: Fase 10.4 - Motor de Coaching v2 + 4 Skills Compuestas ✅ (2026-02-16)
   - Decision Engine v2 con ranking y explainability
   - 4 compound tools: smart_process_inbox, plan_and_schedule_week, batch_reprioritize, breakdown_milestone
2. **Siguiente**: Fase 10.5 - Proactividad + UX Coach-First + 2 Skills adicionales
   - `end_of_day_closure`: ceremonia de cierre diaria
   - `quarterly_okr_setup`: template OKR trimestral
   - Panel coach-first con recomendaciones y riesgos
3. **Después**: Fase 10.6 - Métricas de impacto + mejora continua
   - Acceptance rate, adherence, reschedule ratio
   - Replay validation y ajuste de reglas

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
| **Normalizacion Areas** | 6.1 | ✅ Completado | Areas transversales + filtros + CRUD + herencia |
| **Strategic Coach** | 7, 8, 9 | ✅ Completado | OKR + coach proactivo + chat accionable |
| **Agentic Coach** | 9.1, 10 | En progreso | LLM + memoria + proactividad con guardrails |
| **Production Ready** | 10, 11 | ⏳ Pendiente | v1.0 completo y probado |

---

## 📈 Progreso Actual

**Completado**: Fases 0-9.1 base (MVP 2.0 funcional)
- Fase 0: ✅ MVP Contract (2026-02-11)
- Fase 1: ✅ Backend Stability (2026-02-11)
- Fase 2: ✅ SQLite Migration (2026-02-11)
- Fase 3: ✅ Capacity Planning (2026-02-11)
- Fase 4: ✅ Project Management (2026-02-12)
- Fase 5: ✅ Time Blocking (2026-02-12)
- Fase 6: ✅ Weekly Planning + UX (2026-02-13)
- Fase 6.1: ✅ Areas Normalization (2026-02-14)
- Fase 7A: ✅ Strategic Objectives (2026-02-14)
- Fase 7B: ✅ Risk KR + Dashboard (2026-02-14)
- Fase 8: ✅ Coach Decision Engine (2026-02-14)
- Fase 9: ✅ Conversational Assistant (2026-02-14)
- Fase 9.1: ✅ LLM Agent Layer (2026-02-14)

**Completado**: Fases 0-10.4 (Decision Engine v2 + 4 Compound Skills) ✅
**Proximo**: Fase 10.5 (Proactividad + UX Coach-First)
**Tiempo Invertido**: ~38 horas
**Tiempo Estimado Restante**: ~2-3 días (10.5-10.6 + 11)

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

### Fase 6.1 Completado (2026-02-14):

**Sistema de Areas de Vida**:
- ✅ Backend: 6 endpoints REST (areas-routes.js) con Zod validation
- ✅ category obligatorio en TaskSchema y ProjectSchema (.default('trabajo'))
- ✅ Herencia automatica: project.category -> milestones al crear
- ✅ Hook useAreaCategories: categorias dinamicas desde API de areas
- ✅ AreaFilter component: filtro reutilizable agregado a 4 vistas
- ✅ getCategoryColor dinamico (antes hardcodeado en TodayView/SomedayView)
- ✅ AreasView: vista dedicada con filtros por estado
- ✅ EditAreaModal: crear/editar con iconos, colores, prioridad, preview
- ✅ Migracion: 34 tareas OK, 13 milestones sin category -> heredados de proyecto
- ✅ QA: 3 escenarios nuevos (navegacion areas, filtro area, selector en edicion)

---

### Fase 7A Completado (2026-02-14):

**Capa Estrategica base (Objetivos + KR)**:
- ✅ Migracion 007: tablas `objectives` y `key_results` + links estrategicos en `tasks`
- ✅ Backend Objectives/KR: CRUD + actualizacion de progreso
- ✅ UI ObjectivesView: crear, editar, eliminar objetivos y key results
- ✅ UX mejorada: validaciones visibles, mensajes claros, formulario guiado
- ✅ Vinculacion en edicion: tarea -> objetivo/KR, proyecto -> objetivo
- ✅ Badges de contexto: Today, ThisWeek y ProjectCard
- ✅ QA: escenarios de crear/editar/eliminar objetivo incluidos

**Status**: Fases 7, 8, 9, 9.1 y 10.2 completadas + 10.3A en progreso | Proximo: Fase 10.3B

---

## 🧰 Inventario de Skills Compuestas (Compound Tools)

**Objetivo**: Reducir fricción eliminando operaciones multi-paso repetitivas.

### ✅ Implementadas (Fase 9.1)

| Skill | Propósito | Operaciones Compuestas |
|-------|-----------|------------------------|
| `create_content_project` | Crear proyecto de contenido desde template | Template → Proyecto con 4-5 milestones predefinidos |
| `create_learning_structure` | Crear estructura completa de aprendizaje | Template → Objetivo + 3 KRs + Proyecto con milestones |

### 📋 Planificadas (Fase 10.4 - High Impact)

| Skill | Frecuencia | Impacto | Reduce de → a |
|-------|-----------|---------|---------------|
| `smart_process_inbox` | Diaria (10-20 items) | Alto | 4 pasos → 1 confirmación |
| `plan_and_schedule_week` | Semanal | Alto | ~15min → 1 confirmación |
| `batch_reprioritize` | Semanal (sobrecarga) | Alto | Aviso manual → Acción automática |
| `breakdown_milestone` | Por proyecto | Medio | N tareas + N agendas → 1 confirmación |

**Detalles**:

#### `smart_process_inbox`
- **Input**: Inbox item + contexto (área sugerida)
- **Output**: Tarea creada + vinculada a objetivo que mejor encaja (por área) + opcionalmente agendada
- **Reduce**: procesar → crear tarea → vincular objetivo → agendar (4 pasos → 1)

#### `plan_and_schedule_week`
- **Input**: Semana objetivo
- **Output**: Tareas propuestas para compromiso + auto-vinculadas a objetivos activos por área + bloques calendario generados respetando capacidad y deep work
- **Reduce**: plan_week manual → vincular cada tarea a objetivo → crear N bloques calendario (~15min → 1 confirmación)

#### `batch_reprioritize`
- **Input**: Estado actual (sobrecarga detectada)
- **Output**: Redistribución ejecutada: diferir low-priority, proteger tareas vinculadas a KRs en riesgo, mover a "algún día" tareas que no caben
- **Reduce**: Recibir aviso de sobrecarga → redistribuir cada tarea manualmente (warning → acción)

#### `breakdown_milestone`
- **Input**: Milestone ID + contexto del proyecto
- **Output**: Sub-tareas concretas generadas + distribuidas en calendario de la semana
- **Reduce**: Milestone vago → crear sub-tareas una por una → agendar cada una (N*2 pasos → 1)

### 📋 Planificadas (Fase 10.5 - Ceremonias)

| Skill | Frecuencia | Impacto | Propósito |
|-------|-----------|---------|-----------|
| `end_of_day_closure` | Diaria | Medio | Cierre del día + patrón registrado + foco mañana |
| `quarterly_okr_setup` | Trimestral | Medio | Setup estratégico en 1 paso |

**Detalles**:

#### `end_of_day_closure`
- **Input**: Estado del día (tareas completadas/pendientes)
- **Output**: Tareas marcadas complete/incomplete → pendientes movidas a mañana → patrón registrado en memory → sugerencia foco mañana
- **Reduce**: Cierre manual disperso → ceremonia estructurada en <2min

#### `quarterly_okr_setup`
- **Input**: Área + periodo + metas estratégicas
- **Output**: Objetivo + N KRs + proyectos alineados en un paso
- **Reduce**: Similar a `create_learning_structure` pero para OKRs generales (4+ pasos → 1)
- **Patrón**: Template parametrizable por área (trabajo, salud, familia, etc.)

### 📊 Métricas de Impacto Esperadas

| Métrica | Baseline (sin skills) | Target (con skills) |
|---------|----------------------|---------------------|
| Tiempo procesar inbox | 20min/día | 5min/día |
| Tiempo planning semanal | 15-20min | 3min |
| Sobrecarga manual resolution | 10-15min | 1 click |
| Setup proyecto grande | 5-10min | 2min |

---

## COACH AGENT SPEC (para implementar en fase de coach)

Fecha: 2026-02-14
Estado: Draft aprobado para ejecucion futura

Referencia metodologica:
- `docs/COACH-METHOD.md` (personalidad, protocolos y reglas de decision del coach)

### Objetivo

Construir un asistente exclusivo del proyecto Productivity Coach que:
1. Entienda estado real de la app (tareas, bloques, capacidad, objetivos).
2. Recomiende planes realistas diarios/semanales.
3. Ejecute acciones con confirmacion y trazabilidad.
4. Aprenda de patrones personales de uso.

### Principios de diseno

1. Agent-first con tools internas (no chat generico).
2. Suggest mode por defecto, Act mode con confirmacion.
3. Explicabilidad obligatoria por cada decision.
4. Cambios reversibles (undo de ultima accion).
5. No sobrecargar agenda: capacidad como restriccion dura.

### Arquitectura objetivo

1. Coach Brain
- Orquesta razonamiento, priorizacion y recomendaciones.
- Usa contexto estructurado, no texto libre solamente.

2. Tool Layer (acciones sobre la app)
- API interna para planificar, mover, reprogramar, priorizar.
- Todas las acciones quedan auditadas.

3. Context/Planner Engine
- Snapshot unico de estado: hoy, semana, carga, objetivos, backlog.
- Calcula riesgo de sobrecarga y conflicto de deadlines.

4. Memory Layer
- Guarda preferencias de trabajo y decisiones previas.
- Ajusta sugerencias a patrones reales del usuario.

5. Guardrails
- Confirmacion para acciones de impacto.
- Limites por tipo de accion.
- Rollback rapido.

### Tools minimas del coach (MVP)

1. get_context_snapshot
- Retorna estado operativo completo.

2. plan_day
- Propone plan diario segun capacidad y prioridades.

3. plan_week
- Distribuye carga semanal por bloques y deadlines.

4. schedule_block
- Crea bloque horario para tarea/proyecto.

5. move_block
- Reubica bloque horario con validaciones.

6. reprioritize_tasks
- Reordena por impacto, urgencia y objetivos.

7. resolve_overload
- Sugiere y/o aplica redistribucion cuando hay sobrecarga.

8. goal_alignment_check
- Evalua alineacion tareas <-> KR/objetivos.

9. weekly_review
- Resume progreso, riesgos y plan siguiente semana.

### Modos de operacion

1. Suggest mode (default)
- Solo propone cambios.
- Siempre muestra razon + impacto esperado.

2. Act mode
- Ejecuta cambios luego de confirmacion explicita.
- Registra evento de auditoria.

3. Auto mode (opcional, futura)
- Solo acciones seguras pre-aprobadas.
- Se desactiva automaticamente ante conflicto.

### Modelo de datos sugerido

1. coach_events
- id, timestamp, action_type, payload, reason, result, undo_payload.

2. coach_memory
- id, key, value, confidence, updated_at.

3. coach_sessions
- id, started_at, ended_at, mode, summary, outcomes.

4. task_goal_links (si no existe)
- task_id, objective_id, key_result_id, weight.

### Reglas base de decision (v1)

1. Nunca planear mas minutos que capacidad util.
2. Priorizar tareas vinculadas a KR activos.
3. Favorecer bloques profundos para trabajo cognitivo.
4. Mantener buffer diario para imprevistos.
5. Si hay sobrecarga: reprogramar, no acumular.

### UX minima del coach

1. Panel "Recomendaciones del Coach" en dashboard.
2. Chat con acciones sugeridas + botones (Aplicar / Editar / Descartar).
3. Historial de acciones con "Deshacer".
4. Resumen de cierre diario y semanal.

### Fases de implementacion propuestas

1. Fase Coach-1: Infraestructura
- Entidades coach_events, coach_memory, coach_sessions.
- Endpoint get_context_snapshot.

2. Fase Coach-2: Tools core
- plan_day, plan_week, schedule_block, move_block, reprioritize_tasks.

3. Fase Coach-3: Integracion chat accionable
- Suggest/Act mode.
- Confirmaciones + auditoria.

4. Fase Coach-4: Inteligencia estrategica
- goal_alignment_check, resolve_overload, weekly_review.
- Memoria adaptativa por patrones.

### Criterios de aceptacion del coach

1. El coach detecta sobrecarga antes de que ocurra.
2. Puede proponer y aplicar un plan semanal completo en < 3 minutos.
3. Cada accion incluye "por que" y "impacto esperado".
4. Todas las acciones son auditables y reversibles.
5. Mejora medible en cumplimiento semanal despues de 4 semanas.

---







