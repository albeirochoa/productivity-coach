# Documentacion del Proyecto Productivity Coach

Last updated: 2026-02-13

## Estado actual

1. Roadmap completado hasta fase 6 (base estable, SQLite, capacity, calendario y planificacion semanal visual).
2. Backend modular en `web/server/app.js` con rutas en `web/server/routes/`.
3. Persistencia via `db-store` (SQLite) manteniendo contratos compatibles.
4. Siguientes fases: objetivos/OKR, motor de decisiones del coach y chat accionable.

## Indice principal

1. Arquitectura
- `docs/architecture/README.md`
- `docs/architecture/data-schema.md`
- `docs/architecture/tech-stack.md`
- `docs/architecture/philosophy.md`
- `docs/architecture/capacity-schema.md`

2. Aplicacion web y API
- `docs/web-app/README.md`
- `docs/web-app/api-reference.md`
- `docs/web-app/capacity-planning.md`

3. Roadmap y ejecucion
- `docs/ROADMAP.md`
- `docs/PLAN-MVP.md`
- `docs/MVP-CONTRACT.md`

4. Skills y operacion
- `docs/skills/README.md`
- `docs/projects/README.md`
- `docs/troubleshooting/README.md`

## Resumen tecnico rapido

1. Frontend: React + Vite + Tailwind + Framer Motion.
2. Backend: Express modular + middlewares de logging/errores.
3. Datos: SQLite con migraciones (`web/server/db/migrations/`).
4. Modulos funcionales activos: Tasks, Inbox, Projects, Capacity, Calendar, Legacy, Chat, Backup, Healthcheck.
