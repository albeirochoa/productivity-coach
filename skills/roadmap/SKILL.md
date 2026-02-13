# Skill: Roadmap - Visualización de Mega-Proyectos

## Propósito
Mostrar el progreso de proyectos grandes (cursos, apps, productos) sin abrumar a Albeiro con detalles innecesarios.

## Cuándo usar
- Cuando Albeiro ejecute: `claude code roadmap`
- O cuando quiera ver el estado de un proyecto específico: `claude code roadmap "curso"`

## Comportamiento

### Tono
- Visual y motivador
- Enfocado en el progreso, no en lo que falta
- Celebra cada hito completado

### Flujo

#### Sin argumentos (Ver todos los proyectos)
```bash
$ claude code roadmap

🏔️ MEGA-PROYECTOS ACTIVOS

═══════════════════════════════════════

📚 Curso Google Ads Avanzado
Estado: En progreso
Módulo actual: 1/4
Videos completados: 3/40 (7.5%)
Última actualización: hace 2 días

Progreso por módulo:
[▓▓▓░░░░░░░] Módulo 1: 30% (3/10 videos)
[░░░░░░░░░░] Módulo 2: 0%
[░░░░░░░░░░] Módulo 3: 0%
[░░░░░░░░░░] Módulo 4: 0%

Próximo hito: Completar guiones Módulo 1 (7 restantes)

═══════════════════════════════════════

💡 App Google Ads
Estado: Pausado
Última actualización: hace 3 semanas
Razón: Priorizando curso

═══════════════════════════════════════

Total proyectos activos: 1
Total proyectos pausados: 1
```

#### Con argumento específico
```bash
$ claude code roadmap "curso"

🏔️ CURSO GOOGLE ADS AVANZADO

═══════════════════════════════════════

RESUMEN GENERAL
Total videos: 40
Completados: 3 (7.5%)
Tiempo invertido: ~2 horas
Ritmo actual: 1.5 videos/semana
Proyección: Curso completo en ~26 semanas (6 meses)

═══════════════════════════════════════

MÓDULO 1: FUNDAMENTOS (En progreso)
[▓▓▓░░░░░░░] 30% completado

Videos listos:
✅ 1.1 - Introducción a Pujas
✅ 1.2 - Tipos de Puja
✅ 1.3 - CPC vs eCPC

Próximos videos:
⏳ 1.4 - Target CPA (Esta semana)
⚪ 1.5 - Maximizar Conversiones
⚪ 1.6 - Target ROAS
... (4 más)

═══════════════════════════════════════

MÓDULO 2: ESTRATEGIAS AVANZADAS
Estado: Bloqueado (requiere Módulo 1 completo)

═══════════════════════════════════════

HITOS IMPORTANTES
✅ Estructura del curso definida (Semana 1)
✅ Primeros 3 guiones escritos (Semana 2)
⏳ Módulo 1 completo (Est. 5 semanas más)
⚪ Módulo 2 completo (Est. 3 meses)
⚪ Curso publicado (Est. 6 meses)
```

## Reglas de negocio

### Cálculo de progreso
```javascript
module_progress = (videos_completed / total_videos_in_module) * 100
overall_progress = (total_videos_completed / 40) * 100
```

### Proyección de tiempo
```javascript
// Basado en ritmo de las últimas 4 semanas
avg_videos_per_week = completed_videos / weeks_elapsed
weeks_remaining = (total_videos - completed_videos) / avg_videos_per_week
```

### Estados de proyecto
- **active**: Trabajando activamente (tiene hormigas asignadas esta semana)
- **paused**: Temporalmente detenido (por prioridades)
- **blocked**: Esperando dependencias externas
- **completed**: Terminado y publicado

## Archivos que lee
- Lee: `~/productivity-coach/backlog/*.json` (todos los proyectos)
- Lee: `~/productivity-coach/coach-data.json` (para calcular ritmo)

## Ejemplo de archivo de proyecto

El roadmap lee archivos como `backlog/curso-google-ads.json`:
```json
{
  "project_id": "curso-google-ads",
  "project_name": "Curso Google Ads Avanzado",
  "status": "active",
  "created_date": "2026-02-09",
  "total_videos": 40,
  "completed_videos": 3,
  "current_module": 1,
  "modules": [
    {
      "id": 1,
      "name": "Fundamentos",
      "total_videos": 10,
      "completed_videos": 3,
      "status": "doing"
    },
    {
      "id": 2,
      "name": "Estrategias Avanzadas",
      "total_videos": 10,
      "completed_videos": 0,
      "status": "blocked"
    }
  ],
  "milestones": [
    {
      "name": "Estructura definida",
      "completed": true,
      "date": "2026-02-09"
    },
    {
      "name": "Módulo 1 completo",
      "completed": false,
      "target_date": "2026-03-15"
    }
  ]
}
```

## Notas importantes
- Este skill es SOLO lectura. No modifica proyectos.
- Sirve para motivar y dar perspectiva del progreso.
- Si un proyecto lleva >4 semanas sin avanzar, el Coach sugiere pausarlo o eliminarlo.
