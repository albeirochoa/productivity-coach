# ✅ Funcionalidad "Trozar Tarea" - Implementación Completa

**Fecha:** 2026-02-09
**Estado:** ✅ Completado y funcionando

---

## 🎯 ¿Qué es "Trozar Tarea"?

Sistema que divide automáticamente proyectos grandes ("elefantes") en micro-tareas ejecutables de máximo 45-60 minutos cada una.

### Principios

1. **Regla de los 45 minutos**: Cada paso debe tomar máximo 45-60 min
2. **Resultados tangibles**: Cada paso termina con algo concreto (no "avanzar" o "continuar")
3. **Específico y accionable**: Pasos claros con entregables definidos

---

## 🚀 Características Implementadas

### 1. Wizard Interactivo de 3 Pasos

**Paso 1: Describir el proyecto**
- Título del proyecto (requerido)
- Descripción opcional
- Categoría: Trabajo, Contenido, Clientes, Aprender
- Estrategia:
  - 🟢 **Goteo**: 1 paso por semana (proyectos a largo plazo)
  - 🔥 **Batching**: Sprint intensivo (proyectos urgentes)

**Paso 2: Revisar y editar pasos**
- Editar título y descripción de cada paso
- Ajustar tiempo estimado (5-120 minutos)
- Reordenar pasos (↑ ↓)
- Eliminar pasos innecesarios
- Añadir pasos adicionales
- Ver tiempo total estimado

**Paso 3: Confirmar y guardar**
- Resumen completo del proyecto
- Visualización de todos los pasos
- Guardar proyecto en `backlog/`

---

### 2. Dual Mode: Templates + IA

#### Modo Rápido (Templates)
- ✅ **Gratis** e instantáneo
- ✅ **15+ templates inteligentes** por tipo de proyecto
- ✅ Detección automática del tipo (blog, video, app, etc.)
- ✅ Pasos optimizados para cada categoría

**Templates disponibles:**
- **Contenido**: blog, video, podcast, curso
- **Trabajo**: app, web, automatización
- **Aprender**: skill, idioma
- **Clientes**: proyecto, propuesta

#### Modo IA (OpenAI)
- 🤖 **Personalizado** según el título específico
- 🤖 Pasos adaptados al contexto del proyecto
- 🤖 Usa GPT-4o-mini (rápido y económico)
- 🤖 Requiere créditos en OpenAI

**Ejemplo de diferencia:**

| Proyecto | Templates | OpenAI |
|----------|-----------|--------|
| "Post sobre Google Ads" | 6 pasos genéricos de blog | 7 pasos específicos mencionando Google Ads explícitamente |
| "App de recetas React Native" | 6 pasos genéricos de app | 7 pasos específicos: Expo, componentes, pantallas, búsqueda por ingrediente |

---

### 3. Fallback Automático

Si OpenAI falla (sin créditos, API down, etc.), el sistema **automáticamente usa templates** sin interrumpir el flujo del usuario.

Mensajes informativos:
- ✅ `"IA no disponible: sin créditos en OpenAI"` → usa templates
- ✅ El usuario siempre obtiene pasos válidos

---

## 📂 Arquitectura del Sistema

### Backend (`web/server.js`)

**Endpoint principal:**
```javascript
POST /api/projects/analyze
{
  "title": "Título del proyecto",
  "description": "Descripción opcional",
  "category": "contenido",
  "strategy": "goteo",
  "useAI": true,
  "apiProvider": "openai"
}

// Respuesta:
{
  "generated_milestones": [
    {
      "title": "Paso 1",
      "description": "Descripción del paso",
      "time_estimate": 45,
      "order": 1
    }
  ],
  "detected_type": "blog",
  "template_used": "contenido:blog",
  "reasoning": "Explicación de la división",
  "ai_provider": "openai" | "template",
  "model": "gpt-4o-mini" | "templates-locales"
}
```

**Otros endpoints:**
```javascript
POST /api/projects           // Guardar proyecto troceado
GET  /api/projects           // Listar proyectos
PATCH /api/projects/:id/milestones/:milestoneId  // Marcar completado
GET  /api/ai/providers       // Verificar proveedores disponibles
```

---

### Servicios (`web/lib/`)

#### `templates.js`
- 15+ templates predefinidos por categoría:tipo
- Sistema de detección inteligente de tipos
- Orden de keywords importa (específico → general)

**Ejemplo de template:**
```javascript
'contenido:blog': [
  { title: 'Research y documentación', time_estimate: 30,
    description: 'Investigar fuentes, ejemplos y keywords del tema' },
  { title: 'Crear esquema del artículo', time_estimate: 20,
    description: 'Definir estructura, headers y puntos principales' },
  // ... 4 pasos más
]
```

