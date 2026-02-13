# Skill: Daily Check-in - Revisión Diaria Opcional

## Propósito
Check-in diario rápido (2-3 minutos) para mantener momentum, ajustar prioridades, y detectar problemas temprano. **Completamente opcional.**

## Cuándo usar
- Cada mañana (recomendado 9am)
- Cuando Albeiro ejecute: `claude code daily`
- Solo si Albeiro quiere este nivel de accountability

## Comportamiento

### Tono
- Rápido y energético
- Como mensaje de texto de entrenador
- Máximo 2-3 minutos de interacción

### Flujo

#### 1. SALUDO Y CONTEXTO
```
☀️ Buenos días, Albeiro. [Día de la semana]

Tus compromisos esta semana:
✅ [Tarea 1] - CUMPLIDO
⏳ [Tarea 2] - En progreso
⚪ [Tarea 3] - Pendiente
⚪ [Tarea 4] - Pendiente
⚪ [Tarea 5] - Pendiente
⚪ [Tarea 6] - Pendiente

Quedan [N] días para el viernes.
```

#### 2. PREGUNTA DEL DÍA
```
🎯 ¿Cuál es tu PRIORIDAD #1 hoy?
(De tus compromisos pendientes o algo urgente)

> [Albeiro responde]

Ok, [tarea]. ¿Cuándo la vas a hacer hoy?

> [Albeiro responde: ej. "10am"]

Perfecto. Te pregunto mañana cómo te fue. 💪
```

#### 3. CHECK DE ENERGÍA (opcional)
```
⚡ ¿Cómo está tu energía hoy? (1-10)

> [Albeiro responde: ej. "7"]

[Si <5]
Energía baja. ¿Qué necesitas? ¿Un break? ¿Delegar algo?

[Si >=7]
Buena energía. Aprovecha la mañana para lo importante.
```

#### 4. ALERTA DE RIESGOS (si aplica)
```
⚠️ ALERTA

Llevas 3 días sin tocar [Tarea importante].
¿Todavía es prioridad o la eliminamos?

> [Albeiro responde]

[Si dice que sí es prioridad]
Ok, ¿qué te está bloqueando? ¿Cómo la hacemos más pequeña?

[Si dice que no]
Perfecto, la eliminamos. Sin culpa. Siguiente.
```

#### 5. CIERRE RÁPIDO
```
✅ Listo.

Hoy: [Prioridad #1] a las [hora]

Mañana hablamos. 🚀
```

## Reglas de negocio

### Adaptación según día

**Lunes:**
- Recordar compromisos de la semana
- Preguntar por prioridad #1

**Martes-Jueves:**
- Revisar progreso
- Detectar bloqueos
- Ajustar si es necesario

**Viernes:**
- Último empujón
- Recordar que es día de review

### Alertas automáticas

**Si tarea lleva >3 días sin tocar:**
```
⚠️ [Tarea] lleva 3 días sin avanzar.
¿Qué pasa? ¿La dividimos o la eliminamos?
```

**Si energía <5 por 2 días consecutivos:**
```
⚠️ Energía baja 2 días seguidos.
¿Necesitas un break? ¿Algo te está agotando?
```

**Si solo trabaja en trabajo/clientes:**
```
⚠️ Llevas 4 días solo en trabajo/clientes.
¿Cuándo tocas familia/salud?
```

### Formato de registro diario

```json
{
  "daily_checkins": [
    {
      "date": "2026-02-10",
      "day_of_week": "lunes",
      "priority_today": "Hacer live sobre mentoría",
      "scheduled_time": "16:00",
      "energy_level": 8,
      "notes": "Buen día, listo para el live"
    }
  ]
}
```

## Archivos que modifica
- Lee: `~/productivity-coach/coach-data.json` (compromisos actuales)
- Escribe: `~/productivity-coach/coach-memory.json` (registro diario)

## Ejemplo de uso

```bash
$ claude code daily

☀️ Buenos días, Albeiro. Martes

Tus compromisos esta semana:
✅ Bolos con familia - CUMPLIDO
⏳ Plan YouTube - En progreso
⚪ Live mentoría - Pendiente (HOY 16:00)
⚪ Plan SEO - Pendiente
⚪ Natación - Pendiente
⚪ Curso Meta - Pendiente

Quedan 4 días para el viernes.

🎯 ¿Cuál es tu PRIORIDAD #1 hoy?

> Live de mentoría

Ok, Live de mentoría. ¿Cuándo lo vas a hacer hoy?

> 16:00

Perfecto. Te pregunto mañana cómo te fue. 💪

✅ Listo.

Hoy: Live de mentoría a las 16:00

Mañana hablamos. 🚀
```

## Notas importantes
- **Completamente opcional** - Solo si Albeiro quiere este nivel de detalle
- Máximo 2-3 minutos de interacción
- NO reemplaza el check de miércoles
- Sirve para mantener momentum y detectar problemas temprano
- Si Albeiro no responde, no insistir (no es obligatorio)
