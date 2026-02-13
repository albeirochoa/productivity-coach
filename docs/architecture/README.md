# 🏗️ Arquitectura y Filosofía

Este sistema no es solo una "To-Do List". Es un **entrenador** que te obliga a priorizar y te penaliza por la inacción.

## 🧠 La Filosofía de Albeiro

1.  **Eliminación Agresiva**: Si algo no se hace en varias semanas, el coach lo borra. No acumulamos basura.
2.  **Bloque de Oro (06:00 - 06:30)**: Tu momento de máxima energía. Las tareas más críticas deben ocurrir aquí.
3.  **Compromiso Limitado**: Máximo 6 compromisos por semana (uno por área de vida). Menos es más.
4.  **Acción sobre Planeación**: "Planear me aburre". El sistema debe permitir capturar ideas en segundos y decidir rápido.

## 📊 Estructura de Datos (The Single Source of Truth)

El sistema utiliza tres archivos JSON principales como base de datos:

### 1. `coach-data.json`
Contiene el estado actual de la semana y el histórico.
- `current_week`: Compromisos, fechas y estado de completado.
- `inbox`: Almacén temporal de ideas rápidas (máximo 10 por categoría).
- `stats`: Rachas, totales y tasas de cumplimiento.

### 2. `coach-memory.json`
El "cerebro" del coach.
- `patterns_detected`: Comportamientos que el coach nota (ej: "Albeiro rinde más los martes").
- `insights`: Notas sobre tus preferencias y debilidades.
- `daily_checkins`: Registro de cómo te sentiste cada día.

### 3. `profile.json`
Quién eres y cómo trabajas.
- `life_areas`: Tus 6 áreas de enfoque (Familia, Salud, Trabajo, Clientes, Contenido, Aprender).
- `work_patterns`: Tu Bloque de Oro y niveles de energía.

## 🛠️ Stack Tecnológico

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/).
- **Estilos**: [Tailwind CSS v3](https://tailwindcss.com/) (con Glassmorphism).
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/).
- **Iconos**: [Lucide React](https://lucide.dev/).
- **Backend / API**: [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/).
- **Persistencia**: Sistema de archivos local (JSON).
