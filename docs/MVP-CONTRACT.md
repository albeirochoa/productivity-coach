# 📋 MVP Contract - Productivity Coach v1.0

**Fecha**: 2026-02-11
**Versión**: 1.0 DRAFT
**Status**: 📝 En definición

---

## 🎯 Definición del MVP

El **Minimum Viable Product (MVP)** del Productivity Coach es un sistema funcional de gestión de tareas y proyectos con capacidad de planificación semanal, procesamiento de inbox y seguimiento de progreso.

### Alcance del MVP v1.0

**Lo que SÍ hace el MVP**:
- ✅ Capturar ideas rápidamente (inbox)
- ✅ Procesar inbox y convertir a tareas
- ✅ Crear tareas simples y proyectos con milestones
- ✅ Comprometer tareas/milestones para "esta semana"
- ✅ Marcar tareas completadas y seguir progreso
- ✅ Ver estadísticas básicas (completadas, pendientes, streak)
- ✅ Organizar proyectos en jerarquías (proyectos hijos)
- ✅ Chat básico para captura rápida
- ✅ Persistencia confiable con backups automáticos

**Lo que NO hace el MVP** (Fuera de alcance):
- ❌ Time blocking (calendario con horarios específicos)
- ❌ Cálculo de capacidad diaria/semanal
- ❌ Sugerencias proactivas del coach (IA automática)
- ❌ OKRs / Objetivos estratégicos / Key Results
- ❌ Integración con calendarios externos (Google Cal, Outlook)
- ❌ Notificaciones push o recordatorios automáticos
- ❌ Multi-usuario o compartir proyectos
- ❌ Mobile app nativa
- ❌ Métricas avanzadas de productividad

---

## 🧑‍💼 Usuario Principal

**Nombre**: Albeiro (tú)
**Perfil**: Emprendedor digital con múltiples proyectos, necesita mantenerse organizado y cumplir compromisos semanales.

### Casos de Uso Diarios

#### 1. **Golden Hour (Mañana - 30 min)**
**Contexto**: Primera hora del día, planificación diaria

**Flujo**:
1. Abrir app → Vista "Esta Semana"
2. Ver tareas comprometidas para hoy
3. Procesar inbox si hay items pendientes
4. Marcar prioridades del día (mental, no en sistema)
5. Empezar a trabajar en primera tarea

**Éxito**: Sé exactamente qué hacer hoy sin indecisión

---

#### 2. **Captura Rápida (Durante el día - 10 seg)**
**Contexto**: Idea o tarea nueva que surge

**Flujo**:
1. Atajo de teclado `Q` o clic "Añadir tarea"
2. Escribir idea/tarea
3. Enviar (se guarda en inbox)
4. Continuar con trabajo actual

**Éxito**: Idea capturada sin romper flujo de trabajo

---

#### 3. **Check-in Semanal (Domingo - 15 min)**
**Contexto**: Planificación de la semana siguiente

**Flujo**:
1. Ver proyectos activos
2. Comprometer milestones específicos para la semana
3. Procesar inbox acumulado (convertir a tareas)
4. Ajustar prioridades

**Éxito**: Semana planificada con tareas claras y alcanzables

---

#### 4. **Procesamiento de Inbox (Variable - 5 min)**
**Contexto**: Convertir ideas capturadas en tareas accionables

**Flujo**:
1. Ir a vista "Inbox"
2. Para cada item:
   - Convertir a tarea simple
   - Convertir a proyecto (si es complejo)
   - Eliminar si ya no es relevante
3. Resultado: inbox vacío o casi vacío

**Éxito**: Inbox procesado, tareas organizadas

---

#### 5. **Completar Tarea (Durante el día - 2 seg)**
**Contexto**: Terminé una tarea

**Flujo**:
1. Clic en checkbox de tarea
2. Tarea marcada como completada
3. Ver siguiente tarea en la lista

**Éxito**: Progreso visible, motivación para continuar

---

## 📝 Checklist de Funcionalidad MVP

### Core Features (Obligatorias)

#### Inbox & Capture
- [x] Captura rápida desde cualquier vista (botón + shortcut `Q`)
- [x] Dos categorías: work, personal
- [x] Editar items de inbox antes de procesar
- [x] Convertir inbox → tarea simple
- [x] Convertir inbox → proyecto con IA
- [x] Eliminar items de inbox

#### Tareas Simples
- [x] Crear tarea con título + categoría
- [x] Marcar tarea como completada (toggle)
- [x] Eliminar tarea
- [x] Editar título y categoría
- [x] Comprometer tarea para "esta semana"
- [x] Ver tareas pendientes vs completadas

#### Proyectos
- [x] Crear proyecto con milestones
- [x] Analizar proyecto con IA (breakdownTask)
- [x] Agregar milestone a proyecto existente
- [x] Marcar milestone completado (toggle)
- [x] Comprometer milestone(s) específicos para la semana
- [x] Ver progreso del proyecto (N/M milestones)
- [x] Crear jerarquía de proyectos (proyecto hijo)
- [x] Secciones dentro de proyectos (agrupación de milestones)

