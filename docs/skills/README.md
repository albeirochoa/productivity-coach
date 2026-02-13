# ⚡ Skills del Coach

**Última actualización:** 2026-02-09

---

## 🎯 Contexto

Los **skills** son las capacidades del Productivity Coach. Cada skill se ejecuta como un comando en Claude Code y modifica los archivos JSON según reglas específicas.

**Total de skills:** 12

---

## 🗂️ Índice de Skills

### 🔄 Rutina Semanal (Core)

| Skill | Comando | Descripción | Día |
|-------|---------|-------------|-----|
| [Check-in](./checkin.md) | `claude code checkin` | Revisión semanal y nuevos compromisos | Lunes 9am |
| [Check](./check.md) | `claude code check` | Revisión mid-week de progreso | Miércoles 2pm |
| [Review](./review.md) | `claude code review` | Cierre de semana y cálculo de racha | Viernes 5pm |

---

### 📥 Captura y Organización

| Skill | Comando | Descripción |
|-------|---------|-------------|
| [Capture](./capture.md) | `claude code capture "idea"` | Captura rápida de ideas al inbox |
| [Daily Check-in](./daily-checkin.md) | `claude code daily` | Check-in diario opcional (momentum) |

---

### 📊 Análisis y Reflexión

| Skill | Comando | Descripción |
|-------|---------|-------------|
| [Stats](./stats.md) | `claude code stats` | Visualizar estadísticas y racha |
| [Analyze](./analyze.md) | `claude code analyze` | Detectar patrones automáticamente |
| [Reflect](./reflect.md) | `claude code reflect` | Reflexión mensual profunda |
| [Health Check](./health-check.md) | `claude code health-check` | Detectar burnout y desbalance |

---

### 🏔️ Gestión de Proyectos Largos

| Skill | Comando | Descripción |
|-------|---------|-------------|
| [Project Manager](./project-manager.md) | `claude code project-manager` | Dividir tareas elefante |
| [Roadmap](./roadmap.md) | `claude code roadmap` | Visualizar mega-proyectos |
| [Sprint](./sprint.md) | `claude code sprint "proyecto"` | Estrategia goteo vs batching |

---

## 🎮 Cómo Funcionan los Skills

### 1. Ejecución

```bash
# Sintaxis general
claude code <skill-name> [argumentos opcionales]

# Ejemplos
claude code checkin
claude code capture "crear dashboard de métricas"
claude code sprint "curso-google-ads"
```

---

### 2. Lectura/Escritura de Archivos

Cada skill puede leer/escribir en:

| Archivo | Propósito |
|---------|-----------|
| `coach-data.json` | Estado actual (compromisos, inbox, stats) |
| `coach-memory.json` | Memoria del coach (patrones, insights) |
| `profile.json` | Perfil del usuario (áreas de vida, preferencias) |
| `backlog/*.json` | Mega-proyectos largos |

---

### 3. Estructura de un Skill

Cada skill tiene un archivo `SKILL.md` en `skills/<nombre>/SKILL.md` con:

```markdown
# Skill: [Nombre]

## Propósito
[Qué hace el skill]

## Cuándo usar
[Contexto de uso]

## Comportamiento
[Tono, flujo, interacciones]

## Reglas de negocio
[Límites, validaciones, lógica especial]

## Ejemplos de interacción
[Casos de uso reales]
```

---

## 📋 Descripción de Cada Skill

### 🔄 Rutina Semanal

#### [Check-in Semanal](./checkin.md)

**Propósito:** Revisión de semana anterior y establecimiento de nuevos compromisos.

**Cuándo:** Lunes 9am.

**Flujo:**
1. Revisa compromisos de la semana pasada.
2. Pregunta qué pasó con los no cumplidos.
3. Establece hasta 6 nuevos compromisos (1 por área de vida).
4. Detecta "tareas elefante" e invoca `project-manager` si es necesario.

**Límites:**
- Máximo 6 compromisos por semana.
- Debe haber balance entre áreas (no todo trabajo).

---

#### [Check Mid-Week](./check.md)

**Propósito:** Revisión rápida de progreso a mitad de semana.

**Cuándo:** Miércoles 2pm.

**Flujo:**
1. Muestra compromisos de la semana.
2. Pregunta cómo van.
3. Permite ajustar si algo no es prioridad.

**Tono:** Rápido, sin presión, solo para mantener awareness.

---

#### [Review Fin de Semana](./review.md)

**Propósito:** Cierre de semana, marcado de completados y cálculo de racha.

**Cuándo:** Viernes 5pm.

**Flujo:**
1. Pregunta qué se completó.
2. Calcula `completion_rate`.
3. Actualiza `current_streak` y `best_streak`.
4. Mueve semana a `history`.
5. Celebra o analiza según resultado.

**Cálculo de racha:**
- Si `completion_rate = 1.0` (100%) → Racha continúa 🔥
- Si `completion_rate < 1.0` → Racha se rompe ❌

---

### 📥 Captura y Organización

#### [Capture](./capture.md)

**Propósito:** Capturar ideas rápidas sin comprometerse inmediatamente.

**Cuándo:** Cuando surge una idea durante la semana.

**Flujo:**
1. Usuario ejecuta `claude code capture "idea"`.
2. Coach pregunta: ¿Trabajo o personal?
3. Añade al inbox.
4. En el próximo check-in, se revisa el inbox.

**Regla de los 2 minutos:** Si la idea toma <2 minutos, el coach sugiere hacerla YA.

**Límite:** Máximo 10 ideas por categoría (work/personal).

---

#### [Daily Check-in](./daily-checkin.md)

**Propósito:** Check-in diario opcional para mantener momentum.

