# 🖥️ Aplicación Web: Momentum Dashboard

**Última actualización:** 2026-02-09

---

## 🎯 Contexto

El **Momentum Dashboard** es la interfaz visual del Productivity Coach. Permite:
1. Ver compromisos de la semana actual.
2. Marcar tareas completadas.
3. Visualizar racha y estadísticas.
4. Capturar ideas rápidas.
5. Chatear con el coach (futuro).

**Diseño:** Premium glassmorphism con animaciones fluidas.

---

## 🏗️ Arquitectura

```
┌────────────────────────────────────────────────────┐
│            React (Frontend - Puerto 5173)           │
│  ┌──────────────────────────────────────────────┐  │
│  │  App.jsx (Main Component)                     │  │
│  │  ├── CommitmentCard.jsx                       │  │
│  │  ├── StatsPanel.jsx                           │  │
│  │  ├── InboxWidget.jsx                          │  │
│  │  └── ChatBot.jsx                              │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│              Fetch API Calls                        │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  Express Server (Backend - Puerto 3000)      │  │
│  │  ├── GET /api/commitments/current            │  │
│  │  ├── PATCH /api/commitments/:id              │  │
│  │  ├── GET /api/stats                          │  │
│  │  ├── GET /api/inbox                          │  │
│  │  ├── POST /api/inbox                         │  │
│  │  ├── GET /api/projects                       │  │
│  │  └── POST /api/chat                          │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│           coach-data.json (Persistencia)            │
└────────────────────────────────────────────────────┘
```

---

## 🚀 Cómo Iniciar

### 1. Instalar Dependencias

```bash
cd web
npm install
```

---

### 2. Iniciar Backend (Express)

```bash
# Terminal 1
cd web
node server.js
```

**Salida esperada:**
```
Server running on http://localhost:3000
```

---

### 3. Iniciar Frontend (Vite)

```bash
# Terminal 2
cd web
npm run dev
```

**Salida esperada:**
```
  VITE v6.0.3  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### 4. Abrir en Navegador

Navega a: **http://localhost:5173/**

---

## 📱 Arquitectura de Componentes

### Estructura Actual

**Todo el frontend está en un solo archivo:** [src/App.jsx](../../web/src/App.jsx)

**Razón:** Simplicidad inicial. El proyecto es de un solo usuario, sin necesidad de componentes reutilizables aún.

**Estado global (hooks):**
```jsx
const [commitments, setCommitments] = useState([]);
const [stats, setStats] = useState({});
const [profile, setProfile] = useState({});
const [inbox, setInbox] = useState({ work: [], personal: [] });
const [projects, setProjects] = useState([]);
const [activeView, setActiveView] = useState('dashboard');
const [showChat, setShowChat] = useState(false);
const [showWizard, setShowWizard] = useState(false);
```

---

## 🧩 Secciones del Dashboard

### 1. Vista Principal (`activeView: 'dashboard'`)

**Muestra:**
- Lista de compromisos de la semana actual
- Stats panel (racha, completion rate)
- Botón de chat flotante
- Botón de wizard de check-in

**Función de toggle:**
```jsx
const toggleCommitment = async (id, currentStatus) => {
  await axios.patch(`${API_URL}/commitments/${id}`, {
    completed: !currentStatus
  });
  fetchData();
};
```

---

### 2. Stats Panel

**Contenido:**
- `current_streak`: Racha actual 🔥
- `best_streak`: Mejor racha histórica
- `total_completed`: Total de tareas completadas
- `completion_rate`: Porcentaje mensual

**Animaciones:**
- Framer Motion para números que crecen
- Iconos de Lucide React (`Flame`, `Target`, `TrendingUp`)

---

### 3. Wizard de Check-in (`showWizard: true`)

**Flujo:**
1. **Paso 1:** Seleccionar tareas sugeridas del inbox
2. **Paso 2:** Añadir tareas personalizadas (hasta 6 total)
3. **Paso 3:** Confirmar y enviar a `/api/commitments/bulk`

**Función de finalización:**
```jsx
const handleFinishWizard = async () => {
  const finalCommitments = selectedTasks
    .concat(customTasks.filter(t => t.text.trim() !== ''));

  await axios.post(`${API_URL}/commitments/bulk`, {
    commitments: finalCommitments
  });

  fetchData();
  setShowWizard(false);
};
```

---

### 4. Chat Interactivo (`showChat: true`)

**Estado:**
```jsx
const [chatMessages, setChatMessages] = useState([
  { role: 'coach', text: '¡Hola Albeiro! Soy tu Coach de Momentum. ⚡' }
]);
```

**Función de envío:**
```jsx
const handleSendMessage = async (e) => {
  e.preventDefault();
  const userMsg = { role: 'user', text: chatInput };
  setChatMessages(prev => [...prev, userMsg]);

  const res = await axios.post(`${API_URL}/chat`, { message: chatInput });
  setChatMessages(prev => [...prev, {
    role: 'coach',
    text: res.data.response
  }]);

  if (res.data.action === 'refresh_inbox') {
    fetchData();
  }
};
```

---

### 5. Inbox Widget

**Muestra:**
- Ideas capturadas en `inbox.work` e `inbox.personal`
- Contador de ideas (máx 10 por categoría)
- Botón para capturar nueva idea

**Modal de captura:**
```jsx
const [showCapture, setShowCapture] = useState(false);
const [captureText, setCaptureText] = useState('');
const [captureType, setCaptureType] = useState('work');
```

---

## 🎨 Diseño Visual

### Glassmorphism

**Concepto:** Tarjetas semi-transparentes con blur y bordes sutiles.

**Clases Tailwind:**
```css
bg-white/10              /* Fondo blanco al 10% */
backdrop-blur-md         /* Blur del contenido detrás */
border border-white/20   /* Borde sutil */
shadow-xl                /* Sombra profunda */
rounded-xl               /* Bordes redondeados */
```

**Ejemplo completo:**
```jsx
<div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl p-6 hover:bg-white/20 transition-all">
  <h2 className="text-white font-bold text-xl">Título</h2>
  <p className="text-white/80">Contenido</p>
