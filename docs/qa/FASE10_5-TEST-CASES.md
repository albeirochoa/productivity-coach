# Fase 10.5 — Test Cases (Manual)

**Fecha**: 2026-02-16
**Fase**: 10.5 — Proactividad Útil + UX Coach-First
**Objetivo**: Verificar que las ceremonias aparecen solo cuando hay señales reales y que el usuario puede interactuar sin fricción.

---

## Pre-requisitos

1. Backend corriendo: `cd web && node server.js`
2. Frontend corriendo: `cd web && npm run dev`
3. Base de datos SQLite con datos de prueba (tareas, objetivos, KRs)

---

## Test Case 1: Morning Brief — Sobrecarga

**Caso**: Morning Brief aparece si hay sobrecarga de capacidad

**Setup**:
1. Crear 10+ tareas comprometidas esta semana con tiempo estimado total > capacidad semanal
2. Verificar hora actual está entre 7-9 AM (o ajustar manualmente hora del sistema para testing)

**Steps**:
1. Abrir app en navegador
2. Hacer clic en botón Coach (abajo-derecha, icono Brain azul)

**Expected**:
- Panel Coach se abre
- Muestra ceremonia "Morning Brief"
- Risks incluyen: "Sobrecarga de X.Xh esta semana"
- Suggested Actions incluyen: "Redistribuir tareas"

**Cleanup**:
- Clic en "Aplicar" o "Posponer" para dismissar ceremonia
- Verificar que NO vuelve a aparecer en la misma ventana (7-9 AM del mismo día)

---

## Test Case 2: Morning Brief — Deadlines Hoy

**Caso**: Morning Brief aparece si hay deadlines críticos hoy

**Setup**:
1. Crear 2+ tareas con dueDate = hoy
2. Verificar hora actual está entre 7-9 AM

**Steps**:
1. Hacer clic en botón Coach

**Expected**:
- Ceremonia "Morning Brief" se muestra
- Risks incluyen: "X tarea(s) vencen hoy"
- Suggested Actions incluyen: "Enfocar en deadlines"

---

## Test Case 3: Morning Brief — Sin Riesgos

**Caso**: Morning Brief NO aparece si no hay riesgos detectados

**Setup**:
1. Capacidad semanal OK (carga < capacidad)
2. Sin tareas con deadline hoy
3. Sin KRs en riesgo alto
4. Hora actual entre 7-9 AM

**Steps**:
1. Hacer clic en botón Coach

**Expected**:
- Panel Coach se abre
- Muestra mensaje: "Todo bajo control"
- No hay ceremonias activas
- Botón "Actualizar" disponible

---

## Test Case 4: Midweek Check — Baja Completitud

**Caso**: Midweek Check aparece si completion rate < 40% el miércoles

**Setup**:
1. Día de la semana = Miércoles
2. Hora actual entre 12-14h
3. Crear 10 tareas comprometidas esta semana
4. Marcar solo 2-3 como completadas (< 40%)

**Steps**:
1. Hacer clic en botón Coach

**Expected**:
- Ceremonia "Midweek Check" se muestra
- Risks incluyen: "Solo XX% completado (X/X)"
- Suggested Actions incluyen: "Ajustar plan semanal"

---

## Test Case 5: Weekly Review — Pendientes Críticos

**Caso**: Weekly Review aparece si hay tareas críticas pendientes el viernes

**Setup**:
1. Día de la semana = Viernes
2. Hora actual entre 16-18h (4-6 PM)
3. Crear 3+ tareas con deadline o keyResultId, status = 'active', thisWeek = true

**Steps**:
1. Hacer clic en botón Coach

**Expected**:
- Ceremonia "Weekly Review" se muestra
- Risks incluyen: "X tarea(s) crítica(s) pendiente(s)"
- Suggested Actions incluyen: "Planificar próxima semana"

---

## Test Case 6: Spam Prevention

**Caso**: Ceremonia NO se muestra dos veces en la misma ventana

**Setup**:
1. Ejecutar Test Case 1 (Morning Brief con sobrecarga)
2. Dismissar ceremonia con "Aplicar"

**Steps**:
1. Cerrar panel Coach
2. Esperar 1 minuto
3. Volver a hacer clic en botón Coach

**Expected**:
- Panel Coach muestra "Todo bajo control"
- Morning Brief NO vuelve a aparecer (ya fue mostrada hoy)

**Verificación DB**:
```sql
SELECT * FROM coach_events WHERE rule_id = 'ceremony:morning_brief' ORDER BY created_at DESC LIMIT 1;
```
- Debe existir registro con event_type = 'ceremony_shown'
- created_at debe ser de hoy

---

## Test Case 7: Banner en "Esta Semana"

**Caso**: Banner de ceremonia aparece en vista "Esta Semana"

**Setup**:
1. Ejecutar Test Case 1 (generar ceremonia activa)