#### Vista Semanal
- [x] Ver todas las tareas comprometidas para esta semana
- [x] Expandir proyectos en milestones individuales
- [x] Ver estimación de tiempo por milestone
- [x] Completar tareas/milestones desde vista semanal
- [x] Ver completadas en sección colapsable
- [x] Estado vacío con CTAs (ir a inbox, añadir tarea)

#### Estadísticas
- [x] Total de tareas completadas
- [x] Total de proyectos completados
- [x] Racha actual (días consecutivos)
- [x] Tareas pendientes esta semana

#### Chat
- [x] Capturar idea vía chat
- [x] Consultar estadísticas vía chat
- [x] Respuestas básicas del coach

#### Sistema
- [x] Persistencia en JSON (tasks-data.json, profile.json)
- [x] Backups automáticos diarios
- [x] Logs de errores
- [x] Validación de datos (Zod)
- [x] Healthcheck endpoint

### Nice to Have (Opcionales para MVP)

- [ ] Drag and drop para reordenar tareas
- [ ] Atajos de teclado adicionales (además de `Q`)
- [ ] Buscar tareas por título
- [ ] Filtrar tareas por categoría
- [ ] Modo oscuro/claro
- [ ] Exportar datos a JSON
- [ ] Importar datos desde JSON
- [ ] Perfil de usuario editable desde UI

---

## 🔧 Stack Técnico Congelado

**Backend**:
- Node.js 24.x
- Express 5.x
- Winston (logging)
- Zod (validación)
- OpenAI API (análisis de proyectos)

**Frontend**:
- React 19.x
- Vite 7.x
- Tailwind CSS 3.x
- Framer Motion 12.x (animaciones)
- Lucide React (iconos)
- DND Kit (drag and drop)
- Axios (HTTP client)

**Persistencia**:
- JSON files (tasks-data.json, profile.json)
- Backups automáticos en `backups/`

**Infraestructura**:
- Local development (localhost:3000)
- No deployment externo necesario para MVP

---

## 📊 API Contract (Congelado)

### Endpoints Críticos

#### Tasks
```
GET    /api/tasks                     # Listar todas
GET    /api/tasks/this-week           # Solo esta semana
POST   /api/tasks                     # Crear
PATCH  /api/tasks/:id                 # Actualizar
PATCH  /api/tasks/:id/toggle          # Toggle completado
DELETE /api/tasks/:id                 # Eliminar
```

#### Projects
```
POST   /api/projects/analyze          # Analizar con IA
POST   /api/projects/:id/milestones   # Agregar milestone
PATCH  /api/tasks/:id/milestones/:mid # Toggle milestone
POST   /api/tasks/:id/commit-milestone # Comprometer milestone
```

#### Inbox
```
GET    /api/inbox                     # Listar
POST   /api/inbox                     # Capturar
DELETE /api/inbox/:type/:id           # Eliminar
PATCH  /api/inbox/:type/:id           # Editar
POST   /api/inbox/:type/:id/process   # Procesar
```

#### Stats & Profile
```
GET    /api/stats                     # Estadísticas
GET    /api/profile                   # Perfil usuario
```

#### Chat
```
POST   /api/chat                      # Enviar mensaje
```

#### System
```
GET    /health                        # Healthcheck
POST   /api/backup/create             # Backup manual
GET    /api/backup/list               # Listar backups
```

**Regla**: Estos endpoints NO deben cambiar su firma o comportamiento sin migración explícita.

---

## 🎨 UI/UX Principles

### Design System
- **Glassmorphism**: Cards con backdrop-blur y transparencia
- **Colores**: Dark theme con accent cyan (`#00d4ff` - momentum)
- **Tipografía**: Inter font, monospace para código
- **Animaciones**: Framer Motion para transiciones suaves
- **Responsive**: Diseño mobile-first (aunque desktop es principal)

### Navegación
- Sidebar fijo con 4 vistas: Esta Semana, Inbox, Proyectos, Chat
- Shortcut `Q` para quick capture desde cualquier vista
- Breadcrumbs para jerarquía de proyectos

### Estados Vacíos
- Siempre mostrar CTA claro (ej: "Añadir tarea", "Ir a Inbox")
- Iconos grandes y texto explicativo
- Nunca dejar pantallas completamente vacías

---

## ⚠️ Límites y Restricciones

### Performance
- Máximo 500 tareas activas simultáneas
- Máximo 100 proyectos activos
- Respuesta de API < 200ms para endpoints críticos

### Data Size
- Título de tarea: máx 200 caracteres
- Descripción: máx 2000 caracteres
- Milestones por proyecto: máx 50
- Tiempo estimado por milestone: 1-480 minutos

### Browser Support
- Chrome 100+
- Edge 100+
- Firefox 100+
- Safari 15+ (no prioritario)

