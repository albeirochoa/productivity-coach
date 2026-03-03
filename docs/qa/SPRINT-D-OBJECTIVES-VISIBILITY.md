# SPRINT D: Objetivos Visibles en Día a Día

**Fecha**: 2026-02-16
**Prioridad**: CRÍTICA
**Duración estimada**: 1 semana

---

## Problema Identificado

Durante sesión de coaching real (70 min), Albeiro preguntó:

> "y los objetivos los dejamos en el olvido, para que los metimos y incluimos kr, si no hacemos nada con ello? no veo nada de los objetivos en el plan semanal - puff ¿que pasa coach?"

**Realidad actual**:
- ✅ Existen 11 objetivos OKR en sistema
- ✅ Existen 17+ Key Results
- ✅ 90%+ tareas vinculadas a objetivos (campo `objectiveId`)
- ❌ **PERO la UI NO muestra esta conexión en vistas diarias**

---

## Situación Actual

### Esta Semana (6 tareas)
- 3 tareas vinculadas a **"Incrementar clientes de la agencia"**
- 3 tareas SIN objetivo vinculado

**El usuario NO ve**:
- Qué objetivo avanza cada tarea
- Cuántas tareas avanzan cada objetivo
- Progreso de Key Results relacionados
- Si está balanceando bien entre objetivos

---

## Solución: 4 Features

### Feature 1: Banner de Objetivos en "Esta Semana"

**Vista actual:**
```
Esta Semana (6)
[Lista de tareas...]
```

**Vista nueva:**
```
Esta Semana (6 tareas)
┌────────────────────────────────────────┐
│ 🎯 Incrementar clientes: 3 tareas      │
│ ⚪ Sin objetivo: 3 tareas               │
└────────────────────────────────────────┘
[Lista de tareas...]
```

**Implementación**:
- Agrupar tareas por `objectiveId`
- Mostrar top 3 objetivos + "Otros"
- Click en banner → filtrar por objetivo

---

### Feature 2: Badge en cada tarea mostrando objetivo

**Vista actual:**
```
✓ Cliente: Cristina Robles
   └─ Crear estrategia de campaña (45min)
```

**Vista nueva:**
```
✓ Cliente: Cristina Robles
  🎯 Incrementar clientes → KR: Aumentar ingresos $2000 (0/2000)
   └─ Crear estrategia de campaña (45min)
```

**Implementación**:
- Fetch objective data when loading tasks
- Show badge with objective title
- Show related Key Result + progress
- Gray out tasks without objective

---

### Feature 3: Vista "Objetivos" mejorada

**Actual**: Lista simple de objetivos
**Nueva**: Dashboard con tareas activas por objetivo

```
🎯 Incrementar clientes de la agencia (Q1 2026)
├─ KR: Conseguir 5 nuevos clientes (0/5) - 0%
├─ KR: Aumentar ingresos $2000 USD (0/2000) - 0%
│
└─ TAREAS ESTA SEMANA (3):
   ✓ Prospección y captación nuevos clientes
   ✓ Cliente: Cristina Robles
   ✓ Cliente: Fiestas Premium

└─ SOMEDAY (8):
   ○ Cliente: Karen
   ○ Cliente: Makrocintas
   [...]
```

---

### Feature 4: Coach pregunta "¿Qué objetivo priorizas?"

**Flujo**:
1. Usuario abre "Esta Semana"
2. Coach detecta: 3 tareas sin objetivo vinculado
3. Coach sugiere:

```
💬 Coach: "Tienes 3 tareas sin objetivo vinculado:
   - Llamar a Marisol
   - Cita médica jueves 19 feb
   - Pagar tarjetas

   ¿A qué objetivo contribuyen? O ¿son rutinas personales?"

   [Vincular a objetivo] [Marcar como rutina]
```

---

## Prioridad vs otros Sprints

| Sprint | Prioridad | Razón |
|--------|-----------|-------|
| **Sprint D (Objetivos)** | **CRÍTICA** | Sin esto, OKR es inútil |
| Sprint A (Clientes) | Alta | Gestión de 16 clientes |
| Sprint B (Capacidad) | Alta | Evitar sobrecarga |
| Sprint C (HOY) | Media | Time blocking |

