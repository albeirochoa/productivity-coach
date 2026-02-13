# Skill: Stats - Estadísticas de Productividad

## Propósito
Mostrar estadísticas y progreso de Albeiro de forma visual y motivadora.

## Cuándo usar
- Cuando Albeiro ejecute: `claude code stats`
- O cuando quiera ver su progreso

## Comportamiento

### Formato de salida
```
📊 STATS ALBEIRO - [Mes Año]

═══════════════════════════════════════

SEMANA ACTUAL
Compromisos: [N]/[N] [✅ / ⏳ en progreso]
Última actualización: [día] a las [hora]

═══════════════════════════════════════

RACHA
Actual: 🔥 [N] semanas consecutivas
Mejor racha histórica: [N] semanas

[Si racha > 0]
¡[N] semanas cumpliendo! Siguiente hito: [N+1] semanas

[Si racha = 0]
Última racha fue de [N] semanas. Volvamos a empezar el lunes.

═══════════════════════════════════════

ÚLTIMAS 4 SEMANAS
W03: ⚪⚪ (0/2) 0%
W04: ✅⚪ (1/2) 50%
W05: ✅✅ (2/2) 100% 🔥
W06: ✅⚪ (1/2) 50%

═══════════════════════════════════════

ESTE MES (Febrero)
Cumplimiento: [X]%
Completadas: [N] de [M] tareas
Mejor semana: W05 (100%)

═══════════════════════════════════════

HISTÓRICO
Total semanas registradas: [N]
Total tareas completadas: [N]
Tasa de cumplimiento global: [X]%

Top 3 mejores meses:
1. Enero 2026: 85%
2. Febrero 2026: 75%
3. Diciembre 2025: 60%

═══════════════════════════════════════

PRÓXIMO HITO
[Si cerca de récord]
¡Estás a [N] semanas de tu mejor racha!

[Si racha baja]
Próximo objetivo: 2 semanas consecutivas
```

### Símbolos
- ✅ = Cumplido
- ⚪ = No cumplido
- ⏳ = En progreso
- 🔥 = Racha activa
- 💯 = 100% cumplimiento
- 📈 = Tendencia al alza
- 📉 = Tendencia a la baja

## Archivo que lee
- Solo lectura: `~/productivity-coach/coach-data.json`
- Solo lectura: `~/productivity-coach/coach-memory.json` (para mostrar insights y notas del coach)

## Cálculos

### Cumplimiento mensual
```javascript
monthly_rate = (tareas_completadas_mes / total_tareas_mes) * 100
```

### Racha actual
```javascript
// Contar semanas consecutivas desde la más reciente con 100% cumplimiento
```

### Mejor semana del mes
```javascript
// Buscar semana con mayor completion_rate en el mes actual
```

## Ejemplo de salida completa
```
📊 STATS ALBEIRO - Febrero 2026

═══════════════════════════════════════

SEMANA ACTUAL (W06)
Compromisos: 1/2 ⏳
- ✅ Debuggear workflow n8n
- ⏳ Terminar skill Google Ads (en progreso)

Última actualización: Miércoles a las 14:30

═══════════════════════════════════════

RACHA
Actual: 🔥 0 semanas
Mejor racha histórica: 5 semanas

Última racha fue de 2 semanas. ¡Volvamos a empezar!

═══════════════════════════════════════

ÚLTIMAS 4 SEMANAS
W03: ⚪⚪ (0/2) 0%
W04: ✅⚪ (1/2) 50%
W05: ✅✅ (2/2) 100% 🔥
W06: ✅⚪ (1/2) 50% (en curso)

Tendencia: 📈 Mejorando (promedio últimas 3: 66%)

═══════════════════════════════════════

FEBRERO 2026
Cumplimiento: 62.5%
Completadas: 5 de 8 tareas
Mejor semana: W05 (100%)

═══════════════════════════════════════

HISTÓRICO (Últimos 3 meses)
Diciembre: 45% (9/20 tareas)
Enero: 73% (11/15 tareas)
Febrero: 62% (5/8 tareas) - en curso

Total completadas: 25 tareas
Tasa global: 60%

═══════════════════════════════════════

PRÓXIMO HITO
Objetivo: 3 semanas consecutivas
Mejor racha personal: 5 semanas (Nov 2025)

¡A por ello! 💪
```