</div>
```

---

### Paleta de Colores

**Gradiente de fondo:**
```css
bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400
```

**Estados de compromisos:**
- ✅ **Completado:** `text-green-400`, `bg-green-500/20`
- ⏳ **Pendiente:** `text-gray-300`, `bg-gray-500/10`

**Estados de racha:**
- 🔥 **Activa:** `text-orange-400`, `bg-orange-500/20`
- ❄️ **Rota:** `text-blue-300`, `bg-blue-500/10`

---

### Tipografía

**Fuente:** Sistema default (Inter, SF Pro, Segoe UI)

**Tamaños:**
- `text-4xl font-bold`: Números grandes (racha, stats).
- `text-2xl font-bold`: Títulos de sección.
- `text-xl font-medium`: Sub-títulos.
- `text-base`: Texto normal.

**Ejemplo:**
```jsx
<h1 className="text-4xl font-bold text-white mb-4">
  Racha: {currentStreak} 🔥
</h1>
```

---

### Animaciones con Framer Motion

**Fade In + Slide Up:**
```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {/* Contenido */}
</motion.div>
```

**Stagger Children (lista animada):**
```jsx
<motion.div
  variants={{
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }}
  initial="hidden"
  animate="show"
>
  {commitments.map(c => (
    <motion.div
      key={c.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
    >
      <CommitmentCard commitment={c} />
    </motion.div>
  ))}
</motion.div>
```

---

### Iconos con Lucide

**Importar:**
```jsx
import { CheckCircle2, Clock, TrendingUp, Calendar, Flame } from 'lucide-react';
```

**Uso:**
```jsx
<CheckCircle2 className="w-6 h-6 text-green-400" />
<Clock className="w-5 h-5 text-gray-300" />
<Flame className="w-8 h-8 text-orange-400" />
```

---

## 🔌 API Endpoints

Ver documentación completa en: [API Reference](./api-reference.md)

**Resumen rápido:**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/commitments/current` | GET | Obtener compromisos de la semana actual |
| `/api/commitments/:id` | PATCH | Marcar compromiso como completado |
| `/api/stats` | GET | Obtener estadísticas (racha, totales) |
| `/api/inbox` | GET | Obtener ideas del inbox |
| `/api/inbox` | POST | Añadir nueva idea al inbox |
| `/api/projects` | GET | Obtener mega-proyectos del backlog |
| `/api/profile` | GET | Obtener perfil del usuario |
| `/api/chat` | POST | Enviar mensaje al chatbot |

---

## 🛠️ Flujo de Desarrollo

### 1. Modificar el Dashboard

**Todo el código está en:** [src/App.jsx](../../web/src/App.jsx)

**Para añadir una nueva funcionalidad:**

1. **Añadir estado si es necesario:**
```jsx
const [showNewFeature, setShowNewFeature] = useState(false);
```

2. **Añadir función de manejo:**
```jsx
const handleNewFeature = async () => {
  // Lógica aquí
  await axios.post(`${API_URL}/nueva-ruta`, { data });
  fetchData();
};
```

3. **Añadir UI en el return:**
```jsx
{showNewFeature && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    {/* Tu nuevo componente inline */}
  </motion.div>
)}
```

---

### 2. Refactorizar a Componentes Separados (Futuro)

**Cuando el archivo App.jsx crezca demasiado** (>1000 líneas), considera extraer:

- `src/components/CommitmentCard.jsx`
- `src/components/StatsPanel.jsx`
- `src/components/InboxWidget.jsx`
- `src/components/ChatBot.jsx`
- `src/components/CheckinWizard.jsx`

**Ejemplo de extracción:**
```jsx
// src/components/StatsPanel.jsx
export function StatsPanel({ stats }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
      <h2>Racha: {stats.current_streak} 🔥</h2>
    </div>
  );
}

// src/App.jsx
import { StatsPanel } from './components/StatsPanel';
```

---

### 3. Conectar con API (Usando Axios)

**El proyecto usa Axios en lugar de fetch nativo.**

**Configuración:**
```jsx
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
```

**Ejemplo 1: Marcar compromiso completado**
```jsx
const toggleCommitment = async (id, currentStatus) => {
  try {
    await axios.patch(`${API_URL}/commitments/${id}`, {
      completed: !currentStatus
    });
    fetchData(); // Recargar todos los datos
  } catch (error) {
    console.error('Error toggling commitment:', error);
  }
};
```

**Ejemplo 2: Crear compromisos en bulk (wizard)**
```jsx
const handleFinishWizard = async () => {
  const finalCommitments = selectedTasks.map(t => ({
    text: t.text,
    category: t.category
  }));

  try {
    await axios.post(`${API_URL}/commitments/bulk`, {
      commitments: finalCommitments
    });
    fetchData();
    setShowWizard(false);
  } catch (error) {
    console.error('Error creating commitments:', error);
  }
};
```

**Ejemplo 3: Cargar datos al inicio**
```jsx
const fetchData = async () => {
  try {
    const [commRes, statsRes, profRes, inboxRes, projectsRes] = await Promise.all([
      axios.get(`${API_URL}/commitments/current`),
      axios.get(`${API_URL}/stats`),
      axios.get(`${API_URL}/profile`),
      axios.get(`${API_URL}/inbox`),
      axios.get(`${API_URL}/projects`)
    ]);

    setCommitments(commRes.data.commitments || []);
    setStats(statsRes.data);
    setProfile(profRes.data);
    setInbox(inboxRes.data);
    setProjects(projectsRes.data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};
```

---

### 4. Añadir Animación

**Ejemplo: Hover effect en tarjeta**

```jsx
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="bg-white/10 backdrop-blur-md rounded-xl p-6 cursor-pointer"
>
  {/* Contenido */}
</motion.div>
```

---

## 🐛 Troubleshooting

### Error: `Failed to fetch`

**Síntoma:** La app no puede conectarse a la API.

**Solución:**
1. Verificar que el servidor Express está corriendo (`node server.js`).
2. Verificar que CORS está habilitado en `server.js`.
3. Verificar que la URL es `http://localhost:3000`.

---

### Error: Tailwind CSS no aplica estilos

**Síntoma:** Los estilos no se aplican en el navegador.

**Solución:**
1. Verificar que `tailwind.config.js` tiene:
```js
content: ['./index.html', './src/**/*.{js,jsx}']
```
2. Verificar que `src/index.css` tiene:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
3. Reiniciar servidor Vite (`npm run dev`).

---

### Error: `Cannot read property 'map' of undefined`

**Síntoma:** Error al renderizar lista de compromisos.

**Solución:**
- Inicializar estado con array vacío:
```jsx
const [commitments, setCommitments] = useState([]);
```
- Añadir verificación antes de mapear:
```jsx
{commitments && commitments.map(c => <CommitmentCard key={c.id} commitment={c} />)}
```

---

## 📦 Build de Producción

### 1. Generar Build

```bash
cd web
npm run build
```

**Salida:**
```
dist/
├── index.html
├── assets/
│   ├── index-abc123.js
│   └── index-def456.css
```

---

### 2. Preview del Build

```bash
npm run preview
```

**URL:** http://localhost:4173/

---

### 3. Deployment (Futuro)

**Opciones:**
- **Vercel:** `npm i -g vercel && vercel`
- **Netlify:** Drag & drop de la carpeta `dist/`
- **Local:** Servir con `npx serve dist`

**⚠️ Nota:** El backend Express debe estar corriendo también.

---

## 🔗 Referencias

- [Componentes Detallados](./components.md)
- [API Reference](./api-reference.md)
- [Tech Stack](../architecture/tech-stack.md)
- [Troubleshooting](../troubleshooting/README.md)

---

*"Dashboard premium, UX fluida, código simple."*