**Recomendación**: Implementar Sprint D PRIMERO, o en paralelo con Sprint A.

---

## User Stories

### US1: Como usuario, quiero ver qué objetivo avanza cada tarea
**Criterios de aceptación**:
- [ ] Cada tarea muestra badge con nombre de objetivo
- [ ] Badge clickeable → ir a vista Objetivos
- [ ] Tareas sin objetivo tienen badge gris "Sin objetivo"

### US2: Como usuario, quiero ver resumen de objetivos en "Esta Semana"
**Criterios de aceptación**:
- [ ] Banner arriba muestra top 3 objetivos + conteo de tareas
- [ ] Click en objetivo → filtrar tareas por ese objetivo
- [ ] Mostrar progress bar del objetivo (0-100%)

### US3: Como usuario, quiero ver qué tareas avanzan cada objetivo
**Criterios de aceptación**:
- [ ] Vista Objetivos muestra tareas agrupadas (Esta Semana, Someday, Done)
- [ ] Puedo ver Key Results + progress
- [ ] Puedo actualizar currentValue de Key Result desde ahí

### US4: Como usuario, quiero que Coach me recuerde vincular tareas
**Criterios de aceptación**:
- [ ] Coach detecta tareas sin objetivo en "Esta Semana"
- [ ] Sugiere vincular a objetivo existente
- [ ] Opción "Marcar como rutina" (no requiere objetivo)

---

## Endpoints Existentes (ya disponibles)

```javascript
// Objectives API (ya existe)
GET    /api/objectives              // Lista todos
GET    /api/objectives/:id          // Detalle + Key Results
POST   /api/objectives              // Crear
PATCH  /api/objectives/:id          // Actualizar
DELETE /api/objectives/:id          // Eliminar

// Key Results API (ya existe)
POST   /api/objectives/:id/key-results       // Crear KR
PATCH  /api/objectives/:id/key-results/:krId // Actualizar progreso
DELETE /api/objectives/:id/key-results/:krId // Eliminar

// Tasks ya tienen campo objectiveId
PATCH  /api/tasks/:id { objectiveId: "obj-..." }
```

---

## Cambios en Frontend

### 1. Componentes nuevos
- `ObjectiveBadge.jsx` - Badge que muestra objetivo + KR
- `ObjectivesSummary.jsx` - Banner con conteo por objetivo
- `ObjectiveDetail.jsx` - Vista mejorada con tareas agrupadas

### 2. Hooks nuevos
- `useObjectivesWithTasks.js` - Fetch objectives + tareas relacionadas

### 3. Vistas a modificar
- `ThisWeekView.jsx` - Agregar ObjectivesSummary + badges
- `ObjectivesView.jsx` - Rediseñar con tareas agrupadas
- `TodayView.jsx` - Mostrar objetivos del día

---

## Métricas de Éxito

| Métrica | Antes | Meta |
|---------|-------|------|
| Tiempo para saber qué objetivo avanzo | ∞ | <5 seg |
| Tareas vinculadas a objetivos | 50% | 90% |
| Claridad de impacto del día | 2/10 | 8/10 |
| Uso de vista Objetivos | 0x/semana | 3x/semana |

---

## Contexto de la Sesión

**Usuario**: Albeiro (dueño de agencia con 16 clientes)
**Duración sesión**: 70 min
**Fecha**: 2026-02-16

Después de organizar 39 tareas, crear 16 proyectos, vincular 90% tareas a objetivos, el usuario preguntó:

> "¿Para qué metimos objetivos si no hacemos nada con ellos?"

**Este es el gap #1 más crítico de la app.**

Sin visualización de objetivos en el día a día:
- ❌ OKR se siente como burocracia
- ❌ Usuario no ve progreso estratégico
- ❌ Decisiones del día están desconectadas de largo plazo

---

## Siguiente Paso

1. **Implementar Feature 2** (badges en tareas) - 2 días
2. **Implementar Feature 1** (banner resumen) - 1 día
3. **Implementar Feature 3** (vista mejorada) - 2 días
4. **Implementar Feature 4** (coach suggestions) - 1 día

**Total**: 6 días de desarrollo

---

**SPRINT D es la diferencia entre:**
- ❌ OKR como feature ignorada
- ✅ OKR como sistema de toma de decisiones diarias
