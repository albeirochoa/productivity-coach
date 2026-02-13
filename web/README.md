# Web App - Productivity Coach

Dashboard web para gestionar tareas, proyectos e inbox unificados en el sistema de productividad.

## 🏗️ Arquitectura

### Stack
- **Frontend:** React 19 + Vite
- **Styling:** Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express
- **Storage:** JSON en filesystem (`tasks-data.json`)
- **Icons:** Lucide React

### Estructura de Carpetas
```
web/
├── src/
│   ├── App.jsx          # Componente principal (1386 líneas)
│   ├── index.css        # Estilos globales
│   └── main.jsx         # Entry point
├── lib/
│   ├── migrate-to-unified.js  # Script de migración de datos
│   └── templates.js           # Plantillas de proyectos predefinidas
├── server.js            # Backend Express (API REST)
└── package.json
```

## 📋 Funciones Principales

### State Management
| Estado | Tipo | Propósito |
|--------|------|----------|
| `tasks` | Array | Todas las tareas (simple + projects) |
| `inbox` | Object | Ideas sin procesar por categoría |
| `activeView` | String | Vista actual (dashboard/inbox/projects/stats) |
| `showProjectWizard` | Boolean | Control modal asistente de proyectos |
| `generatedMilestones` | Array | Pasos del proyecto en edición |
| `projectForm` | Object | Datos del formulario de proyecto |
| `chatMessages` | Array | Historial con el coach |

### Handlers de Tareas

#### `toggleTask(id)`
Marca una tarea como completada/incompleta.
```javascript
await axios.patch(`${API_URL}/tasks/${id}/toggle`);
```

#### `toggleMilestone(projectId, milestoneId, completed)`
Marca un paso del proyecto como completado.
```javascript
await axios.patch(`${API_URL}/tasks/${projectId}/milestones/${milestoneId}`, { completed });
```

#### `commitProjectToWeek(projectId)`
Añade el próximo paso del proyecto a "Esta Semana".
```javascript
await axios.post(`${API_URL}/tasks/${projectId}/commit-milestone`);
```

#### `removeFromWeek(taskId)`
Desvincula una tarea de "Esta Semana".
```javascript
await axios.patch(`${API_URL}/tasks/${taskId}`, { thisWeek: false });
```

### Handlers de Inbox

#### `handleCapture(e)`
**Propósito:** Guardar una nueva idea en el inbox.

**Parámetros:**
- `e` (Event) - Form submit event

**Flow:**
1. Valida texto no vacío
2. POST a `/api/inbox` con texto y tipo (work/personal)
3. Limpia formulario y cierra modal
4. Recarga datos

#### `handleProcessInboxItem(item, type, options)`
**Propósito:** Convertir idea del inbox en tarea simple o proyecto.

**Parámetros:**
- `item` (Object) - Item del inbox
- `type` (String) - 'work' o 'personal'
- `options` (Object) - `{ taskType: 'simple'|'project', thisWeek: boolean, category: string }`

**Flow:**
1. POST a `/api/inbox/{type}/{id}/process`
2. Si es proyecto, abre wizard con el título pre-llenado
3. Si es tarea simple, crea directamente

#### `handleDeleteInboxItem(id, type)`
Elimina una idea del inbox con confirmación.

#### `handleEditInboxItem(item, type)`
Abre modal para editar texto de idea.

#### `handleSaveInboxEdit()`
Guarda cambios en idea editada.

#### `handleAddQuickTask(text, category)`
Crea una tarea simple directamente a "Esta Semana".

### Handlers del Asistente de Proyectos

#### `handleGenerateSteps(useAI = false)`
**Propósito:** Generar pasos del proyecto usando plantilla o IA.

**Parámetros:**
- `useAI` (Boolean) - true = usar IA, false = usar plantilla

**Flow:**
1. POST a `/api/projects/analyze` con:
   - title, description, category, strategy
   - templateId (si existe)
   - useAI flag
2. Recibe array de milestones generados
3. Avanza a paso 2 del wizard

#### `handleUseTemplate()`
**Propósito:** Usar plantilla seleccionada sin necesidad de IA.

Llama a `handleGenerateSteps(false)`.

#### `handleCreateProject()`
**Propósito:** Guardar el proyecto en la base de datos.

**Flow:**
1. Valida que milestones estén generados
2. POST a `/api/projects` con:
   - title, description, category, strategy
   - milestones array
3. Cierra wizard y recarga datos

#### `handleDeleteMilestone(idx)`
Elimina un paso (mínimo 1 paso debe quedar).

#### `handleAddMilestone()`
Añade un nuevo paso con valores por defecto.

#### `handleReorderMilestone(fromIdx, direction)`
**Propósito:** Mover paso arriba/abajo con validación de límites.

#### `handleUpdateMilestone(idx, field, value)`
**Propósito:** Editar propiedad de un paso (title, description, time_estimate).

### Handler de Chat

#### `handleSendMessage(e)`
**Propósito:** Enviar mensaje al coach y procesar respuestas.