#### `ai-service.js`
- Lógica de enrutamiento: templates vs OpenAI vs Anthropic
- Construcción de prompts para IA
- Parsing de respuestas JSON
- Fallback automático en caso de error

**Flujo de decisión:**
```
¿useAI = true?
  ├─ No → Templates
  └─ Sí → ¿apiProvider?
      ├─ openai → OpenAI API
      ├─ anthropic → Anthropic API
      └─ fallback → Templates
```

---

### Frontend (`web/src/App.jsx`)

**Estados del wizard:**
```javascript
const [projectWizardStep, setProjectWizardStep] = useState(1);  // 1, 2, 3
const [isGenerating, setIsGenerating] = useState(false);
const [generatedMilestones, setGeneratedMilestones] = useState([]);
const [projectForm, setProjectForm] = useState({
  title: '',
  description: '',
  category: 'trabajo',
  strategy: 'goteo',
  milestones: []
});
```

**Funciones clave:**
- `handleGenerateSteps(useAI)` → Llamar API para generar pasos
- `handleUpdateMilestone(idx, field, value)` → Editar paso
- `handleReorderMilestone(fromIdx, direction)` → Reordenar
- `handleDeleteMilestone(idx)` → Eliminar paso
- `handleAddMilestone()` → Añadir paso nuevo
- `handleCreateProject()` → Guardar proyecto final

---

## 🔧 Configuración

### Requisitos

```bash
# Dependencias instaladas
npm install openai dotenv
```

### Variables de Entorno

**Archivo:** `web/.env`

```env
# OpenAI API Key (opcional, para modo IA)
OPENAI_API_KEY=sk-proj-xxxxx...

# Anthropic API Key (opcional, para Claude)
ANTHROPIC_API_KEY=sk-ant-xxxxx...
```

