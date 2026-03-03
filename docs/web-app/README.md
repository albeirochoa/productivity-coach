# Aplicacion Web: Productivity Coach

Ultima actualizacion: 2026-02-16

## Contexto

La app web es la interfaz principal del Productivity Coach. Integra:
- Vistas operativas (Inbox, Hoy, Esta Semana, Algun dia, Calendario, Proyectos).
- Capacidad y time blocking.
- Areas de vida y Objetivos/KR.
- Coach (panel de recomendaciones) y chat accionable.

Stack: React + Vite + Tailwind. Backend Express en puerto 3000.

## Como iniciar

1. Instalar dependencias

```bash
cd web
npm install
```

2. Iniciar backend

```bash
cd web
node server.js
```

3. Iniciar frontend

```bash
cd web
npm run dev
```

## Arquitectura de UI

- `App.jsx`: orquesta estado global y modales.
- `Sidebar.jsx`: navegacion principal.
- `MainViewRouter.jsx`: renderiza la vista activa.

Vistas principales:
- `InboxView` (captura + procesamiento)
- `TodayView`
- `ThisWeekView`
- `SomedayView`
- `CalendarView` (day/week/month)
- `ProjectsView` (hierarquia + milestones)
- `AreasView`
- `ObjectivesView`
- `CoachView`

Componentes clave:
- `QuickCaptureModal` (captura rapida)
- `EditTaskModal`, `EditProjectModal`, `EditInboxModal`
- `ProjectWizard`
- `KrBadge` + `KrProgressPrompt` (integracion KR en flujo diario)

## Integraciones importantes

- Areas y Objetivos se cargan desde `api.js`.
- `KrProgressPrompt` aparece al completar tareas vinculadas a KR.
- `ThisWeekView` muestra seccion de KRs en riesgo.
- `CoachView` permite aplicar/rechazar recomendaciones.

## Referencias

- API: `docs/web-app/api-reference.md`
- Roadmap: `docs/ROADMAP.md`
- App entry: `web/src/App.jsx`
- Router: `web/src/components/layout/MainViewRouter.jsx`
