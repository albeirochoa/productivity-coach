# 🔧 Solución de Problemas

**Última actualización:** 2026-02-09

---

## 🎯 Contexto

Esta guía cubre los problemas más comunes al usar el Productivity Coach y cómo resolverlos.

---

## 🐛 Problemas Comunes

### 1. Puerto 3000 Ocupado

**Síntoma:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Causa:** Otro proceso está usando el puerto 3000.

**Solución (Windows):**
```bash
# Ver qué proceso usa el puerto
netstat -ano | findstr :3000

# Resultado ejemplo:
# TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345

# Matar el proceso (usando el PID del resultado anterior)
taskkill /PID 12345 /F
```

**Solución (macOS/Linux):**
```bash
# Ver qué proceso usa el puerto
lsof -ti:3000

# Matar el proceso
lsof -ti:3000 | xargs kill -9
```

**Alternativa:** Cambiar el puerto en [server.js](../../web/server.js):
```js
const PORT = 3001; // Cambiar de 3000 a 3001
```

---

### 2. Puerto 5173 Ocupado

**Síntoma:**
```
Port 5173 is in use, trying another one...
VITE v6.0.3  ready in 523 ms
➜  Local:   http://localhost:5174/
```

**Causa:** Otro servidor Vite está corriendo.

**Solución:**
- Vite automáticamente usa el siguiente puerto disponible (5174, 5175, etc.).
- Anota el nuevo puerto y úsalo en el navegador.

**Alternativa:** Especificar puerto en [vite.config.js](../../web/vite.config.js):
```js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180 // Puerto personalizado
  }
})
```

---

### 3. Tailwind CSS No Aplica Estilos

**Síntoma:** Los estilos no se ven en el navegador.

**Verificaciones:**

#### a) `tailwind.config.js` está configurado correctamente

[tailwind.config.js](../../web/tailwind.config.js) debe tener:
```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
}
```

---

#### b) `postcss.config.js` existe

[postcss.config.js](../../web/postcss.config.js) debe contener:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

---

#### c) `src/index.css` importa Tailwind

[src/index.css](../../web/src/index.css) debe tener:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

#### d) `src/main.jsx` importa `index.css`

[src/main.jsx](../../web/src/main.jsx) debe tener:
```jsx
import './index.css'
```

---

**Solución Final:** Reiniciar servidor Vite
```bash
# Ctrl+C para detener
npm run dev
```

---

### 4. Error: `Cannot find module 'express'`

**Síntoma:**
```
Error: Cannot find module 'express'
```

**Causa:** Dependencias no instaladas.

**Solución:**
```bash
cd web
npm install
```

---

### 5. CORS Policy Error

**Síntoma:**
```
Access to fetch at 'http://localhost:3000/api/data' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Causa:** CORS no habilitado en Express.

**Verificación en [server.js](../../web/server.js):**
```js
import cors from 'cors';

app.use(cors({
  origin: '*' // Permite todos los orígenes
}));
```

**Si no existe la línea `app.use(cors())`:**
1. Instalar CORS:
```bash
cd web
npm install cors
```

2. Importar y usar en `server.js`:
```js
import cors from 'cors';
app.use(cors());
```

---

### 6. Error: `coach-data.json` No Encontrado

**Síntoma:**
```
Error: Cannot read file coach-data.json
```

**Causa:** El servidor Express no encuentra el archivo.

**Verificación:**
- El servidor busca en: `../coach-data.json` (relativo a `web/server.js`).
- Verificar que existe en: `C:\proyectos\productivity-coach\coach-data.json`

**Solución:**
- Crear el archivo si no existe.
- Verificar la ruta en [server.js](../../web/server.js):
```js
const DATA_ROOT = path.join(__dirname, '..'); // Debe apuntar al directorio raíz
```

---

### 7. Fetch API No Devuelve Datos

**Síntoma:** El dashboard muestra vacío aunque el servidor está corriendo.

**Debug:**

#### a) Verificar que el servidor está corriendo
```bash
curl http://localhost:3000/api/commitments/current
```

Debe devolver JSON.

---

#### b) Verificar en DevTools del navegador

1. Abrir DevTools (F12).
2. Ir a la pestaña **Network**.
3. Recargar la página.
4. Ver si hay requests a `http://localhost:3000/api/`.

**Si no hay requests:**
- El frontend no está haciendo fetch.
- Verificar código en `App.jsx`.

**Si hay requests con error 404:**
- Endpoint no existe en el servidor.
- Verificar rutas en `server.js`.

**Si hay requests con error 500:**
- Error del servidor.
- Ver logs en la terminal donde corre `node server.js`.

---

### 8. Tailwind v4 vs v3 Incompatibilidad

