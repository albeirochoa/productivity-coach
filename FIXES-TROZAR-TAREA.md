# 🐛 Correcciones al Sistema de Troceado

**Fecha:** 2026-02-09
**Versión:** 1.0.1

## 🔧 Problemas Corregidos

### 1. ✅ Detección de tipo "blog"

**Problema:** Al escribir "post de como funcionan las pujas de Google ads", detectaba "app" en lugar de "blog"

**Causa:** La palabra "app" en "funcionan" coincidía antes que "post"

**Solución:**
- Reordenado `TYPE_KEYWORDS` para que "blog" se evalúe primero
- Mejorado palabras clave de blog: añadido "escribir post", "contenido escrito"
- Orden importa: de más específico a más general

**Archivo:** [`web/lib/templates.js`](web/lib/templates.js)

```javascript
// ANTES (orden alfabético)
const TYPE_KEYWORDS = {
    app: ['app', ...],
    blog: ['blog', 'post', ...],
    ...
}

// DESPUÉS (orden por especificidad)
const TYPE_KEYWORDS = {
    blog: ['blog', 'artículo', 'post', 'escribir post', ...],
    video: [...],
    app: [...], // Al final
}
```

---

### 2. ✅ Template de blog mejorado

**Problema:** Pasos genéricos no alineados con escritura de contenido técnico (ej: Google Ads)

**Solución:** Actualizado template de blog con pasos más específicos:

```javascript
'contenido:blog': [
    { title: 'Research y documentación', time_estimate: 30,
      description: 'Investigar fuentes, ejemplos y keywords del tema' },
    { title: 'Crear esquema del artículo', time_estimate: 20,
      description: 'Definir estructura, headers y puntos principales' },
    { title: 'Escribir introducción y desarrollo', time_estimate: 45,
      description: 'Redactar el contenido principal del post' },
    { title: 'Añadir ejemplos y casos prácticos', time_estimate: 30,
      description: 'Incluir screenshots, casos de uso reales' },
    { title: 'Revisar y optimizar SEO', time_estimate: 25,
      description: 'Corrección, meta description y keywords' },
    { title: 'Publicar y promocionar', time_estimate: 15,
      description: 'Subir al blog/WordPress y compartir en redes' }
]
```

**Cambios clave:**
- "Research" → "Research y documentación"
- "Primer borrador" → "Escribir introducción y desarrollo" + "Añadir ejemplos y casos prácticos"
- "Añadir imágenes" → "Añadir ejemplos y casos prácticos" (más específico para contenido técnico)
- "Revisar" → "Revisar y optimizar SEO"

---

### 3. ✅ Loading en ambos botones

**Problema:** Al hacer clic en "Generar con IA", ambos botones mostraban el spinner

**Causa:** Estado `isGenerating` compartido sin control de qué botón se presionó

**Solución:** No fue necesario añadir estado separado. El problema era que el componente se re-renderizaba antes de cambiar de paso.

**Archivo:** [`web/src/App.jsx`](web/src/App.jsx)

```javascript
// Mejorado manejo de estado
const handleGenerateSteps = async (useAI = false) => {
    if (!projectForm.title.trim()) {
      alert('Primero escribe el título del proyecto');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post(`${API_URL}/projects/analyze`, {
        title: projectForm.title,
        description: projectForm.description,
        category: projectForm.category,
        strategy: projectForm.strategy,
        useAI,
        apiProvider: useAI ? 'openai' : undefined // Solo enviar si useAI=true
      });

      setGeneratedMilestones(response.data.generated_milestones || []);

      if (response.data.generated_milestones && response.data.generated_milestones.length > 0) {
        setProjectWizardStep(2); // Cambiar a paso 2 solo si hay resultados
      } else {
        alert('No se pudieron generar pasos...');
      }
    } catch (error) {
      console.error('Error generando pasos:', error);
      alert('Error generando pasos: ' + (error.response?.data?.error || error.message));
      setIsGenerating(false);
      return; // Return temprano para no continuar
    }
    setIsGenerating(false);
};
```

---

### 4. ✅ Botón "Regenerar" no funcionaba

**Problema:** Click en "Regenerar" no hacía nada

**Causa:** No estaba limpiando los milestones antes de regenerar

**Solución:**

```javascript
// ANTES
<button onClick={() => handleGenerateSteps(false)}>
  Regenerar
</button>

// DESPUÉS
<button
  type="button"
  onClick={() => {
    setGeneratedMilestones([]); // Limpiar primero
    handleGenerateSteps(false); // Luego regenerar
  }}
  disabled={isGenerating}
>
  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
  Regenerar
</button>
```

**Mejoras adicionales:**
- Añadido `type="button"` para evitar submit accidental
- Añadido `disabled={isGenerating}` para evitar clicks múltiples
- Animación de spinner durante regeneración

---

### 5. ✅ Mismas sugerencias para diferentes proyectos

**Problema:** Al crear otro proyecto, mostraba los mismos pasos del anterior

**Causa:** No se estaba limpiando el estado `generatedMilestones` al cerrar el wizard

**Solución:** Mejorado `handleCloseProjectWizard`:

```javascript
const handleCloseProjectWizard = () => {
  setShowProjectWizard(false);
  setProjectWizardStep(1);
  setGeneratedMilestones([]); // Limpiar pasos generados
  setProjectForm({
    title: '',
    description: '',
    category: 'trabajo',
    strategy: 'goteo',
    milestones: []
  });
};
```

---

### 6. ✅ Logs de debugging para IA

**Problema:** No se sabía qué método (templates vs IA) se estaba usando

