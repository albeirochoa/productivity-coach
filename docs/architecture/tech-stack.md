# 🛠️ Stack Tecnológico

**Última actualización:** 2026-02-09

---

## 🎯 Contexto

El **Productivity Coach** está construido con tecnologías modernas pero simples:
- Sin bases de datos externas (usa JSON local).
- Sin frameworks pesados (React ligero).
- Sin backend complejo (Express mínimo).

**Filosofía:** Keep it simple, keep it fast.

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                   CLAUDE CODE CLI                        │
│                  (Entrenador IA)                         │
│  - Ejecuta skills (checkin, review, capture, etc.)      │
│  - Lee/Escribe coach-data.json, coach-memory.json       │
└───────────────┬─────────────────────────────────────────┘
                │
                │ Modifica archivos JSON locales
                ▼
┌─────────────────────────────────────────────────────────┐
│              PERSISTENCIA LOCAL (JSON)                   │
│  - coach-data.json                                       │
│  - coach-memory.json                                     │
│  - profile.json                                          │
│  - backlog/*.json                                        │
└───────────────┬─────────────────────────────────────────┘
                │
                │ Express API lee JSON
                ▼
┌─────────────────────────────────────────────────────────┐
│         EXPRESS SERVER (Backend API)                     │
│  - Puerto: 3000                                          │
│  - Endpoints: /api/data, /api/update                     │
│  - CORS habilitado para localhost:5173                   │
└───────────────┬─────────────────────────────────────────┘
                │
                │ HTTP Requests
                ▼
┌─────────────────────────────────────────────────────────┐
│    REACT + VITE (Frontend Dashboard)                     │
│  - Puerto: 5173                                          │
│  - Tailwind CSS + Glassmorphism                          │
│  - Framer Motion (animaciones)                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend Stack

### React 19

**Por qué React:**
- Componentes reutilizables.
- Ecosistema maduro.
- Fácil integración con Vite.

**Versión:** `^19.0.0`

**Principales librerías:**
- `react-dom`: Renderizado.
- `react-router-dom`: Navegación (si se implementa multi-página).

---

### Vite

**Por qué Vite:**
- Hot Module Replacement (HMR) instantáneo.
- Build rápido con Rollup.
- Sin configuración compleja.

**Puerto de desarrollo:** `5173`

**Scripts disponibles:**
```bash
npm run dev      # Inicia servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
```

---

### Tailwind CSS v3

**Por qué Tailwind:**
- Utility-first (sin CSS manual).
- Premium aesthetic con glassmorphism.
- Fácil personalización de temas.

**Versión:** `^3.4.1`

**Configuración especial:**
- [tailwind.config.js](../../web/tailwind.config.js)
- Glassmorphism: `backdrop-blur-md`, `bg-white/10`.
- Colores personalizados: `bg-gradient-to-br from-purple-500 to-pink-500`.

**⚠️ Importante:**
- Usar **v3**, no v4 (incompatibilidades con el setup actual).

---

### Framer Motion

**Por qué Framer Motion:**
- Animaciones fluidas y declarativas.
- Integración nativa con React.
- Performance optimizado.

**Versión:** `^11.11.17`

**Uso típico:**
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

---

### Lucide React

**Por qué Lucide:**
- Iconos modernos y minimalistas.
- Tree-shakeable (solo importa lo que usas).
- Consistencia visual.

**Versión:** `^0.468.0`

**Iconos principales:**
- `CheckCircle2`: Tareas completadas.
- `Clock`: Tiempo / Plazos.
- `TrendingUp`: Stats y progreso.
- `Calendar`: Semanas.
- `Flame`: Racha.

---

## 🔧 Backend Stack

### Node.js + Express

**Por qué Express:**
- Mínimo overhead.
- Solo 2 endpoints necesarios.
- Sin ORM ni base de datos compleja.

**Puerto:** `3000`

**Endpoints disponibles:**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/data` | GET | Devuelve `coach-data.json` completo |
| `/api/update` | POST | Actualiza `coach-data.json` (marcar completado) |

**Estructura del servidor:**
```
web/
├── server.js               # Express server
├── package.json            # Dependencias
└── node_modules/           # Dependencias instaladas
```

**CORS configurado:**
```js
app.use(cors({
  origin: 'http://localhost:5173' // Permite Vite dev server
}));
```

---

### Persistencia: Filesystem (JSON)

**Por qué JSON local:**
- Sin instalación de bases de datos.
- Fácil debug (abrir archivo y ver).
- Portable (todo el sistema es un directorio).

**Archivos críticos:**
- `coach-data.json`: Estado actual y histórico.
- `coach-memory.json`: Cerebro del coach.
- `profile.json`: Perfil del usuario.
- `backlog/*.json`: Mega-proyectos.

**⚠️ Limitaciones:**
- No es escalable para múltiples usuarios.
- No hay backups automáticos (recomendado: git).
- Escritura concurrente no soportada.

---

## 📦 Dependencias Clave

### Frontend (`web/package.json`)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^11.11.17",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "vite": "^6.0.3",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.17.0"
  }
}
```

---

### Backend (`web/server.js`)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

---

## 🚀 Flujo de Desarrollo

### 1. Iniciar el Sistema

```bash
# Terminal 1: Backend (Express)
cd web
node server.js
# → http://localhost:3000

# Terminal 2: Frontend (Vite)
cd web
npm run dev
# → http://localhost:5173
```

---

### 2. Flujo de Datos

```
Usuario → Dashboard (React) → Fetch API
                                  ↓
                             Express Server
                                  ↓
                          Lee coach-data.json
                                  ↓
                          Devuelve JSON
                                  ↓
                       React actualiza UI
```

**Ejemplo de fetch:**
```js
const response = await fetch('http://localhost:3000/api/data');
const data = await response.json();
console.log(data.current_week.commitments);
```

---

### 3. Modificar Datos

**Opción A: Desde CLI (Claude Code)**
```bash
claude code checkin  # Modifica coach-data.json directamente
```

**Opción B: Desde Dashboard (React)**
```js
await fetch('http://localhost:3000/api/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    commitmentId: '2026-W07-1',
    completed: true
  })
});
```

---

## 🎨 Diseño Visual: "Momentum Dashboard"

### Glassmorphism

**Concepto:** Tarjetas semi-transparentes con blur y sombras suaves.

**Clases Tailwind típicas:**
```css
bg-white/10          /* Fondo blanco al 10% */
backdrop-blur-md     /* Blur del fondo */
border border-white/20  /* Borde sutil */
shadow-xl            /* Sombra profunda */
```

**Ejemplo de tarjeta:**
```jsx
<div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl p-6">
  <h2 className="text-white font-bold text-xl">Semana Actual</h2>
  {/* Contenido */}