---

## ✅ Criterios de Éxito del MVP

### Funcionalidad
- [ ] Puedo capturar una idea en < 10 segundos
- [ ] Puedo planificar mi semana en < 15 minutos
- [ ] Puedo completar una tarea en < 3 clics
- [ ] El sistema NO pierde datos (backups funcionando)
- [ ] La UI responde inmediatamente (< 100ms perceived lag)

### Usabilidad
- [ ] Puedo usar la app SIN leer documentación
- [ ] Los errores son claros y accionables
- [ ] El sistema me guía hacia próxima acción (CTAs)
- [ ] Puedo deshacer acciones importantes (ej: completar tarea)

### Confiabilidad
- [ ] La app NO crashea durante uso normal
- [ ] Los datos persisten entre reinicios
- [ ] Los backups se crean automáticamente
- [ ] Los errores se loggean para debugging

### Productividad Personal
- [ ] Uso la app TODOS los días durante 1 semana
- [ ] Completo > 80% de tareas comprometidas para la semana
- [ ] El sistema me ahorra tiempo vs sistema anterior
- [ ] Me siento más organizado y menos estresado

---

## 🚫 Fuera de Alcance (Versión 2.0+)

Estas features NO son parte del MVP y NO deben implementarse:

1. **Time Blocking**: Asignar horarios específicos a tareas
2. **Capacity Planning**: Cálculo automático de carga de trabajo
3. **OKR System**: Objetivos y key results estratégicos
4. **Proactive Coach**: Sugerencias automáticas matutinas
5. **Calendar Integration**: Sync con Google Calendar
6. **Reminders**: Notificaciones programadas
7. **Multi-tenant**: Múltiples usuarios
8. **Mobile App**: App nativa iOS/Android
9. **Offline Mode**: Funcionamiento sin conexión
10. **Advanced Analytics**: Gráficos de productividad

**Razón**: Mantener scope pequeño, entregar valor rápido, iterar después.

---

## 📅 Timeline del MVP

| Fase | Duración Estimada | Status |
|------|-------------------|--------|
| **Fase 0**: Definición | 1 día | ✅ Completado |
| **Fase 1**: Estabilidad | 1 día | ✅ Completado |
| **Fase 2**: SQLite | 5 días | 🔜 Próxima |
| **Fase 3**: Capacity | 3 días | ⏳ Pendiente |
| **Fase 4-5**: Calendar | 7 días | ⏳ Pendiente |
| **Fase 10**: QA | 2 días | ⏳ Pendiente |

**Total Estimado**: ~3 semanas (20 días hábiles)
**Target MVP Release**: 2026-03-05

---

## 🔐 Data Contract

### tasks-data.json Schema (Congelado)

```json
{
  "tasks": [
    {
      "id": "string",
      "title": "string",
      "type": "simple|project",
      "status": "active|done|archived",
      "thisWeek": "boolean",
      "weekCommitted": "YYYY-Www|null",
      "category": "string",
      "dueDate": "ISO8601|null",
      "priority": "low|normal|high",
      "reminders": ["ISO8601"],
      "createdAt": "ISO8601",
      "completedAt": "ISO8601|null",

      // Solo para type: "project"
      "description": "string",
      "strategy": "goteo|batching|blitzing",
      "parentId": "string|null",
      "sections": [{ "id": "string", "name": "string" }],
      "milestones": [{
        "id": "string",
        "title": "string",
        "description": "string",
        "timeEstimate": "number",
        "completed": "boolean",
        "completedAt": "ISO8601|null",
        "sectionId": "string|null"
      }],
      "currentMilestone": "number",
      "committedMilestones": ["milestone-id"]
    }
  ],
  "inbox": {
    "work": [{ "id": "string", "text": "string", "date": "ISO8601" }],
    "personal": [{ "id": "string", "text": "string", "date": "ISO8601" }]
  },
  "stats": {
    "tasks_completed": "number",
    "projects_completed": "number",
    "current_streak": "number"
  }
}
```

**Regla**: Cambios a este schema requieren script de migración.

---

## 📝 Notas de Implementación

### Breaking Changes
- Cualquier cambio que rompa el contrato de API debe:
  1. Crear endpoint nuevo con versión (`/api/v2/...`)
  2. Deprecar endpoint antiguo con warning
  3. Mantener ambos funcionando por 1 semana mínimo
  4. Documentar migración en CHANGELOG.md

### Testing Strategy
- Smoke tests para endpoints críticos antes de deployment
- Manual testing de flujos principales (checkin, capture, complete)
- Validación de backups funcionando correctamente

### Rollback Plan
Si algo sale mal:
1. Detener servidor
2. Restaurar último backup: `backupManager.restore(...)`
3. Reiniciar servidor
4. Verificar `/health` endpoint
5. Documentar incidente en logs

---

**Status**: 📋 Contrato definido y congelado
**Próximo Paso**: Iniciar Fase 2 (Migración a SQLite)
