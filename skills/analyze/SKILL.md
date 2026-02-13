# Skill: Analyze - Detección Automática de Patrones

## Propósito
Analizar automáticamente el historial de compromisos de Albeiro para detectar patrones de productividad, procrastinación, y áreas de riesgo. Genera insights basados en datos reales.

## Cuándo usar
- Cuando Albeiro ejecute: `claude code analyze`
- Automáticamente cada mes (sugerido)
- Cuando quiera entender sus patrones de comportamiento

## Comportamiento

### Tono
- Analítico pero humano
- Sin juzgar, solo observar
- Basado en datos, no suposiciones

### Flujo

#### 1. ANÁLISIS DE DATOS
```
🔍 ANALIZANDO TUS DATOS...

Revisando:
- [N] semanas de historial
- [M] compromisos totales
- 6 áreas de vida

Esto tomará unos segundos...
```

#### 2. REPORTE DE PATRONES
```
📊 ANÁLISIS DE PATRONES - Albeiro

═══════════════════════════════════════

PRODUCTIVIDAD POR DÍA/HORA
- Mejor día: Martes (85% cumplimiento)
- Peor día: Viernes (40% cumplimiento)
- Mejor horario: Mañanas (90% cumplimiento)
- Energía baja: Después de 2pm

INSIGHT: Tus tareas críticas deberían estar en martes/miércoles por la mañana.

═══════════════════════════════════════

CUMPLIMIENTO POR ÁREA
✅ Trabajo: 90% (9/10 cumplidos)
✅ Clientes: 85% (8/10 cumplidos)
⚠️ Contenido: 60% (6/10 cumplidos)
⚠️ Salud: 50% (5/10 cumplidos)
❌ Familia: 30% (3/10 cumplidos)
❌ Aprender: 25% (2/8 cumplidos)

INSIGHT: Estás priorizando trabajo/clientes sobre familia/aprendizaje.
Riesgo de desbalance.

═══════════════════════════════════════

PATRONES DE PROCRASTINACIÓN
Tareas que más postpones:
1. Contenido (YouTube) - 4 semanas consecutivas sin cumplir
2. Familia - 3 de últimas 4 semanas incumplidas
3. Aprender - Curso Meta lleva 5 semanas pendiente

INSIGHT: Tareas creativas (YouTube) y personales (familia) son tus puntos débiles.

═══════════════════════════════════════

TAMAÑO DE TAREAS
- Tareas pequeñas (<1 hora): 80% cumplimiento
- Tareas medianas (1-2 horas): 60% cumplimiento
- Tareas grandes (>2 horas): 20% cumplimiento

INSIGHT: Divide tareas grandes en pasos de <1 hora para mejorar cumplimiento.

═══════════════════════════════════════

RIESGO DE BURNOUT
⚠️ ALERTA MEDIA

Indicadores:
- 4 semanas consecutivas con 80%+ trabajo/clientes
- Solo 1 compromiso familiar en último mes
- 0 compromisos de descanso/ocio

RECOMENDACIÓN: Forzar 1 compromiso familiar + 1 de salud esta semana.

═══════════════════════════════════════

RACHAS Y TENDENCIAS
- Racha más larga: 5 semanas (Nov 2025)
- Racha actual: 0 semanas
- Tendencia últimas 4 semanas: 📉 Bajando (de 100% a 50%)

INSIGHT: Algo cambió hace 2 semanas. ¿Qué pasó?
```

#### 3. RECOMENDACIONES ACCIONABLES
```
💡 RECOMENDACIONES PARA ESTA SEMANA

1. PRIORIZACIÓN
   - Pon YouTube en martes 9am (tu mejor momento)
   - Mueve tareas administrativas a viernes tarde

2. DIVISIÓN DE TAREAS
   - "Terminar curso Meta" → "Ver módulo 1 del curso Meta (30 min)"
   - "Plan contenido YouTube" → "Listar 5 ideas de videos (15 min)"

3. BALANCE
   - OBLIGATORIO: 1 compromiso familiar esta semana
   - OBLIGATORIO: 1 compromiso salud esta semana
   - Máximo 2 compromisos trabajo/clientes

4. PREVENCIÓN BURNOUT
   - Bloquea 1 hora diaria sin trabajo (6-7pm)
   - Agenda 1 actividad de ocio este fin de semana
```

## Reglas de análisis

### Métricas que calcula

#### 1. Cumplimiento por área
```javascript
area_completion_rate = (cumplidos_area / total_area) * 100
```

#### 2. Productividad por día/hora
```javascript
// Analizar en qué días/horas se cumplen más compromisos
// Basado en committed_date y completed_date
```

#### 3. Tamaño de tareas
```javascript
// Clasificar tareas por complejidad estimada
// Pequeñas: palabras clave como "llamar", "enviar", "revisar"
// Medianas: "crear", "diseñar", "planear"
// Grandes: "terminar", "completar", "lanzar"
```

#### 4. Patrones de procrastinación
```javascript
// Detectar tareas que aparecen >2 semanas consecutivas sin cumplir
// Detectar áreas con <50% cumplimiento en último mes
```

#### 5. Riesgo de burnout
```javascript
// ALTO: >80% trabajo/clientes + <20% familia/salud en último mes
// MEDIO: >70% trabajo/clientes + <30% familia/salud
// BAJO: Balance equilibrado
```

### Formato de insights en coach-memory.json

```json
{
  "patterns_detected": [
    {
      "pattern": "Cumple más en martes por la mañana",
      "confidence": "high",
      "detected_date": "2026-02-07",
      "evidence": "8 de 10 tareas completadas en martes AM",
      "recommendation": "Agendar tareas críticas en martes 9-11am"
    },
    {
      "pattern": "Procrastina tareas creativas (YouTube)",
      "confidence": "high",
      "detected_date": "2026-02-07",
      "evidence": "4 semanas consecutivas sin cumplir contenido",
      "recommendation": "Dividir en pasos más pequeños (<30 min)"
    }
  ]
}
```

## Archivos que modifica
- Lee: `~/productivity-coach/coach-data.json` (historial completo)
- Lee: `~/productivity-coach/profile.json` (áreas de vida)
- Escribe: `~/productivity-coach/coach-memory.json` (insights detectados)

## Ejemplo de uso

```bash
$ claude code analyze

🔍 ANALIZANDO TUS DATOS...

Revisando:
- 8 semanas de historial
- 48 compromisos totales
- 6 áreas de vida

[Genera reporte completo]

¿Quieres que guarde estos insights en tu memoria? (s/n)
> s

✅ Insights guardados en coach-memory.json
Te los recordaré en próximos check-ins.
```

## Notas importantes
- Este skill NO juzga, solo observa datos
- Los insights son sugerencias, no órdenes
- Albeiro decide qué hacer con la información
- Se ejecuta idealmente 1 vez al mes para ver tendencias