**Steps**:
1. Navegar a vista "Esta Semana"
2. Observar banners en la parte superior

**Expected**:
- Banner azul (cyan) aparece debajo del capacity status banner
- Texto: "X ceremonia(s) del coach"
- Subtexto: "Haz clic en el botón Coach..."
- Icono Brain + Bell animado

---

## Test Case 8: Botón Coach con Badge

**Caso**: Badge de notificación aparece cuando hay ceremonias

**Setup**:
1. Generar ceremonia activa (cualquier test case 1, 2, 4, o 5)

**Steps**:
1. Observar botón Coach (abajo-derecha)

**Expected**:
- Botón Coach tiene badge rojo con icono Bell en esquina superior derecha
- Badge indica que hay ceremonias activas

**Cleanup**:
1. Abrir panel y dismissar ceremonia
2. Esperar 5-10 segundos
3. Badge desaparece (auto-refresh cada 5 min)

---

## Test Case 9: Acciones de Ceremonia

**Caso**: Usuario puede aplicar, posponer, o marcar "no aplica"

**Setup**:
1. Generar ceremonia activa

**Steps**:
1. Abrir panel Coach
2. Hacer clic en botón "Aplicar"

**Expected**:
- Ceremonia desaparece del panel
- API POST /api/coach/ceremonies/dismiss se ejecuta con action = 'apply'
- DB: registro con event_type = 'ceremony_dismissed' se crea

**Repetir con**:
- Botón "Posponer" → action = 'postpone'
- Botón "No aplica" → action = 'not_applicable'
- Botón "Explícame" → action = 'explain'

---

## Test Case 10: Fuera de Ventanas de Tiempo

**Caso**: Ceremonias NO aparecen fuera de sus ventanas de tiempo

**Setup**:
1. Hora actual = 10:00 AM (fuera de Morning Brief: 7-9 AM)
2. Crear sobrecarga (setup de Test Case 1)

**Steps**:
1. GET /api/coach/ceremonies

**Expected**:
- Response: `{ generatedAt: '...', count: 0, ceremonies: [] }`
- Aunque hay sobrecarga, la ceremonia NO se genera porque estamos fuera de ventana

---

## Test Case 11: Regresiones en Endpoints Existentes

**Caso**: Endpoints de Fase 8-10.4 NO se rompen

**Steps**:
1. Enviar mensaje al chat: "Planifica mi semana"
2. Verificar respuesta + preview
3. Confirmar acción

**Expected**:
- Chat funciona normalmente
- Preview generado
- Confirmación ejecuta acción
- Sin errores 500

**Endpoints a verificar**:
- POST /api/coach/chat/message
- POST /api/coach/chat/confirm
- GET /api/coach/diagnosis
- GET /api/coach/metrics

---

## Resumen de Ejecución

| Test Case | Descripción | Resultado | Notas |
|-----------|-------------|-----------|-------|
| TC1 | Morning Brief - Sobrecarga | ⏳ Pending | |
| TC2 | Morning Brief - Deadlines | ⏳ Pending | |
| TC3 | Morning Brief - Sin Riesgos | ⏳ Pending | |
| TC4 | Midweek Check | ⏳ Pending | |
| TC5 | Weekly Review | ⏳ Pending | |
| TC6 | Spam Prevention | ⏳ Pending | |
| TC7 | Banner Esta Semana | ⏳ Pending | |
| TC8 | Badge Coach Button | ⏳ Pending | |
| TC9 | Acciones Ceremonia | ⏳ Pending | |
| TC10 | Fuera de Ventanas | ⏳ Pending | |
| TC11 | Regresiones | ⏳ Pending | |

---

## Criterios de Aceptación (MVP 10.5)

- ✅ Build pasa: `npm run build` sin errores
- ⏳ TC1-TC5: Al menos una ceremonia se muestra cuando hay riesgo real
- ⏳ TC6: Spam prevention funciona (max 1 por ventana)
- ⏳ TC7-TC8: UX integrada en vistas clave
- ⏳ TC9: Usuario puede interactuar sin fricción
- ⏳ TC11: Sin regresiones en endpoints previos

---

## Notas de Testing

**Mock de hora del sistema**:
Para testing fuera de ventanas de tiempo, puede:
1. Modificar temporalmente `CEREMONY_WINDOWS` en `coach-ceremonies.js`
2. Usar herramienta de sistema para cambiar hora (Windows: Configuración > Hora)
3. Esperar a la ventana real de tiempo

**Datos de prueba**:
- Crear objetivos con KRs en riesgo: progress < 30%, no actualizado en 14 días
- Crear tareas con deadlines vencidos o próximos
- Comprometer más horas de las que permite capacidad semanal

**Logs útiles**:
- Backend: `tail -f logs/combined.log`
- Frontend: Console de navegador (F12)
- DB: `sqlite3 productivity-coach.db "SELECT * FROM coach_events ORDER BY created_at DESC LIMIT 10;"`