**Flow:**
1. Agrega mensaje del usuario al historial
2. POST a `/api/chat` con el mensaje
3. Recibe respuesta del coach
4. Si hay `action: 'refresh_inbox'`, recarga datos

## 🎨 Vistas Principales

### Dashboard (Predeterminada)
- **Esta Semana:** Grid de tareas simples + milestones activos
- **Tareas Completadas:** Con opción "Deshacer"
- **Proyectos Activos:** Resumen de progreso con botón "Añadir a esta semana"
- **Captura Rápida:** Botón flotante para nuevas ideas

### Inbox View
- Columnas separadas: Trabajo vs Personal
- Acciones por idea:
  - "Esta semana" → crea tarea simple
  - "Trozar" → abre wizard de proyecto
  - Editar/Borrar
- Contador de ideas pendientes

### Projects View
- Listado de todos los proyectos
- Barra de progreso por proyecto
- Checklist de milestones con toggle de completado
- Indicador de "próximo" milestone
- Botón "Añadir próximo paso a esta semana"

### Sidebar
- Navegación entre vistas
- Resumen rápido: tareas, completadas, proyectos, inbox
- Badge con contador en cada sección

## 🔄 API Endpoints

### Tasks
```
GET    /api/tasks              # Todas las tareas
GET    /api/tasks/this-week    # Solo Esta Semana
GET    /api/tasks/projects     # Solo proyectos
POST   /api/tasks              # Crear tarea
PATCH  /api/tasks/:id          # Actualizar tarea
PATCH  /api/tasks/:id/toggle   # Toggle completado
PATCH  /api/tasks/:id/milestones/:mid  # Toggle milestone
POST   /api/tasks/:id/commit-milestone # Añadir a Esta Semana
DELETE /api/tasks/:id          # Eliminar tarea
```

### Inbox
```
GET    /api/inbox              # Todas las ideas
POST   /api/inbox              # Capturar nueva idea
PATCH  /api/inbox/:type/:id    # Editar idea
DELETE /api/inbox/:type/:id    # Borrar idea
POST   /api/inbox/:type/:id/process  # Convertir a tarea
```

### Projects
```
POST   /api/projects           # Crear proyecto
POST   /api/projects/analyze   # Generar pasos (IA o plantilla)
GET    /api/projects           # Listar proyectos (legacy)
PATCH  /api/projects/:id       # Actualizar proyecto (legacy)
```

### Other
```
GET    /api/stats              # Estadísticas
GET    /api/profile            # Perfil del usuario
GET    /api/chat               # Iniciar chat
POST   /api/chat               # Enviar mensaje
```

## 🚀 Desarrollo

```bash
# Instalar dependencias
npm install

# Dev server (frontend + backend)
npm run dev

# Build
npm build

# Preview
npm preview
```

### Variables de Entorno
El backend espera:
- `NODE_ENV` (default: 'development')
- `API_PORT` (default: 3000)
- `API_URL` en frontend (default: 'http://localhost:3000/api')

## 📊 Data Model

### Task
```javascript
{
  id: string,
  title: string,
  description?: string,
  type: 'simple' | 'project',
  status: 'active' | 'done',
  thisWeek: boolean,           // En "Esta Semana"?
  weekCommitted?: string,      // Ej: "2026-W07"
  category: string,            // 'trabajo', 'contenido', etc
  strategy?: 'goteo' | 'batching',

  // Solo para projects
  milestones?: Array<{
    id: string,
    title: string,
    description: string,
    timeEstimate: number,      // minutos
    completed: boolean,
    completedAt?: ISO8601
  }>,
  currentMilestone: number,    // Índice del próximo

  // Metadata
  createdAt: ISO8601,
  completedAt?: ISO8601,
  migratedFrom?: {
    type: 'commitment' | 'project',
    originalId: string
  }
}
```

### Inbox Item
```javascript
{
  id: string,
  text: string,
  type: 'work' | 'personal',
  date: ISO8601
}
```

## ⚠️ Notas Importantes

1. **Unificación de Datos:** Sistema migrado de 3 archivos (coach-data.json, proyectos separados) a `tasks-data.json` centralizado.

2. **Plantillas:** Definidas en `lib/templates.js` por `category:type` (ej: `contenido:video`).

3. **Validaciones:**
   - Proyectos requieren al menos 1 milestone
   - Tareas simples no pueden tener milestones
   - thisWeek solo para tareas con status='active'

4. **Errores:** Todos usan `alert()` - considerar upgrading a toasts en futuro.

5. **Performance:** `fetchData()` hace 4 requests en paralelo - OK para app pequeña, considerar singleAPI call después.

## 🔮 Mejoras Futuras

- [ ] Toast notifications en lugar de alerts
- [ ] Optimistic updates (no esperar servidor)
- [ ] Drag & drop para reordenar milestones
- [ ] Filtros avanzados (por categoría, semana, etc)
- [ ] Export/backup de datos
- [ ] Sincronización en tiempo real (WebSockets)
- [ ] PWA (offline support)
