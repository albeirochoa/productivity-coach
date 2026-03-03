# Data Migration Plan (Fase 7+)

Date: 2026-02-14
Status: Draft v1

## Goal

Introduce strategic entities and canonical area linkage without data loss or regression in current flows.

## Scope

- Canonical area relation: `areaId` (compat with `category`).
- New entities: `objectives`, `key_results`.
- New links:
  - `tasks.key_result_id` (nullable at start)
  - `tasks.objective_id` (projects are stored in `tasks` with `type='project'`)
  - `inbox.objective_id`, `inbox.key_result_id`

## Migration sequence

## Step 0: Pre-checks

- Backup DB and JSON snapshots.
- Verify no pending failed migrations.
- Record row counts for tasks, projects, milestones, areas.

## Step 1: Schema migrations

Suggested migration files:
- `007_objectives_key_results.sql`
- `008_inbox_objective_links.sql`

Expected schema changes:
- `objectives` table
- `key_results` table with FK to `objectives`
- add `area_id` to tasks if not present
- add `key_result_id` to tasks
- add `objective_id` to tasks
- add `objective_id` and `key_result_id` to inbox

## Step 2: Backfill

Backfill rules:
- Tasks/projects with `category` map to `area_id`.
- If map fails, fallback to `area_id = 'general'`.
- Keep `category` populated during migration window.

## Step 3: Validation gates

Hard checks:
- 0 tasks without `area_id`
- 0 project-type tasks without `area_id`
- objective/key result FKs valid
- no broken task/project rows after linkage columns added
- inbox rows with strategic links remain readable and writable

Soft checks:
- API responses include expected canonical fields.
- legacy writes with `category` still accepted.

## Step 4: Release compatibility window

- Duration: 1 release cycle minimum.
- Backend accepts both `areaId` and `category`.
- Frontend writes `areaId`, reads with fallback.

## Step 5: Finalization

- Drop strict dependency on `category` once all clients are migrated.
- Keep compatibility mapping only if needed for imports.

## Rollback plan

- If migration fails before backfill complete:
  - Restore DB from backup.
  - Re-enable previous app version.
- If migration succeeds but runtime errors appear:
  - Toggle off feature flags for objectives/coach.
  - Keep schema, disable new writes temporarily.

## Observability and QA checkpoints

- Log migration summary (rows updated, failed mappings).
- Add QA scenarios:
  - create/edit task with `areaId`
  - create objective + key result
  - link task/project to strategic entities
  - capture inbox item with objective/KR and process to task
  - fallback behavior when legacy payload uses `category`