</div>
```

---

### Paleta de Colores

**Gradiente principal:**
```css
bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400
```

**Estados:**
- ✅ **Completado:** `text-green-400`, `bg-green-500/20`
- ⏳ **Pendiente:** `text-gray-300`, `bg-gray-500/10`
- 🔥 **Racha:** `text-orange-400`, `bg-orange-500/20`

---

### Tipografía

**Fuentes:**
- `font-sans`: Sistema default (Inter, SF Pro, Segoe UI).
- `font-bold`: Títulos y números grandes.
- `font-medium`: Textos normales.

**Tamaños típicos:**
- `text-4xl font-bold`: Números grandes (racha, stats).
- `text-xl font-medium`: Títulos de sección.
- `text-base`: Texto normal.

---

## 🔌 Puertos y URLs

| Servicio | Puerto | URL |
|----------|--------|-----|
| Express API | 3000 | http://localhost:3000 |
| Vite Dev Server | 5173 | http://localhost:5173 |
| React Build (preview) | 4173 | http://localhost:4173 |

**⚠️ Problemas comunes:**
- Si puerto 3000 ocupado: cambiar en `server.js` (línea `app.listen(3000)`).
- Si puerto 5173 ocupado: Vite asignará automáticamente otro puerto.

---

## 🐛 Troubleshooting Técnico

### Error: `Cannot find module 'express'`

**Solución:**
```bash
cd web
npm install
```

---

### Error: Tailwind CSS no aplica estilos

**Verificar:**
1. [tailwind.config.js](../../web/tailwind.config.js) tiene `content: ['./index.html', './src/**/*.{js,jsx}']`.
2. [postcss.config.js](../../web/postcss.config.js) existe.
3. [src/index.css](../../web/src/index.css) tiene `@tailwind base; @tailwind components; @tailwind utilities;`.

---

### Error: CORS Policy

**Síntoma:** Fetch desde React falla con error CORS.

**Solución:**
- Verificar que `server.js` tiene:
```js
app.use(cors({
  origin: 'http://localhost:5173'
}));
```

---

### Error: Puerto 3000 ocupado

**Solución:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

---

## 📚 Recursos Externos

### Documentación Oficial

- **React:** https://react.dev/
- **Vite:** https://vitejs.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **Framer Motion:** https://www.framer.com/motion/
- **Express:** https://expressjs.com/
- **Lucide Icons:** https://lucide.dev/

---

### Guías Relacionadas

- [Arquitectura General](./README.md)
- [Esquema de Datos](./data-schema.md)
- [Componentes Web](../web-app/components.md)
- [Troubleshooting](../troubleshooting/README.md)

---

*"Stack simple, desarrollo rápido, UX premium."*
