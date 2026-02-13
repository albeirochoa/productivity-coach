# Skill: Sprint - Estrategia de Ejecución para Mega-Proyectos

## Propósito
Definir la estrategia de trabajo para mega-proyectos: ¿Goteo sostenible o Batching (lotes)?

## Cuándo usar
- Al inicio de un mega-proyecto
- Cuando Albeiro ejecute: `claude code sprint`
- Cuando el ritmo actual no funciona y quiere cambiar de estrategia

## Comportamiento

### Tono
- Estratégico y analítico
- Ayuda a elegir según el contexto de vida actual
- Sin juicios, solo opciones

### Flujo

#### Definir estrategia para un proyecto
```bash
$ claude code sprint "curso"

🎯 ESTRATEGIA DE SPRINT - Curso Google Ads

Tienes 40 videos por delante. Vamos a elegir cómo avanzar.

═══════════════════════════════════════

OPCIÓN A: GOTEO SOSTENIBLE (1 video/semana)
✅ Ventajas:
- Cero estrés
- Compatible con agencia a tope
- Racha semanal garantizada

⚠️ Desventajas:
- Curso terminado en ~40 semanas (9 meses)
- Cambio de contexto constante

Flujo semanal:
- Lunes: Guion (15 min)
- Martes: Diapositivas (15 min)
- Miércoles: Grabar/Editar (30 min)

═══════════════════════════════════════

OPCIÓN B: BATCHING (Agrupamiento por tipo)
✅ Ventajas:
- Módulo completo en 3-4 semanas
- Menos cambio de contexto
- Eficiencia máxima

⚠️ Desventajas:
- Requiere bloques de tiempo más largos
- Riesgo de burnout si la agencia explota

Flujo por módulo (10 videos):
- Semana 1: Solo guiones (30 min/día)
- Semana 2: Solo diapositivas (30 min/día)
- Semana 3: Día de producción (grabar todo)
- Semana 4: Edición y publicación

═══════════════════════════════════════

TU CONTEXTO ACTUAL:
- Agencia: 20 clientes activos
- Energía: Mejor en mañanas (06:00 am)
- Familia: Descuidada (necesita atención)

RECOMENDACIÓN DEL COACH:
Empieza con GOTEO. Si en 4 semanas ves que la agencia se calma, 
cambiamos a BATCHING para acelerar.

¿Qué estrategia eliges? (A/B)
> A

✅ Estrategia GOTEO activada para "Curso Google Ads".
Próximo lunes te asigno el primer video.
```

## Reglas de negocio

### Factores para recomendar GOTEO
- Agencia con >15 clientes activos
- Alertas de burnout recientes
- Familia descuidada (necesita balance)
- Energía reportada <6 últimos 7 días

### Factores para recomendar BATCHING
- Agencia estable (<10 clientes)
- Racha alta (>4 semanas)
- Proyecto con deadline cercano
- Albeiro reporta "tengo tiempo libre"

### Cambio de estrategia
Si después de 4 semanas la estrategia no funciona:
```
⚠️ ALERTA DE SPRINT

Llevas 4 semanas en modo GOTEO.
Progreso: 4/40 videos (10%)
Ritmo: 1 video/semana

¿Cómo te sientes?
1. Bien, sigamos así
2. Muy lento, quiero acelerar (cambiar a BATCHING)
3. Estresado, necesito pausar el proyecto

> 2

Ok, cambiamos a BATCHING. La próxima semana hacemos 
los 6 guiones restantes del Módulo 1.
```

## Archivos que modifica
- Lee: `~/productivity-coach/backlog/*.json` (proyectos)
- Lee: `~/productivity-coach/profile.json` (contexto)
- Lee: `~/productivity-coach/coach-memory.json` (alertas)
- Escribe: `~/productivity-coach/backlog/*.json` (actualiza estrategia)

## Formato en archivo de proyecto
```json
{
  "project_id": "curso-google-ads",
  "sprint_strategy": "goteo",
  "sprint_config": {
    "videos_per_week": 1,
    "time_per_video": 45,
    "days": ["lunes", "martes", "miercoles"]
  },
  "strategy_changed_date": "2026-02-09",
  "strategy_history": [
    {
      "strategy": "goteo",
      "start_date": "2026-02-09",
      "reason": "Agencia a tope, necesita balance"
    }
  ]
}
```

## Notas importantes
- La estrategia NO es permanente. Se puede cambiar cada 4 semanas.
- El Coach monitorea si la estrategia está funcionando.
- Si Albeiro no avanza en 2 semanas consecutivas, el Coach sugiere pausar el proyecto.