**Síntoma:**
```
Error: Cannot find module '@tailwindcss/vite'
```

**Causa:** Intentaste usar Tailwind v4 (que requiere plugin de Vite).

**Solución:** Usar Tailwind v3 (recomendado):

```bash
cd web
npm uninstall tailwindcss @tailwindcss/vite
npm install -D tailwindcss@^3.4.1 postcss autoprefixer
```

Verificar `package.json`:
```json
{
  "devDependencies": {
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20"
  }
}
```

---

### 9. Framer Motion No Anima

**Síntoma:** Los componentes no tienen animaciones.

**Verificaciones:**

#### a) Importar correctamente
```jsx
import { motion } from 'framer-motion';
```

#### b) Usar componentes `motion.*`
```jsx
// ❌ Incorrecto
<div className="card">...</div>

// ✅ Correcto
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="card"
>
  ...
</motion.div>
```

---

#### c) Verificar que Framer Motion está instalado
```bash
cd web
npm install framer-motion
```

---

### 10. `coach-data.json` Se Corrompe

**Síntoma:** El archivo JSON tiene formato inválido.

**Causa:** Escritura concurrente o error en el código.

**Solución:**

#### a) Validar JSON
```bash
# Windows (PowerShell)
Get-Content coach-data.json | ConvertFrom-Json

# macOS/Linux
cat coach-data.json | jq .
```

Si da error, el JSON está corrupto.

---

#### b) Restaurar desde backup (si usas Git)
```bash
git checkout HEAD -- coach-data.json
```

---

#### c) Recrear manualmente
Ver [data-schema.md](../architecture/data-schema.md) para la estructura correcta.

---

### 11. Stats No Se Calculan Correctamente

**Síntoma:** La racha o completion rate están incorrectos.

**Debug:**

#### a) Verificar cálculo de racha

Racha continúa si `completion_rate === 1.0` (100%).

```json
{
  "stats": {
    "current_streak": 2,
    "best_streak": 5
  }
}
```

---

#### b) Verificar completion_rate en history

```json
{
  "history": [
    {
      "week": "2026-W06",
      "completion_rate": 1.0  // 100% completado
    },
    {
      "week": "2026-W07",
      "completion_rate": 0.5  // 50% completado (racha se rompe)
    }
  ]
}
```

---

#### c) Forzar recálculo

Ejecutar:
```bash
claude code stats
```

El coach debería recalcular stats.

---

## 🔍 Logs y Debug

### 1. Ver Logs del Servidor Express

```bash
# Terminal donde corre el servidor
node server.js
```

**Logs típicos:**
```
Server running on http://localhost:3000
GET /api/commitments/current 200 15.234 ms
PATCH /api/commitments/2026-W07-1 200 42.123 ms
```

---

### 2. Ver Logs del Frontend (Vite)

```bash
# Terminal donde corre Vite
npm run dev
```

**Logs típicos:**
```
VITE v6.0.3  ready in 523 ms
➜  Local:   http://localhost:5173/
hmr update /src/App.jsx
```

---

### 3. Ver Errores en el Navegador

1. Abrir DevTools (F12).
2. Ir a la pestaña **Console**.
3. Ver errores de JavaScript.

**Errores comunes:**
- `Failed to fetch`: Servidor no está corriendo.
- `Cannot read property 'map' of undefined`: Estado no inicializado.
- `CORS policy`: CORS no habilitado.

---

## 🛡️ Prevención de Problemas

### 1. Usar Git para Backups

```bash
# Inicializar repositorio si no existe
git init
git add .
git commit -m "Initial commit"

# Commit después de cada sesión importante
git add coach-data.json coach-memory.json
git commit -m "Update data after weekly review"
```

---

### 2. Validar JSON Antes de Cerrar

```bash
# Verificar que coach-data.json es válido
cat coach-data.json | jq .
```

---

### 3. Revisar Logs Regularmente

- Si algo no funciona, ver logs en terminales.
- Buscar errores con `Error:` o `Failed`.

---

## 📚 Recursos Adicionales

### Documentación Oficial

- **Express:** https://expressjs.com/
- **Vite:** https://vitejs.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **Framer Motion:** https://www.framer.com/motion/

---

### Guías Relacionadas

- [Tech Stack](../architecture/tech-stack.md)
- [API Reference](../web-app/api-reference.md)
- [Data Schema](../architecture/data-schema.md)

---

## 🆘 Soporte

Si ninguna solución funciona:

1. **Revisar issues en GitHub** (si existe repositorio).
2. **Buscar error exacto en Google** con contexto (Express, Vite, etc.).
3. **Revisar configuración** comparando con archivos de esta documentación.

---

*"Cada error es una oportunidad para aprender el sistema."*
