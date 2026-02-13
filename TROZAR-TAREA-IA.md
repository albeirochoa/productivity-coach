# 🐘 Smart Task Breaking - Troceado Automático con IA

**Fecha de implementación:** 2026-02-09

## 🎯 ¿Qué es?

Una funcionalidad que divide automáticamente proyectos grandes ("elefantes") en micro-pasos ejecutables de máximo 45 minutos cada uno. Usa IA o templates inteligentes.

## ✨ Características

### 🚀 Dos Modos de Generación

1. **Modo Rápido (Templates)**
   - ⚡ Instantáneo
   - 🆓 Sin costos
   - 🎯 Basado en templates inteligentes por categoría
   - 🔍 Detecta automáticamente el tipo de proyecto (video, blog, app, etc.)

2. **Modo IA (OpenAI/Anthropic)**
   - 🤖 Personalizado con IA real
   - 💡 Troceado específico para tu proyecto
   - 📝 Más contextual y detallado

### 📝 Editor Visual de Pasos

Después de generar los pasos, puedes:
- ✏️ **Editar** título y descripción de cada paso
- 🗑️ **Eliminar** pasos innecesarios
- ➕ **Añadir** nuevos pasos
- ↕️ **Reordenar** pasos (botones arriba/abajo)
- 🔄 **Regenerar** desde cero
- ⏱️ **Ajustar** tiempo estimado (5-120 min)

### 🎨 Wizard de 3 Pasos

1. **Paso 1: Describe tu proyecto**
   - Título
   - Descripción (opcional)
   - Categoría (Trabajo, Contenido, Clientes, Aprender)
   - Estrategia (Goteo 🟢 o Batching 🔥)

2. **Paso 2: Revisa y edita los pasos**
   - Vista previa de pasos generados
   - Editor visual completo
   - Tiempo total estimado

3. **Paso 3: Confirma y guarda**
   - Resumen del proyecto
   - Confirmación final

## 🛠️ Instalación y Configuración

### 1. Dependencias

Ya están instaladas:
```bash
npm install openai dotenv
```

### 2. Configurar API Key (opcional)

Si quieres usar el modo IA:

1. Crea el archivo `.env` en `web/`:
   ```env
   OPENAI_API_KEY=tu-api-key-aqui
   ```

2. O copia `.env.example` y renómbralo:
   ```bash
   cd web
   cp .env.example .env
   # Edita .env con tu API key
   ```

**Nota:** Si no configuras API key, el botón "Generar con IA" usará fallback a templates automáticamente.

### 3. Iniciar el Sistema

```bash
# Terminal 1: Backend
cd web
node server.js

# Terminal 2: Frontend
cd web
npm run dev
```

## 📚 Templates Disponibles

### Contenido
- **Video:** 6 pasos (tema, guion, recursos, grabar, editar, publicar)
- **Blog:** 6 pasos (research, esquema, borrador, edición, formato, publicar)
- **Podcast:** 5 pasos (tema, notas, grabar, editar, publicar)
- **Curso:** 6 pasos (estructura, módulo 1, lecciones, ejercicios, revisar, configurar)

### Trabajo/Desarrollo
- **App:** 6 pasos (requisitos, diseño, setup, feature, testing, deploy)
- **Web:** 6 pasos (estructura, diseño, maqueta, contenido, testing, publicar)
- **Automatización:** 5 pasos (mapear proceso, identificar, diseñar, implementar, testing)

### Aprender
- **Skill:** 6 pasos (investigar, planificar, fundamentos, práctica, proyecto, consolidar)
- **Idioma:** 6 pasos (evaluar, configurar rutina, vocabulario, gramática, conversación, inmersión)

### Clientes
- **Proyecto:** 6 pasos (kickoff, requisitos, entregable, feedback, entrega final, cierre)
- **Propuesta:** 5 pasos (investigar, alcance, presupuesto, redactar, revisar)

### Genérico
- **Fallback:** 5 pasos (definir objetivo, investigar, ejecutar, revisar, finalizar)

## 🎯 Uso

### Desde la UI Web

1. Click en botón **"Trozar Tarea"** en el header
2. Completa el formulario del proyecto
3. Elige modo de generación:
   - **"Generar (Rápido)"** → Templates
   - **"Generar con IA"** → OpenAI/Anthropic
4. Edita los pasos generados
5. Confirma y guarda

### Desde la API

```javascript
// Generar con templates
POST /api/projects/analyze
{
  "title": "Crear video YouTube sobre Google Ads",
  "description": "Video tutorial explicando pujas",
  "category": "contenido",
  "strategy": "goteo",
  "useAI": false
}

// Generar con IA
POST /api/projects/analyze
{
  "title": "Crear video YouTube sobre Google Ads",
  "description": "Video tutorial explicando pujas",
  "category": "contenido",
  "strategy": "goteo",
  "useAI": true,
  "apiProvider": "openai"
}
```

**Respuesta:**
```json
{
  "generated_milestones": [
    {
      "title": "Definir tema y estructura",
      "description": "Elegir enfoque, público objetivo y puntos clave",
      "time_estimate": 30,
      "order": 1
    },
    // ... más pasos
  ],
  "detected_type": "video",
  "template_used": "contenido:video",
  "reasoning": "Troceado basado en template..."
}
```

