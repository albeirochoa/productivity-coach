# 📊 Esquema de Datos

**Última actualización:** 2026-02-09

---

## 🎯 Contexto

Los tres archivos JSON del sistema trabajan juntos como un "cerebro digital" que mantiene:
1. **Estado actual** (lo que haces esta semana)
2. **Memoria** (patrones detectados)
3. **Identidad** (quién eres y cómo trabajas)

Ninguno es una base de datos tradicional. Son **archivos locales** que persisten entre sesiones de Claude Code.

---

## 📁 `coach-data.json` - La Única Fuente de Verdad

Este archivo contiene el estado operativo del sistema.

### Estructura General

```json
{
  "config": { /* Configuración básica */ },
  "current_week": { /* Semana actual */ },
  "inbox": { /* Ideas capturadas */ },
  "history": [ /* Semanas anteriores */ ],
  "stats": { /* Métricas agregadas */ }
}
```

---

### 1. `config` - Configuración del Sistema

```json
{
  "name": "Albeiro",
  "timezone": "America/Bogota",
  "weekly_checkin_day": "monday",
  "weekly_review_day": "friday",
  "midweek_check_day": "wednesday",
  "max_weekly_commitments": 6,
  "language": "es",
  "life_areas": [
    "trabajo",
    "clientes",
    "contenido",
    "salud",
    "familia",
    "aprender"
  ]
}
```

**Notas:**
- `life_areas`: Las 6 categorías personalizadas de Albeiro. **No usar "work/personal"** genérico.
- `max_weekly_commitments`: Límite duro. Cada área puede tener 1 compromiso máximo.
- `timezone`: Para cálculo correcto de semanas ISO 8601.

---

### 2. `current_week` - Semana Activa

```json
{
  "week": "2026-W07",
  "start_date": "2026-02-09",
  "end_date": "2026-02-13",
  "commitments": [
    {
      "id": "2026-W07-1",
      "week": "2026-W07",
      "category": "familia",
      "task": "Ir a jugar bolos con mi familia",
      "committed_date": "2026-02-07T08:00:40-05:00",
      "completed": true,
      "completed_date": "2026-02-09T20:26:04.298Z",
      "notes": ""
    }
  ],
  "notes": "Primera semana completa organizada por 6 áreas de vida."
}
```

**Reglas de Negocio:**
- `week`: Formato ISO 8601 (YYYY-Www).
- `id`: Único por compromiso (`{week}-{número}`).
- `category`: Debe coincidir con uno de los `life_areas` del config.
- `completed`: Boolean que determina si cuenta para la racha.
- `committed_date`: Fecha ISO 8601 con zona horaria.

---

### 3. `inbox` - Captura Rápida

```json
{
  "work": [
    {
      "id": "inbox-work-1",
      "text": "Crear plantilla de email para prospectos",
      "captured_date": "2026-02-08T14:32:00-05:00"
    }
  ],
  "personal": []
}
```

**Límites:**
- **Máximo 10 ideas** por categoría (work/personal).
- Al hacer el `checkin` del lunes, se revisa el inbox y se vacía (convirtiéndose en compromisos o eliminándose).

---

### 4. `history` - Archivo Histórico

Array de semanas pasadas. Estructura idéntica a `current_week`:

```json
[
  {
    "week": "2026-W06",
    "start_date": "2026-02-02",
    "end_date": "2026-02-06",
    "commitments": [ /* ... */ ],
    "notes": "Primera semana del sistema.",
    "completion_rate": 1.0
  }
]
```

**Nota importante:**
- `completion_rate`: Se calcula al cerrar la semana (viernes con `/review`).
- Fórmula: `completadas / total`.

---

### 5. `stats` - Métricas Globales

```json
{
  "total_weeks": 1,
  "total_commitments": 6,
  "total_completed": 5,
  "current_streak": 0,
  "best_streak": 0,
  "monthly_completion_rates": {
    "2026-02": 0.83
  }
}
```

**Cálculo de Racha:**
- **Racha continúa** si `completion_rate >= 1.0` (100%).
- **Racha se rompe** si `completion_rate < 1.0`.
- `best_streak`: Máxima racha histórica.

---

## 🧠 `coach-memory.json` - El Cerebro

