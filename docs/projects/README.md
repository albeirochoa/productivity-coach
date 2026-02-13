# 🏔️ Proyectos y Backlog

**Última actualización:** 2026-02-09

---

## 🎯 Contexto

El sistema de **backlog** maneja mega-proyectos que no caben en compromisos semanales. Estos son proyectos largos como:
- Cursos completos (ej: Curso Google Ads Avanzado).
- Desarrollo de aplicaciones (ej: App de productividad).
- Lanzamiento de productos (ej: Mentoría 2026).

**Diferencia con compromisos semanales:**
- **Compromisos:** Tareas pequeñas (<2 horas) que se completan en 1 semana.
- **Backlog:** Proyectos grandes divididos en milestones.

---

## 📁 Estructura del Backlog

```
backlog/
├── curso-google-ads-avanzado.json
├── app-productividad-v2.json
└── mentoria-2026.json
```

Cada archivo JSON representa un mega-proyecto.

---

## 📋 Formato de Proyecto

### Estructura General

```json
{
  "id": "curso-google-ads-avanzado",
  "title": "Curso Google Ads Avanzado",
  "description": "Curso completo sobre estrategias avanzadas de Google Ads",
  "category": "contenido",
  "status": "in_progress",
  "created_date": "2026-02-01T10:00:00-05:00",
  "last_updated": "2026-02-07T08:15:00-05:00",
  "target_completion": "2026-04-30",
  "strategy": "goteo",
  "milestones": [],
  "notes": ""
}
```

---

### Campos del Proyecto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Identificador único (slug del proyecto) |
| `title` | string | Nombre del proyecto |
| `description` | string | Descripción breve |
| `category` | string | Área de vida (trabajo, contenido, etc.) |
| `status` | string | `not_started`, `in_progress`, `paused`, `completed` |
| `created_date` | ISO 8601 | Fecha de creación |
| `last_updated` | ISO 8601 | Última modificación |
| `target_completion` | ISO 8601 | Fecha objetivo de finalización |
| `strategy` | string | `goteo` o `batching` |
| `milestones` | array | Lista de hitos del proyecto |
| `notes` | string | Notas adicionales |

---

### Estrategias de Ejecución

#### 1. Goteo (Recommended for Long Projects)

**Concepto:** Avanzar 1 milestone por semana.

**Cuándo usar:**
- Proyectos no urgentes.
- Proyectos que requieren tiempo de reflexión.
- Cuando hay múltiples proyectos activos.

**Ejemplo:**
```json
{
  "strategy": "goteo",
  "milestones": [
    { "title": "Definir estructura del curso", "duration": "1 semana" },
    { "title": "Grabar módulo 1", "duration": "1 semana" },
    { "title": "Grabar módulo 2", "duration": "1 semana" }
  ]
}
```

---

#### 2. Batching (Intensive Focus)

**Concepto:** Dedicar varias semanas seguidas al mismo proyecto.

**Cuándo usar:**
- Proyectos urgentes con deadline.
- Proyectos que requieren "flow state".
- Cuando quieres terminar algo rápido.

**Ejemplo:**
```json
{
  "strategy": "batching",
  "notes": "Dedicar 3 semanas completas en febrero para terminar curso"
}
```

---

## 🎯 Milestones (Hitos)

### Estructura de un Milestone

```json
{
  "id": "milestone-1",
  "title": "Definir estructura del curso",
  "description": "Crear outline completo con módulos y lecciones",
  "completed": true,
  "completed_date": "2026-02-05T12:00:00-05:00",
  "tasks": [
    {
      "id": "task-1",
      "description": "Listar temas principales",
      "completed": true
    },
    {
      "id": "task-2",
      "description": "Crear esquema de módulos",
      "completed": true
    }
  ],
  "notes": "Decidí hacer 8 módulos en lugar de 10"
}
```

---

### Campos del Milestone

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Identificador único |
| `title` | string | Nombre del hito |
| `description` | string | Descripción detallada |
| `completed` | boolean | Si se completó |
| `completed_date` | ISO 8601 | Fecha de completado |
| `tasks` | array | Micro-tareas del milestone |
| `notes` | string | Notas del progreso |

---

### Regla de Milestones

**Cada milestone debe:**
- Tener 1-3 micro-tareas.
- Completarse en 1 semana (goteo) o ser parte de un sprint (batching).
- Ser específico y medible.

**❌ Mal ejemplo:** "Avanzar en el curso"
**✅ Buen ejemplo:** "Grabar video 1: Introducción a Scripts"

---

## 🔄 Flujo de Trabajo con Backlog

### 1. Crear Nuevo Proyecto

**Comando:**
```bash
claude code project-manager
```

**Flujo:**
1. Usuario describe el proyecto grande.
2. Coach pregunta: ¿Cuál es el objetivo final?
3. Coach divide en milestones.
4. Crea archivo JSON en `backlog/`.

---

### 2. Ver Proyectos Activos