**Cuándo:** Mañanas (opcional).

**Flujo:**
1. Pregunta: ¿Cómo te sientes hoy? (energía, foco, mood).
2. Pregunta: ¿Qué vas a hacer hoy?
3. Registra en `coach-memory.json → daily_checkins`.

**Uso:** Para detectar patrones de energía y burnout.

---

### 📊 Análisis y Reflexión

#### [Stats](./stats.md)

**Propósito:** Visualizar estadísticas y racha actual.

**Cuándo:** Cuando el usuario quiera ver su progreso.

**Muestra:**
- Racha actual vs mejor racha.
- Total de semanas.
- Total de compromisos completados.
- Completion rate mensual.
- Gráfico de tendencia (opcional).

---

#### [Analyze](./analyze.md)

**Propósito:** Detectar patrones automáticamente.

**Cuándo:** Después de 4+ semanas de datos.

**Detecta:**
- Procrastinación consistente en cierta área.
- Días/horarios más productivos.
- Tareas que se abandonan repetidamente.
- Áreas descuidadas (familia, salud).

**Salida:** Escribe en `coach-memory.json → patterns_detected`.

---

#### [Reflect](./reflect.md)

**Propósito:** Reflexión mensual profunda.

**Cuándo:** Fin de mes.

**Flujo:**
1. ¿Qué funcionó este mes?
2. ¿Qué no funcionó?
3. ¿Qué patrones notas?
4. ¿Qué ajustarías para el próximo mes?

**Salida:** Escribe en `coach-memory.json → monthly_reflections`.

---

#### [Health Check](./health-check.md)

**Propósito:** Detectar burnout y desbalance de áreas.

**Cuándo:** Automáticamente cada 3 semanas O cuando el usuario ejecuta el comando.

**Detecta:**
- 3+ semanas sin compromisos en familia/salud.
- Ratio trabajo > 80% de compromisos.
- Patrones de incumplimiento en áreas personales.

**Acción:**
- Genera `health_alert` en `coach-memory.json`.
- Fuerza compromisos en áreas descuidadas en el próximo check-in.

---

### 🏔️ Gestión de Proyectos Largos

#### [Project Manager](./project-manager.md)

**Propósito:** Dividir "tareas elefante" en micro-pasos.

**Cuándo:**
- Cuando se detecta una tarea vaga o grande en el check-in.
- Cuando el usuario ejecuta el comando manualmente.

**Flujo:**
1. Usuario describe el proyecto grande (ej: "Crear curso Google Ads").
2. Coach pregunta: ¿Cuál es el primer paso más pequeño?
3. Desglosa en micro-pasos (máx 45 min cada uno).
4. Añade al backlog como mega-proyecto.
5. En check-ins futuros, propone el siguiente micro-paso.

---

#### [Roadmap](./roadmap.md)

**Propósito:** Visualizar progreso de mega-proyectos.

**Cuándo:** Cuando el usuario quiera ver sus proyectos largos.

**Muestra:**
- Lista de proyectos del backlog.
- Progreso de cada uno (milestones completados).
- Próximo milestone sugerido.

**Salida:** Lee `backlog/*.json`.

---

#### [Sprint](./sprint.md)

**Propósito:** Definir estrategia de ejecución para un proyecto.

**Cuándo:** Antes de comenzar un mega-proyecto.

**Opciones:**
- **Goteo:** 1 micro-paso por semana (para proyectos largos).
- **Batching:** Dedicar varias semanas seguidas (para proyectos urgentes).

**Flujo:**
1. Usuario ejecuta `claude code sprint "proyecto"`.
2. Coach pregunta: ¿Goteo o batching?
3. Ajusta frecuencia de compromisos en `backlog/<proyecto>.json`.

---

## 🛡️ Reglas Globales de Skills

### Límites Duros

| Límite | Valor | Skill que lo aplica |
|--------|-------|---------------------|
| Máximo compromisos por semana | 6 | `checkin` |
| Máximo ideas en inbox | 10 por categoría | `capture` |
| Semanas sin tocar tarea → eliminar | 2 | `checkin`, `analyze` |
| Semanas sin balance → alerta burnout | 3 | `health-check` |

---

### Tono del Coach

- **Directo pero empático:** No juzga, pero tampoco deja pasar inacción.
- **Celebra rachas:** 🔥 cuando cumples 100%.
- **Analiza sin culpar:** "¿Qué pasó?" en lugar de "¿Por qué no lo hiciste?"
- **Fuerza priorización:** "Ya tienes 6 compromisos, ¿cuál reemplazas?"

---

### Archivos Modificados

| Skill | `coach-data.json` | `coach-memory.json` | `profile.json` | `backlog/*.json` |
|-------|-------------------|---------------------|----------------|------------------|
| checkin | ✅ | ✅ (notas) | - | - |
| check | - | - | - | - |
| review | ✅ | ✅ (insights) | - | - |
| capture | ✅ (inbox) | - | - | - |
| stats | - | - | - | - |
| analyze | - | ✅ (patterns) | - | - |
| reflect | - | ✅ (reflections) | - | - |
| health-check | - | ✅ (alerts) | - | - |
| daily-checkin | - | ✅ (checkins) | - | - |
| project-manager | ✅ (si crea compromiso) | - | - | ✅ |
| roadmap | - | - | - | - (lee) |
| sprint | - | - | - | ✅ |

---

## 🔗 Referencias

- [Data Schema](../architecture/data-schema.md)
- [Philosophy](../architecture/philosophy.md)
- [Troubleshooting](../troubleshooting/README.md)

---

*"12 skills, 1 objetivo: que termines lo que empiezas."*