Este archivo almacena el aprendizaje del coach sobre ti.

### Estructura General

```json
{
  "created_date": "2026-02-06T20:58:41-05:00",
  "last_updated": "2026-02-07T08:04:51-05:00",
  "patterns_detected": [],
  "monthly_reflections": [],
  "health_alerts": [],
  "daily_checkins": [],
  "insights": [],
  "current_context": {},
  "coach_notes": [],
  "learning_history": []
}
```

---

### 1. `insights` - Lo que el Coach Sabe de Ti

Array de strings con observaciones importantes:

```json
[
  "Albeiro es adicto al trabajo - quiere cambiar esto",
  "Planear le aburre - necesita sistema que capture sin planear",
  "Mejor energía en mañanas - compromisos importantes deben ser AM",
  "Su bloque de oro es de 6:00 AM a 6:30 AM"
]
```

**Uso:**
- El coach lee estos insights antes de cada interacción.
- Se añaden manualmente cuando detecta comportamientos clave.

---

### 2. `patterns_detected` - Patrones Automáticos

Array de objetos con patrones detectados por el skill `/analyze`:

```json
[
  {
    "pattern_type": "procrastination",
    "description": "Tareas de 'contenido' se posponen consistentemente",
    "detected_date": "2026-02-15T10:00:00-05:00",
    "confidence": "high",
    "evidence": [
      "W05: contenido pospuesto",
      "W06: contenido pospuesto"
    ]
  }
]
```

---

### 3. `health_alerts` - Alertas de Burnout

Array de objetos generados por `/health-check`:

```json
[
  {
    "alert_type": "burnout_risk",
    "severity": "medium",
    "detected_date": "2026-02-20T09:00:00-05:00",
    "reason": "3 semanas consecutivas sin compromisos en 'familia' o 'salud'",
    "action_taken": "Forzar compromisos en áreas descuidadas"
  }
]
```

---

### 4. `daily_checkins` - Check-ins Diarios Opcionales

Array de objetos del skill `/daily`:

```json
[
  {
    "date": "2026-02-10",
    "energy_level": 8,
    "focus_quality": 7,
    "mood": "optimista",
    "note": "Día productivo, terminé el live temprano"
  }
]
```

---

### 5. `monthly_reflections` - Reflexiones Profundas

Array de objetos del skill `/reflect`:

```json
[
  {
    "month": "2026-02",
    "reflection_date": "2026-02-28T18:00:00-05:00",
    "questions_answered": {
      "what_worked": "Compromisos pequeños y específicos",
      "what_didnt": "Subestimé tiempo de tareas de clientes",
      "patterns_noticed": "Familia sigue descuidada",
      "adjustments": "Forzar al menos 1 compromiso familia por semana"
    }
  }
]
```

---

### 6. `coach_notes` - Notas del Entrenador

Array de objetos con contexto de cada sesión importante:

```json
[
  {
    "date": "2026-02-06T20:58:41-05:00",
    "note": "Primera sesión. Albeiro quiere sistema con categorías personalizadas.",
    "context": "Creó perfil completo. Identificó que familia está descuidada."
  }
]
```

---

### 7. `current_context` - Contexto Activo

Objeto con estado actual de proyectos y áreas:

```json
{
  "active_projects": [
    "Sistema productividad (este proyecto)",
    "App Google Ads (quiere vender)",
    "Agencia Google Ads (20+ clientes)"
  ],
  "recent_struggles": [
    "Poco tiempo para familia",
    "Adicción al trabajo"
  ],
  "recent_wins": [],
  "areas_needing_attention": [
    "familia",
    "salud"
  ]
}
```

---

## 👤 `profile.json` - Tu Identidad

Este archivo define **quién eres** y cómo trabajas mejor.

### Estructura General

```json
{
  "name": "Albeiro",
  "created_date": "2026-02-06T20:58:41-05:00",
  "last_updated": "2026-02-06T20:58:41-05:00",
  "roles": [],
  "life_areas": {},
  "work_patterns": {},
  "challenges": {},
  "goals_2026": {},
  "preferences": {}
}
```

---

### 1. `roles` - Tus Identidades

Array de strings:

```json
[
  "Creador de contenido (YouTube, Podcast, Blog)",
  "Dueño de agencia Google Ads",
  "Desarrollador (app Google Ads)",
  "Esposo",
  "Corredor/Atleta",
  "Tío"
]
```