## 📁 Archivos Creados

```
web/
├── lib/
│   ├── templates.js       # 🆕 Diccionario de templates inteligentes
│   └── ai-service.js      # 🆕 Servicio de IA (OpenAI/Anthropic)
├── .env                   # 🆕 Variables de entorno (API keys)
├── .env.example          # 🆕 Plantilla de configuración
└── server.js             # ✅ Modificado (nuevo endpoint /api/projects/analyze)

web/src/
└── App.jsx               # ✅ Modificado (wizard de 3 pasos con auto-generación)
```

## 🧠 Arquitectura

### Backend

```
server.js
    ↓ import
ai-service.js → breakdownTask()
    ↓
    ├─→ Templates (modo rápido)
    │   └─→ templates.js → getTemplateForProject()
    │       └─→ Detecta tipo + busca template
    │
    └─→ IA Real (modo premium)
        ├─→ OpenAI (gpt-4o-mini)
        └─→ Anthropic (claude-3-haiku)
```

### Frontend

```
App.jsx
    ↓
Wizard de 3 Pasos
    ├─→ Paso 1: Formulario básico
    │   ├─→ Botón "Generar (Rápido)" → useAI: false
    │   └─→ Botón "Generar con IA" → useAI: true
    │
    ├─→ Paso 2: Editor de milestones
    │   ├─→ Editar título/descripción
    │   ├─→ Ajustar tiempo estimado
    │   ├─→ Eliminar pasos
    │   ├─→ Añadir pasos
    │   ├─→ Reordenar (↑↓)
    │   └─→ Regenerar
    │
    └─→ Paso 3: Confirmación
        └─→ Resumen + Guardar proyecto
```

## 🔧 Personalización

### Añadir Nuevo Template

Edita [web/lib/templates.js](web/lib/templates.js):

```javascript
// Añadir nuevo template
TEMPLATES['contenido:newsletter'] = [
    { title: 'Elegir tema semanal', time_estimate: 20, description: '...' },
    { title: 'Investigar contenido', time_estimate: 30, description: '...' },
    { title: 'Escribir newsletter', time_estimate: 45, description: '...' },
    { title: 'Diseñar formato', time_estimate: 30, description: '...' },
    { title: 'Enviar y publicar', time_estimate: 15, description: '...' }
];

// Añadir palabra clave para detección
TYPE_KEYWORDS.newsletter = ['newsletter', 'boletín', 'email marketing'];
```

### Cambiar Modelo de IA

Edita [web/lib/ai-service.js](web/lib/ai-service.js):

```javascript
// Para OpenAI
const response = await openai.chat.completions.create({
    model: 'gpt-4o',  // Cambiar aquí
    // ...
});

// Para Anthropic
const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',  // Cambiar aquí
    // ...
});
```

## 💡 Tips de Uso

1. **Para proyectos de video/contenido:** Usa categoría "Contenido" → detectará automáticamente el template correcto
2. **Para desarrollo:** Usa categoría "Trabajo" + incluye palabra "app" o "web" en el título
3. **Para clientes:** Usa categoría "Clientes" → templates de propuesta/proyecto
4. **Estrategia Goteo:** Para proyectos a largo plazo (1 paso por semana)
5. **Estrategia Batching:** Para sprints intensivos (varios pasos seguidos)

## 🐛 Troubleshooting

### Error 404 al generar pasos

**Causa:** Servidor no actualizado
**Solución:**
```bash
# Detener servidor viejo
taskkill //F //IM node.exe

# Iniciar servidor actualizado
cd web
node server.js
```

### "Error generando pasos" con IA

**Causa 1:** API key no configurada
**Solución:** Verifica que `.env` existe y tiene `OPENAI_API_KEY=...`

**Causa 2:** API key inválida
**Solución:** Genera nueva API key en https://platform.openai.com/api-keys

**Causa 3:** Sin créditos en OpenAI
**Solución:** Usa modo "Generar (Rápido)" con templates

### Templates no detectan tipo de proyecto

**Causa:** Título sin palabras clave
**Solución:** Incluye palabras como "video", "blog", "app" en el título

Ejemplo:
- ❌ "Proyecto sobre Google Ads"
- ✅ "Crear video YouTube sobre Google Ads"

## 📈 Próximas Mejoras

- [ ] Drag & drop para reordenar pasos
- [ ] Guardar historial de troceados
- [ ] Sugerir templates basados en historial del usuario
- [ ] Integración con check-in semanal (proponer próximo milestone)
- [ ] Estadísticas de proyectos (tiempo estimado vs real)
- [ ] Exportar proyecto a calendario

## 📝 Changelog

### v1.0.0 (2026-02-09)
- ✨ Auto-generación de pasos con templates inteligentes
- 🤖 Integración con OpenAI para troceado personalizado
- ✏️ Editor visual de pasos (editar, eliminar, añadir, reordenar)
- 🎨 Wizard de 3 pasos
- 📚 15+ templates por categoría
- ⚡ Detección automática de tipo de proyecto

---

**Documentación completa:** Ver [plan detallado](C:\Users\usuario\.claude\plans\trozar-tarea-ia.md)
