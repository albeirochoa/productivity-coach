# API Reference

Last updated: 2026-02-13
Base URL: `http://localhost:3000`

## Contexto

Backend Express modular con persistencia SQLite via `db-store`.
No hay autenticacion (uso personal local).

## Endpoints activos (47)

### Sistema
1. `GET /health`
2. `POST /api/backup/create`
3. `GET /api/backup/list`

### Tasks y templates
1. `GET /api/tasks`
2. `GET /api/tasks/this-week`
3. `GET /api/tasks/projects`
4. `GET /api/tasks/templates`
5. `DELETE /api/tasks/templates/:id`
6. `PATCH /api/tasks/templates/:id`
7. `POST /api/tasks`
8. `PATCH /api/tasks/:id`
9. `PATCH /api/tasks/:id/toggle`
10. `PATCH /api/tasks/:id/milestones/:milestoneId`
11. `POST /api/tasks/:id/commit-milestone`
12. `DELETE /api/tasks/:id`

### Inbox
1. `GET /api/inbox`
2. `POST /api/inbox`
3. `DELETE /api/inbox/:type/:id`
4. `PATCH /api/inbox/:type/:id`
5. `POST /api/inbox/:type/:id/process`

### Stats y perfil
1. `GET /api/stats`
2. `GET /api/profile`

### Proyectos y AI
1. `POST /api/projects/analyze`
2. `GET /api/ai/providers`
3. `PATCH /api/projects/:id/move`
4. `POST /api/projects/:id/milestones`
5. `PATCH /api/projects/:projectId/milestones/:milestoneId`
6. `POST /api/projects/:id/sections`
7. `DELETE /api/projects/:id/sections/:sectionId`
8. `GET /api/projects/hierarchy`

### Legacy compat
1. `GET /api/commitments/current`
2. `PATCH /api/commitments/:id`
3. `GET /api/projects`
4. `POST /api/projects`
5. `PATCH /api/projects/:id/milestones/:milestoneId`

### Capacity
1. `GET /api/capacity/config`
2. `PATCH /api/capacity/config`
3. `GET /api/capacity/week`
4. `GET /api/capacity/today`
5. `POST /api/capacity/validate-commitment`
6. `POST /api/capacity/auto-redistribute`

### Calendar
1. `GET /api/calendar/blocks`
2. `POST /api/calendar/blocks`
3. `PATCH /api/calendar/blocks/:id`
4. `DELETE /api/calendar/blocks/:id`
5. `GET /api/calendar/day/:date`

### Chat
1. `POST /api/chat`

## Contratos importantes

1. Las rutas legacy siguen activas para compatibilidad.
2. `POST /api/tasks/:id/commit-milestone` puede responder `409` por sobrecarga de capacidad.
3. Los errores retornan `{ "error": "..." }` con HTTP `4xx/5xx`.

## Referencias de codigo

1. Bootstrap app: `web/server/app.js`
2. Rutas: `web/server/routes/`
3. Store y DB: `web/server/helpers/db-store.js`, `web/server/db/migrations/`