---

### 2. `life_areas` - Definición de Áreas

Objeto con descripción detallada de cada área:

```json
{
  "trabajo": {
    "description": "Gestión de cuentas Google Ads (20+ clientes), agencia",
    "priority": "high",
    "current_focus": "Vender app Google Ads, hacer crecer agencia"
  },
  "familia": {
    "description": "Esposa, hermanas, sobrinos",
    "priority": "medium",
    "current_focus": "Más tiempo con esposa, amigos, familia",
    "note": "Área descuidada actualmente"
  }
}
```

---

### 3. `work_patterns` - Tu Bloque de Oro

```json
{
  "best_time": "Mañanas temprano (6:00 am - 6:30 am)",
  "golden_hour": "06:00 - 06:30",
  "energy_drop": "Después de mediodía",
  "best_days": "Todos los días temprano",
  "productivity_note": "Concentración y energía caen después de las mañanas."
}
```

**Uso:**
- El coach recomienda tareas importantes en el "golden hour".
- Evita compromisos complejos para la tarde.

---

### 4. `challenges` - Patrones a Cambiar

```json
{
  "main_struggle": "Planear - me aburre",
  "behavior_pattern": "Adicto al trabajo - quiere cambiar esto",
  "tendency": "Empezar cosas sin planear, a veces abandonar",
  "needs": "Accountability externo (por eso el sistema entrenador)"
}
```

---

### 5. `goals_2026` - Objetivos del Año

```json
{
  "trabajo": [
    "Retomar y posicionarse con contenido (YouTube, Podcast, Blog)",
    "Vender app Google Ads"
  ],
  "personal": [
    "Cuidar salud (correr, gym)",
    "Más tiempo para familia",
    "Dejar de ser adicto al trabajo"
  ]
}
```

---

### 6. `preferences` - Preferencias de Sistema

```json
{
  "commitment_style": "Específico, no vago",
  "accountability": "Necesita reportar a alguien (entrenador)",
  "task_size": "Pequeñas, no >2 horas",
  "planning": "Mínimo - prefiere acción"
}
```

---

## 🔄 Flujo de Datos Entre Archivos

```
1. LUNES (checkin)
   ├─ Lee profile.json → Conoce tus áreas y preferencias
   ├─ Lee coach-memory.json → Recuerda insights y patrones
   ├─ Lee coach-data.json (inbox) → Revisa ideas capturadas
   └─ Escribe coach-data.json (current_week) → Crea compromisos

2. DURANTE LA SEMANA (capture)
   ├─ Lee coach-data.json (inbox)
   └─ Escribe coach-data.json (inbox) → Añade nueva idea

3. VIERNES (review)
   ├─ Lee coach-data.json (current_week) → Revisa qué se completó
   ├─ Mueve current_week → history
   ├─ Actualiza stats (racha, completion_rate)
   └─ Escribe coach-memory.json (coach_notes) → Registra insights de la semana

4. MENSUAL (reflect)
   ├─ Lee coach-data.json (history del mes)
   ├─ Lee coach-memory.json (patterns, insights)
   └─ Escribe coach-memory.json (monthly_reflections) → Añade reflexión
```

---

## 🛡️ Reglas de Integridad

### Límites Duros (Hard Limits)

1. **Máximo 6 compromisos por semana** (1 por área).
2. **Máximo 10 ideas en inbox** por categoría.
3. **Eliminación automática** si algo no se toca en 2+ semanas.
4. **Balance obligatorio**: Si `health-check` detecta burnout, fuerza compromisos en familia/salud.

### Validaciones en Escritura

Antes de modificar `coach-data.json`:
- ✅ Verificar que `category` existe en `life_areas` del config.
- ✅ Verificar que no hay más de 6 compromisos en `current_week`.
- ✅ Verificar que IDs son únicos.
- ✅ Usar formato ISO 8601 para fechas.

---

## 🔗 Referencias

- [Arquitectura General](./README.md)
- [Skills que Escriben Datos](../skills/README.md)
- [Tech Stack](./tech-stack.md)

---

*Este esquema está diseñado para ser modificado por Claude Code. No requiere base de datos externa.*