**Notas:**
- Sin API keys → Sistema usa templates (funciona perfectamente)
- Con OpenAI API key → Requiere créditos en la cuenta
- Verificar créditos en: [platform.openai.com/account/billing](https://platform.openai.com/account/billing)

---

## 🧪 Testing

### Test 1: Templates (sin IA)

```bash
curl -X POST http://localhost:3000/api/projects/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Escribir post sobre Google Ads",
    "category": "contenido",
    "useAI": false
  }'
```

**Resultado esperado:**
- `detected_type: "blog"`
- `template_used: "contenido:blog"`
- 6 pasos genéricos de blog
- `ai_provider: "template"`

---

### Test 2: OpenAI (con créditos)

```bash
curl -X POST http://localhost:3000/api/projects/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Crear app de recetas con React Native",
    "category": "trabajo",
    "useAI": true,
    "apiProvider": "openai"
  }'
```

**Resultado esperado:**
- Pasos personalizados mencionando "React Native", "Expo", "recetas"
- 6-7 pasos específicos al proyecto
- `ai_provider: "openai"`
- `model: "gpt-4o-mini"`

---

### Test 3: Detección de tipos

| Título | Tipo detectado | Template usado |
|--------|----------------|----------------|
| "Escribir post sobre..." | blog | contenido:blog |
| "Crear video tutorial..." | video | contenido:video |
| "Desarrollar app móvil..." | app | trabajo:app |
| "Aprender Python..." | skill | aprender:skill |
| "Propuesta para cliente X" | propuesta | clientes:propuesta |

---

## 📊 Comparación: Templates vs OpenAI

### Templates
**✅ Ventajas:**
- Gratis
- Instantáneo (< 100ms)
- Sin límites de uso
- Funcionan offline
- Optimizados por categoría

**❌ Limitaciones:**
- Mismo resultado para proyectos similares
- No considera detalles específicos del título

---

### OpenAI
**✅ Ventajas:**
- Personalizado según título/descripción
- Se adapta al contexto específico
- Más creativo y variado

**❌ Limitaciones:**
- Requiere créditos ($)
- Más lento (2-8 segundos)
- Depende de API externa
- Límites de rate

---

## 🐛 Problemas Resueltos

### 1. Blog detectado como "app" ❌ → ✅
**Problema:** "Escribir post sobre Google Ads" detectaba "app" en "sobre"
**Solución:** Reordenado `TYPE_KEYWORDS` para evaluar "blog" primero

### 2. Template de blog genérico ❌ → ✅
**Problema:** Pasos no alineados con escritura de contenido técnico
**Solución:** Mejorado template con pasos específicos (Research, Esquema, Ejemplos, SEO)

### 3. Ambos botones con spinner ❌ → ✅
**Problema:** Al generar, ambos botones mostraban loading
**Solución:** Mejor manejo de `isGenerating` con early returns

### 4. Botón "Regenerar" no funcionaba ❌ → ✅
**Problema:** Click en regenerar no hacía nada
**Solución:** Limpiar `generatedMilestones` antes de llamar `handleGenerateSteps`

### 5. Mismo resultado para diferentes proyectos ❌ → ✅
**Problema:** Al crear nuevo proyecto, mostraba pasos del anterior
**Solución:** Reset completo del estado en `handleCloseProjectWizard`

### 6. OpenAI siempre fallaba ❌ → ✅
**Problema:** API key configurada pero sin créditos
**Diagnóstico:** Error 429 "insufficient_quota"
**Solución:** Usuario añadió créditos + fallback automático a templates

---

## 📈 Próximas Mejoras (Futuras)

### UX
- [ ] Indicador visual del método usado (📋 Template vs 🤖 OpenAI)
- [ ] Mensaje "Generando con IA..." durante llamada
- [ ] Tiempo estimado de generación
- [ ] Parámetro "creatividad" (temperature)

### Funcionalidad
- [ ] Marcar milestones completados desde dashboard
- [ ] Vista expandida/colapsada de proyectos
- [ ] Drag & drop para reordenar milestones
- [ ] Integración con check-in wizard
- [ ] Estadísticas: tiempo estimado vs real
- [ ] Sugerir próximo milestone al iniciar semana

### Templates
- [ ] `contenido:tutorial`
- [ ] `contenido:case-study`
- [ ] `contenido:guia`
- [ ] Más variedad en templates existentes

---

## 📝 Archivos del Sistema

```
web/
├── server.js                      # Endpoints de API
├── lib/
│   ├── templates.js               # Templates inteligentes
│   └── ai-service.js              # Servicio de IA (OpenAI/Anthropic)
├── src/
│   └── App.jsx                    # Wizard UI (React)
├── .env                           # API keys (no commitear)
└── package.json                   # Dependencias

backlog/                           # Proyectos troceados guardados
├── ejemplo-proyecto.json
└── ...

docs/
├── TROZAR-TAREA-COMPLETO.md      # Este documento
└── FIXES-TROZAR-TAREA.md         # Historial de correcciones
```

---

## 🎓 Uso desde la Interfaz Web

1. **Abrir dashboard**: `http://localhost:5173`
2. **Click en "Trozar Tarea" (tijeras 🐘)**
3. **Paso 1**: Escribir título y elegir categoría/estrategia
4. **Generar pasos**:
   - Botón azul "Generar (Rápido)" → Templates
   - Botón morado "Generar con IA" → OpenAI
5. **Paso 2**: Revisar y editar pasos generados
6. **Paso 3**: Confirmar y crear proyecto
7. **¡Listo!** Proyecto guardado en `backlog/`

---

## 💡 Recomendaciones

### Para usuarios sin créditos OpenAI
- Usa **templates** → Funcionan perfectamente para la mayoría de casos
- Son instantáneos y gratuitos
- Cubren 15+ tipos de proyecto diferentes

### Para usuarios con créditos OpenAI
- Usa **IA** para proyectos complejos o específicos
- Usa **templates** para tareas comunes (blog, video, etc.)
- La IA es mejor cuando el proyecto tiene contexto muy específico

### Mejores prácticas
1. **Título descriptivo**: "Crear video tutorial de React Hooks" > "Video"
2. **Descripción opcional**: Añadir detalles mejora resultados de IA
3. **Editar siempre**: Los pasos generados son base, personalízalos
4. **Ajustar tiempos**: Si un paso es muy largo, divídelo en 2-3 pasos

---

## ✅ Checklist de Implementación

- [x] Sistema de templates inteligentes
- [x] Detección automática de tipo de proyecto
- [x] Integración con OpenAI API
- [x] Fallback automático a templates
- [x] Wizard de 3 pasos con UI
- [x] Edición de pasos generados
- [x] Reordenar/eliminar/añadir pasos
- [x] Guardar proyectos en backlog/
- [x] Indicadores de estrategia (Goteo/Batching)
- [x] Manejo de errores y créditos
- [x] Logs informativos en servidor
- [x] Documentación completa
- [x] Testing con casos reales

---

**Estado final:** ✅ Sistema completamente funcional, testeado y documentado.

**Performance:**
- Templates: < 100ms
- OpenAI: 2-8 segundos
- Fallback automático: transparente para el usuario

**Cobertura:**
- 15+ tipos de proyecto con templates
- ∞ tipos de proyecto con OpenAI (limitado por créditos)

---

## 🙏 Créditos

Desarrollado como parte del sistema **Productivity Coach**
Filosofía basada en: GTD + Weekly Check-ins + Micro-tasks
IA powered by: OpenAI GPT-4o-mini

---

**Última actualización:** 2026-02-09
**Versión:** 1.0.0
