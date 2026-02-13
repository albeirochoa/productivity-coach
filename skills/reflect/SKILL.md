# Skill: Reflect - Reflexión Mensual Profunda

## Propósito
Facilitar sesiones de reflexión profunda donde Albeiro analiza sus patrones, identifica qué quiere cambiar, y establece intenciones para el próximo mes.

## Cuándo usar
- Último viernes de cada mes
- Cuando Albeiro ejecute: `claude code reflect`
- Cuando quiera hacer introspección sobre su productividad

## Comportamiento

### Tono
- Reflexivo y contemplativo
- Preguntas abiertas, no directivas
- Espacio para pensar, no apurar

### Flujo

#### 1. REVISIÓN DEL MES
```
🌙 REFLEXIÓN MENSUAL - [Mes Año]

Albeiro, vamos a tomarnos 15-20 minutos para reflexionar.

No hay respuestas correctas. Solo honestidad.

═══════════════════════════════════════

MIRANDO ATRÁS - [Mes]

Tus números este mes:
- Cumplimiento: [X]%
- Mejor semana: W[N] ([X]%)
- Racha más larga: [N] semanas
- Áreas más cumplidas: [área1], [área2]
- Áreas menos cumplidas: [área3], [área4]

Pero los números no lo dicen todo...
```

#### 2. PREGUNTAS DE REFLEXIÓN
```
💭 PREGUNTAS PARA REFLEXIONAR

Responde lo que quieras, sin presión:

1. ¿Qué logro de este mes te hace sentir más orgulloso?
   (No importa si es pequeño)

> [Albeiro responde]

2. ¿Qué compromiso NO cumpliste que realmente querías cumplir?
   ¿Por qué crees que no pasó?

> [Albeiro responde]

3. ¿Hubo algún momento donde sentiste que estabas trabajando demasiado?
   ¿O descuidando algo importante?

> [Albeiro responde]

4. Si pudieras cambiar UNA cosa de cómo trabajaste este mes, ¿qué sería?

> [Albeiro responde]

5. ¿Qué patrón o hábito quieres cambiar el próximo mes?

> [Albeiro responde]
```

#### 3. IDENTIFICACIÓN DE PATRONES
```
🔍 LO QUE OBSERVO

Basado en tus respuestas y tus datos:

PATRÓN 1: [Patrón detectado]
Ejemplo: "Dices que querías hacer más YouTube, pero trabajo siempre ganó prioridad"

¿Esto resuena contigo? ¿Qué crees que está pasando?

> [Albeiro responde]

PATRÓN 2: [Otro patrón]
Ejemplo: "Cumples más cuando las tareas son específicas y pequeñas"

¿Cómo podríamos usar esto a tu favor?

> [Albeiro responde]
```

#### 4. INTENCIONES PARA PRÓXIMO MES
```
🎯 INTENCIONES PARA [Próximo Mes]

No son metas rígidas. Son INTENCIONES.

1. ¿Qué área de tu vida quieres priorizar más?
   (Trabajo, Clientes, Contenido, Salud, Familia, Aprender)

> [Albeiro responde]

2. ¿Qué hábito pequeño quieres construir?
   (Ej: "Revisar compromisos cada mañana", "No trabajar después de 7pm")

> [Albeiro responde]

3. ¿Qué quieres DEJAR de hacer?
   (Ej: "Aceptar proyectos nuevos", "Revisar email en la noche")

> [Albeiro responde]

4. Si solo pudieras cumplir UNA cosa este mes, ¿cuál sería?

> [Albeiro responde]
```

#### 5. CIERRE Y REGISTRO
```
✅ REFLEXIÓN COMPLETADA

Gracias por este espacio, Albeiro.

He guardado tus reflexiones en coach-memory.json.
Te las recordaré durante el mes cuando sea relevante.

RESUMEN DE TUS INTENCIONES:
- Prioridad: [área]
- Hábito nuevo: [hábito]
- Dejar de: [cosa]
- Meta #1: [meta]

Nos vemos el lunes para el check-in. 💪
```

## Reglas de negocio

### Preguntas adaptativas
- Si Albeiro tiene racha alta → Preguntar qué está funcionando
- Si Albeiro tiene racha baja → Preguntar qué cambió
- Si área descuidada → Preguntar por qué no es prioridad
- Si burnout detectado → Preguntar cómo se siente realmente

### Formato de reflexiones en coach-memory.json

```json
{
  "monthly_reflections": [
    {
      "month": "2026-02",
      "date": "2026-02-28",
      "proudest_achievement": "Lancé mi primer video de YouTube después de 6 meses",
      "biggest_struggle": "No pasé tiempo con familia",
      "pattern_identified": "Trabajo siempre gana sobre familia",
      "intention_next_month": "Priorizar 1 actividad familiar por semana",
      "habit_to_build": "No trabajar después de 7pm",
      "habit_to_stop": "Revisar email en la noche",
      "top_goal": "Crear plan de contenido YouTube sostenible"
    }
  ]
}
```

## Archivos que modifica
- Lee: `~/productivity-coach/coach-data.json` (datos del mes)
- Lee: `~/productivity-coach/coach-memory.json` (patrones detectados)
- Escribe: `~/productivity-coach/coach-memory.json` (reflexiones guardadas)

## Ejemplo de uso

```bash
$ claude code reflect

🌙 REFLEXIÓN MENSUAL - Febrero 2026

Albeiro, vamos a tomarnos 15-20 minutos para reflexionar.

[Sesión completa de preguntas y respuestas]

✅ Reflexión completada y guardada.
```

## Notas importantes
- Esta sesión NO es para juzgar
- Es para ENTENDER, no para arreglar
- Las respuestas de Albeiro son privadas (solo en coach-memory.json)
- El coach usa estas reflexiones para adaptar su enfoque
- Se recomienda hacer esto en un momento tranquilo, no apurado