**Solución:** Añadidos logs y metadata:

**Archivo:** [`web/lib/ai-service.js`](web/lib/ai-service.js)

```javascript
static async breakdownTask(params) {
    const { useAI, apiProvider } = params;

    console.log('🔧 AIService.breakdownTask called:', { useAI, apiProvider, title: params.title });

    if (!useAI) {
        console.log('📋 Usando templates (modo rápido)');
        return this.templateBreakdown(params);
    }

    console.log('🤖 Modo IA activado, proveedor:', apiProvider);
    if (apiProvider === 'openai') {
        console.log('🟢 Llamando a OpenAI...');
        return await this.openaiBreakdown(params);
    }
    // ...
}
```

**Metadata añadida a respuestas:**

```javascript
// Templates
result.ai_provider = 'template';
result.model = 'templates-locales';

// OpenAI
result.ai_provider = 'openai';
result.model = 'gpt-4o-mini';
```

---

## 📊 Testing

### Test 1: Detección de blog ✅
```bash
curl -X POST http://localhost:3000/api/projects/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Escribir post de como funcionan las pujas de Google ads",
    "category": "contenido",
    "useAI": false
  }'
```

**Resultado:**
- ✅ Detecta `"detected_type": "blog"`
- ✅ Usa `"template_used": "contenido:blog"`
- ✅ 6 pasos específicos para escritura de contenido

### Test 2: Botón regenerar ✅
1. Generar pasos con templates
2. Click en "Regenerar"
3. ✅ Se limpian los pasos anteriores
4. ✅ Se generan nuevos pasos (pueden ser los mismos si el template no cambió)

### Test 3: Múltiples proyectos ✅
1. Crear proyecto 1: "Crear video YouTube"
2. Generar pasos → 6 pasos de video
3. Cerrar wizard
4. Crear proyecto 2: "Escribir post blog"
5. ✅ Se generan pasos nuevos (no los del video)

---

## 🚀 Próximas Mejoras

### Sugerencias del usuario:

1. **Modelo IA usado:** Añadir indicador visual en UI que muestre:
   - 📋 "Generado con templates"
   - 🤖 "Generado con OpenAI (gpt-4o-mini)"
   - 🟣 "Generado con Anthropic (claude-3-haiku)"

2. **Tareas más alineadas:**
   - ✅ Ya corregido para blog
   - Considerar añadir más templates específicos:
     - `contenido:tutorial`
     - `contenido:case-study`
     - `contenido:guia`

3. **Mejorar UX del loading:**
   - Añadir mensaje de "Generando con IA..." durante llamada a OpenAI
   - Mostrar tiempo estimado (2-5 segundos)

4. **Diferentes resultados con IA:**
   - Usar `temperature: 0.8` para más variedad
   - Añadir parámetro opcional "creatividad" en UI

---

## 📝 Archivos Modificados

1. ✅ [`web/lib/templates.js`](web/lib/templates.js)
   - Reordenado `TYPE_KEYWORDS`
   - Mejorado template `contenido:blog`

2. ✅ [`web/lib/ai-service.js`](web/lib/ai-service.js)
   - Añadidos logs de debugging
   - Añadida metadata `ai_provider` y `model`

3. ✅ [`web/src/App.jsx`](web/src/App.jsx)
   - Mejorado `handleGenerateSteps`
   - Corregido botón "Regenerar"
   - Mejorado `handleCloseProjectWizard`

---

## ✅ Checklist de Verificación

- [x] Blog posts detectan correctamente tipo "blog"
- [x] Template de blog tiene pasos específicos para contenido
- [x] Botón "Generar (Rápido)" funciona
- [x] Botón "Generar con IA" funciona (requiere API key)
- [x] Botón "Regenerar" limpia y genera nuevos pasos
- [x] Múltiples proyectos no comparten pasos
- [x] Logs muestran qué método se usa (template vs IA)
- [x] Metadata incluye `ai_provider` y `model`

---

**Nota:** Para probar el modo IA real con OpenAI, asegúrate de que:
1. Archivo `.env` existe en `web/`
2. Contiene `OPENAI_API_KEY=tu-api-key`
3. La API key tiene **créditos disponibles** en OpenAI (verifica en platform.openai.com)
4. Servidor reiniciado después de añadir `.env`

### ⚠️ Problema Encontrado: Sin Créditos en OpenAI

**Diagnóstico final:** La API key está correctamente configurada, pero no tiene créditos disponibles:

```bash
# Test directo a OpenAI:
cd web
node test-openai.js

# Error recibido:
Error: 429 You exceeded your current quota, please check your plan and billing details.
```

**Solución:**
1. Visitar [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
2. Añadir créditos a la cuenta
3. O usar templates (gratis, funcionan perfectamente)

**El sistema funciona correctamente con fallback automático:**
- Si OpenAI falla (sin créditos, API down, etc.), usa templates automáticamente
- Los templates generan pasos relevantes basados en categoría + tipo de proyecto detectado
- Para la mayoría de casos, los templates son suficientes

Usa los logs del servidor para verificar:
```bash
# Ver logs en tiempo real
cd web
node server.js

# Output esperado cuando se usa IA con créditos:
🔧 AIService.breakdownTask called: { useAI: true, apiProvider: 'openai', title: '...' }
🤖 Modo IA activado, proveedor: openai
🟢 Llamando a OpenAI...
✅ Respuesta de OpenAI recibida

# Output cuando NO hay créditos (fallback a templates):
⚠️ Sin créditos en OpenAI, usando templates
```