**Comando:**
```bash
claude code roadmap
```

**Muestra:**
```
🏔️ Tus Mega-Proyectos

1. Curso Google Ads Avanzado [in_progress] 🟢
   - Progreso: 2/8 milestones (25%)
   - Próximo: Grabar módulo 2
   - Estrategia: Goteo (1 milestone/semana)

2. App Productividad v2 [paused] ⏸️
   - Progreso: 3/10 milestones (30%)
   - Pausado desde: 2026-01-20
   - Razón: Priorizar curso

3. Mentoría 2026 [not_started] ⚪
   - Progreso: 0/5 milestones (0%)
   - Inicio planeado: 2026-03-01
```

---

### 3. Definir Estrategia

**Comando:**
```bash
claude code sprint "curso-google-ads-avanzado"
```

**Flujo:**
1. Coach pregunta: ¿Goteo o batching?
2. Usuario elige.
3. Coach actualiza `backlog/curso-google-ads-avanzado.json`.

---

### 4. Integración con Check-in Semanal

**Durante el check-in del lunes:**

```
[Después de revisar semana anterior]

Tienes 1 proyecto activo en modo goteo:
📚 Curso Google Ads Avanzado
   Próximo milestone: "Grabar módulo 2"

¿Lo añadimos como compromiso esta semana?

> sí

Ok. ¿Cuál es el PRIMER PASO concreto?

> escribir guion del módulo 2

Perfecto. Compromiso esta semana:
[Contenido] Escribir guion del módulo 2 (Curso Google Ads)
```

---

## 📊 Estados de Proyecto

| Estado | Emoji | Descripción |
|--------|-------|-------------|
| `not_started` | ⚪ | Proyecto planeado pero no iniciado |
| `in_progress` | 🟢 | Activamente trabajando |
| `paused` | ⏸️ | Temporalmente pausado |
| `completed` | ✅ | Terminado |
| `abandoned` | ❌ | Cancelado definitivamente |

---

## 🛡️ Reglas del Backlog

### 1. Máximo de Proyectos Activos

- **Máximo 3 proyectos en `in_progress`** simultáneamente.
- Si quieres añadir uno nuevo, pausa o termina uno existente.

**Razón:** Evitar dispersión y abandono.

---

### 2. Revisión Mensual de Proyectos

- Cada mes, el coach pregunta por proyectos `paused`.
- Si llevan 3+ meses pausados, se marcan como `abandoned`.

**Flujo en `/reflect`:**
```
Tienes 2 proyectos pausados:
1. App Productividad v2 (pausado hace 2 meses)
2. Blog personal (pausado hace 5 meses)

¿Qué hacemos con estos?
- Retomar
- Abandonar (liberar espacio mental)
- Dejar pausados (pero con plan de retorno)
```

---

### 3. Milestones Deben Ser Accionables

**❌ Mal milestone:** "Avanzar en curso"
**✅ Buen milestone:** "Grabar módulo 2: Estrategias de puja"

---

## 📝 Ejemplo de Proyecto Completo

```json
{
  "id": "curso-google-ads-avanzado",
  "title": "Curso Google Ads Avanzado",
  "description": "Curso de 8 módulos sobre estrategias avanzadas de Google Ads",
  "category": "contenido",
  "status": "in_progress",
  "created_date": "2026-02-01T10:00:00-05:00",
  "last_updated": "2026-02-07T08:15:00-05:00",
  "target_completion": "2026-04-30",
  "strategy": "goteo",
  "milestones": [
    {
      "id": "milestone-1",
      "title": "Definir estructura del curso",
      "description": "Crear outline con módulos y lecciones",
      "completed": true,
      "completed_date": "2026-02-05T12:00:00-05:00",
      "tasks": [
        {
          "id": "task-1",
          "description": "Listar temas principales",
          "completed": true
        },
        {
          "id": "task-2",
          "description": "Crear esquema de módulos",
          "completed": true
        }
      ],
      "notes": "8 módulos + 1 bonus"
    },
    {
      "id": "milestone-2",
      "title": "Grabar módulo 1: Introducción",
      "description": "Video de introducción al curso",
      "completed": false,
      "completed_date": null,
      "tasks": [
        {
          "id": "task-3",
          "description": "Escribir guion",
          "completed": false
        },
        {
          "id": "task-4",
          "description": "Grabar video",
          "completed": false
        },
        {
          "id": "task-5",
          "description": "Editar video",
          "completed": false
        }
      ],
      "notes": ""
    }
  ],
  "notes": "Deadline: fin de abril para lanzar en mayo"
}
```

---

## 🔗 Referencias

- [Skills: Project Manager](../skills/project-manager.md)
- [Skills: Roadmap](../skills/roadmap.md)
- [Skills: Sprint](../skills/sprint.md)
- [Data Schema](../architecture/data-schema.md)

---

*"Proyectos grandes, pasos pequeños, progreso constante."*
