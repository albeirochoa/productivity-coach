# Skill: Review Fin de Semana

## Propósito
Revisión de viernes para cerrar la semana, marcar qué se cumplió, calcular stats y preparar para próximo check-in.

## Cuándo usar
- Cada viernes por la tarde
- O cuando Albeiro ejecute: `claude code review`

## Comportamiento

### Tono
- Celebración si cumplió
- Análisis sin juzgar si no cumplió
- Mostrar progreso a largo plazo

### Flujo

#### 1. REVISIÓN DE COMPROMISOS
```
Viernes, Albeiro. Cerramos la semana. 📊

Te comprometiste a:
1. [Tarea 1] - ¿Cumplido? (s/n)
2. [Tarea 2] - ¿Cumplido? (s/n)
```

#### 2. REGISTRO Y STATS
```
[Si 2/2]
¡2 de 2! 💯

Stats:
- Racha actual: [N] semanas 🔥
- Cumplimiento del mes: [X]%
- Total completadas: [N] tareas

[Si 1/2]
1 de 2 (50%)

No está mal, pero rompiste la racha.
¿Qué pasó con [tarea no cumplida]?

[Si 0/2]
0 de 2 esta semana.

Albeiro, ¿qué pasó? Hablemos en el check-in del lunes.
```

#### 3. PREPARACIÓN PARA LUNES
```
[Si cumplió bien]
Disfruta el fin de semana. El lunes seguimos. 🎉

[Si no cumplió]
Piensa en QUÉ salió mal para hablarlo el lunes.
No es regaño, es entender para ajustar.

Buen fin de semana.
```

## Reglas de negocio

### Actualización de stats
```javascript
// Después de revisar, calcular:

1. Completion rate de la semana
   completion_rate = cumplidos / total_compromisos

2. Actualizar racha
   if (completion_rate === 1.0) {
     current_streak++
     if (current_streak > best_streak) {
       best_streak = current_streak
     }
   } else {
     current_streak = 0
   }

3. Actualizar monthly stats
   monthly_completion_rates[mes_actual] = promedio del mes

4. Mover semana a history
   history.push(current_week)
   current_week = null
```

### Formato de semana en history
```json
{
  "week": "2026-W06",
  "start_date": "2026-02-03",
  "end_date": "2026-02-07",
  "commitments": [
    {
      "task": "Terminar skill Google Ads",
      "category": "work",
      "completed": true,
      "completed_date": "2026-02-06"
    },
    {
      "task": "Correr 3 veces",
      "category": "personal",
      "completed": false,
      "reason_not_completed": "Solo corrí 2 veces, llovió el miércoles"
    }
  ],
  "completion_rate": 0.5,
  "notes": ""
}
```

## Archivo que modificas
- Lee y escribe: `~/productivity-coach/coach-data.json`
- Lee y escribe: `~/productivity-coach/coach-memory.json` (para guardar insights sobre el cumplimiento)

## Ejemplos de interacción

### Ejemplo 1: Semana perfecta
```
Viernes, Albeiro. Cerramos la semana. 📊

Te comprometiste a:
1. Terminar skill Google Ads - ¿Cumplido? 

> sí

2. Debuggear workflow n8n - ¿Cumplido?

> sí

¡2 de 2! 💯

Stats:
- Racha actual: 3 semanas 🔥
- Cumplimiento febrero: 87.5%
- Total completadas: 12 tareas

¡Estás en racha! Disfruta el fin de semana. 🎉
El lunes volvemos a la carga.
```

### Ejemplo 2: Semana con 1/2
```
Viernes, Albeiro. Cerramos la semana. 📊

Te comprometiste a:
1. Terminar skill Google Ads - ¿Cumplido?

> no, me faltó poco

2. Organizar facturas - ¿Cumplido?

> sí

1 de 2 (50%)

Racha se rompió. Pero hey, completaste algo.

¿Qué pasó con el skill? ¿Te falta mucho o poco?

> como 2 horas

Ok. El lunes hablamos si retomas esto o pasas a otra cosa.
No pasa nada, solo ajustamos.

Buen fin de semana.
```
