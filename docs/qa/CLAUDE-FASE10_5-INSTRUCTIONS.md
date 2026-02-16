# Fase 10.5 — Proactividad Útil + UX Coach‑First (Instrucciones para Claude)

## Contexto obligatorio (leer antes de codificar)
1. `docs/ROADMAP.md` (sección Fase 10.5)
2. `docs/COACH-METHOD.md`
3. `docs/INTEGRATION-CONTRACTS.md`
4. `docs/RELEASE-PLAN-MVP2.md`
5. Código clave actual:
   - `web/server/helpers/decision-engine-v2.js`
   - `web/server/helpers/llm-agent-orchestrator.js`
   - `web/server/routes/coach-chat-routes.js`
   - `web/src/components/Chat/ChatPanel.jsx`
   - `web/src/components/Coach/` (si existe)

## Objetivo de la Fase 10.5
Transformar el coach en un asistente **proactivo y central** (coach‑first UX) con ceremonias claras y acciones explicables.

## Alcance mínimo (MVP 10.5)
### Backend
1. Proactividad **por riesgo real**, no solo por hora:
   - Morning Brief (si hay sobrecarga, deadlines cercanos, o objetivos en riesgo)
   - Midweek Check (si hay desviaciones o baja ejecución)
   - Weekly Review (si hay pendientes críticos o baja tasa de cumplimiento)
2. Endpoint(s) para obtener “ceremonias” + recomendaciones:
   - `GET /api/coach/ceremonies` (morning/midweek/weekly con payload explicable)
   - Reutilizar `decision-engine-v2` para señales de riesgo.
3. Registro en `coach_events` de cada ceremonia (evitar spam).

### Frontend (Coach‑First)
1. Panel/landing de coach con:
   - Estado actual (carga, riesgos, foco del día)
   - Recomendación principal + botones: Aplicar, Posponer, No aplica, Explícame
2. Mostrar “ceremonias” en UI:
   - Morning Brief, Midweek Check, Weekly Review
   - Cada una con acciones sugeridas y explicación.
3. Integrar en vistas clave:
   - “Esta Semana”: banner de capacidad + acciones rápidas
   - “Hoy”: foco del día + 2‑3 bloques sugeridos

## Reglas duras (no romper nada)
1. No romper endpoints de Fase 8–10.4.
2. No duplicar lógica de negocio en prompts.
3. Guardrails siguen siendo autoridad final.
4. Proactividad debe ser **limitada** (máximo 1 por ventana, con cooldown).

## Criterios de aceptación
1. Las ceremonias aparecen solo cuando hay señales reales.
2. Las recomendaciones tienen explicación clara.
3. El usuario puede aplicar o posponer sin fricción.
4. Sin regresiones en chat ni en flujos actuales.
5. Build pasa y endpoints responden.

## Pruebas obligatorias
1. `npm run build` en `web`
2. Pruebas manuales rápidas:
   - Caso con sobrecarga → Morning Brief aparece con acciones
   - Caso normal → no debe aparecer
   - Midweek Check solo si hay desviación
   - Weekly Review si hay pendientes críticos
3. Verificar `coach_events` para spam prevention.

## Entrega final (en tu resumen)
1. Archivos modificados (lista por ruta).
2. Qué quedó listo vs pendiente.
3. Cómo probar en 5‑10 minutos.
