/**
 * Servicio de IA para troceado automático de tareas
 * Soporta: Templates (local) + OpenAI + Anthropic
 */

import { templateBreakdown, TEMPLATES } from './templates.js';

// Prompt base para troceado con IA
const BREAKDOWN_PROMPT = `Eres un Coach de Productividad especializado en Project Management.
Tu usuario quiere completar un proyecto grande.

PROYECTO: {title}
DESCRIPCIÓN: {description}
CATEGORÍA: {category} (trabajo/contenido/aprender/clientes)
ESTRATEGIA: {strategy} (goteo=1 paso/semana, batching=sprint intensivo)

INSTRUCCIONES:
1. Divide este proyecto en máximo 7 micro-pasos.
2. Cada paso debe:
   - Tomar máximo 45-60 minutos
   - Terminar con algo TANGIBLE (no "avanzar" o "continuar")
   - Ser específico y accionable
   - Tener un entregable claro

3. Para estrategia "goteo": Los pasos son para TODO el proyecto (varias semanas)
4. Para estrategia "batching": Los pasos son intensivos (semanas seguidas)

FORMATO DE RESPUESTA (solo JSON, sin texto adicional):
{
  "milestones": [
    {
      "title": "Título corto del paso",
      "description": "Descripción de qué hacer y qué resultado esperar",
      "time_estimate": 45
    }
  ],
  "reasoning": "Breve explicación de por qué esta división tiene sentido"
}`;

/**
 * Servicio principal de troceado
 */
class AIService {
    /**
     * Genera troceado de tarea
     * @param {Object} params - Parámetros del proyecto
     * @param {string} params.title - Título del proyecto
     * @param {string} params.description - Descripción del proyecto
     * @param {string} params.category - Categoría (trabajo, contenido, aprender, clientes)
     * @param {string} params.strategy - Estrategia (goteo, batching)
     * @param {string} params.templateId - Plantilla específica seleccionada (opcional)
     * @param {boolean} params.useAI - Si usar IA real o templates
     * @param {string} params.apiProvider - Proveedor de IA (openai, anthropic)
     * @returns {Object} Milestones generados
     */
    static async breakdownTask(params) {
        const { useAI, apiProvider, templateId } = params;

        console.log('🔧 AIService.breakdownTask called:', {
            useAI,
            apiProvider,
            templateId: templateId || 'auto',
            title: params.title
        });

        // MODO 1: Plantilla específica seleccionada + modo rápido
        if (templateId && !useAI) {
            console.log('📋 Usando plantilla específica:', templateId);
            return this.useSpecificTemplate(templateId, params);
        }

        // MODO 2: Plantilla específica + IA (híbrido)
        if (templateId && useAI) {
            console.log('🎨 Modo híbrido: plantilla base + personalización con IA');
            const baseTemplate = this.useSpecificTemplate(templateId, params);
            return await this.enrichTemplateWithAI(baseTemplate, params, apiProvider);
        }

        // MODO 3: Auto-detectar plantilla (comportamiento actual)
        if (!useAI) {
            console.log('📋 Auto-detectando tipo y usando template');
            return this.templateBreakdown(params);
        }

        // MODO 4: IA pura (sin plantilla base)
        console.log('🤖 Generación pura con IA');
        if (apiProvider === 'openai') {
            console.log('🟢 Llamando a OpenAI...');
            return await this.openaiBreakdown(params);
        } else if (apiProvider === 'anthropic') {
            console.log('🟣 Llamando a Anthropic...');
            return await this.anthropicBreakdown(params);
        }

        // Fallback a templates si no hay proveedor válido
        console.warn('⚠️ No hay proveedor válido, fallback a templates');
        return this.templateBreakdown(params);
    }

    /**
     * Troceado con templates locales (rápido, sin API)
     */
    static templateBreakdown(params) {
        const result = templateBreakdown(params);
        result.ai_provider = 'template';
        result.model = 'templates-locales';
        return result;
    }

    /**
     * Usa una plantilla específica seleccionada por el usuario
     */
    static useSpecificTemplate(templateId, params) {
        const template = TEMPLATES[templateId];

        if (!template) {
            console.warn('⚠️ Plantilla no encontrada:', templateId, '- fallback a auto-detect');
            return this.templateBreakdown(params);
        }

        console.log('✅ Plantilla encontrada:', templateId, `(${template.length} pasos)`);

        const milestones = template.map((m, idx) => ({
            ...m,
            order: idx + 1
        }));

        // Ajustar según estrategia
        if (params.strategy === 'batching') {
            milestones.forEach(m => {
                m.time_estimate = Math.min(m.time_estimate, 45);
            });
        }

        return {
            generated_milestones: milestones,
            template_used: templateId,
            detected_type: templateId.split(':')[1] || 'custom',
            reasoning: `Plantilla "${templateId}" seleccionada manualmente. ${milestones.length} pasos predefinidos listos para editar.`,
            ai_provider: 'template',
            model: 'templates-locales'
        };
    }

    /**
     * Enriquece una plantilla base con personalización de IA
     */
    static async enrichTemplateWithAI(baseTemplate, params, apiProvider) {
        const { title, description } = params;

        // Construir prompt especial para enriquecer plantilla
        const enrichPrompt = `Tienes esta plantilla base de ${baseTemplate.generated_milestones.length} pasos:

${baseTemplate.generated_milestones.map((m, i) =>
    `${i + 1}. ${m.title} (${m.time_estimate} min)\n   → ${m.description}`
).join('\n\n')}

PROYECTO ESPECÍFICO: "${title}"
${description ? `CONTEXTO ADICIONAL: ${description}` : ''}

TAREA: Personaliza esta plantilla para el proyecto específico.
- Mantén la ESTRUCTURA (mismo número de pasos, mismo orden)
- Ajusta los TÍTULOS para que mencionen el contexto específico del proyecto
- Mejora las DESCRIPCIONES con detalles relevantes al proyecto
- Mantén los TIEMPOS estimados similares (±10 minutos)
- Cada paso debe terminar con un ENTREGABLE concreto

Ejemplo de personalización:
- Genérico: "Escribir introducción" → Específico: "Escribir introducción sobre Google Ads"
- Genérico: "Investigar tema" → Específico: "Investigar cómo funcionan las pujas en Google Ads"

RESPONDE SOLO CON JSON VÁLIDO:
{
  "milestones": [
    {
      "title": "título personalizado del paso",
      "description": "descripción mejorada con detalles específicos",
      "time_estimate": 45
    }
  ],
  "reasoning": "Breve explicación de cómo se personalizó"
}`;

        try {
            if (apiProvider === 'openai') {
                const apiKey = process.env.OPENAI_API_KEY;
                if (!apiKey) {
                    console.log('⚠️ Sin API key de OpenAI, usando plantilla base');
                    return baseTemplate;
                }

                const { default: OpenAI } = await import('openai');
                const openai = new OpenAI({ apiKey });

                console.log('🎨 Enriqueciendo plantilla con OpenAI...');
                const response = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Eres un coach de productividad. Personalizas plantillas de tareas. Responde SOLO con JSON válido, sin texto adicional.'
                        },
                        { role: 'user', content: enrichPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1200
                });

                const content = response.choices[0]?.message?.content;
                if (!content) {
                    throw new Error('Respuesta vacía de OpenAI');
                }

                console.log('✅ Plantilla personalizada con IA');
                const result = this.parseAIResponse(content);

                return {
                    ...result,
                    template_used: baseTemplate.template_used,
                    detected_type: baseTemplate.detected_type,
                    ai_provider: 'hybrid',
                    model: 'template+gpt-4o-mini',
                    reasoning: `Plantilla "${baseTemplate.template_used}" personalizada con IA. ${result.reasoning || 'Pasos adaptados al proyecto.'}`
                };
            } else if (apiProvider === 'anthropic') {
                // Similar para Anthropic...
                console.log('⚠️ Anthropic no implementado aún, usando plantilla base');
                return baseTemplate;
            }

            // Si no hay proveedor válido
            console.log('⚠️ Sin proveedor de IA válido, usando plantilla base');
            return baseTemplate;

        } catch (error) {
            console.error('❌ Error enriqueciendo con IA:', error.message);

            // Si es error de créditos, informar específicamente
            if (error.message.includes('429') || error.message.includes('quota')) {
                console.log('⚠️ Sin créditos en OpenAI, usando plantilla base');
                return {
                    ...baseTemplate,
                    reasoning: baseTemplate.reasoning + ' (IA no disponible: sin créditos)'
                };
            }

            // Para otros errores, usar plantilla base
            console.log('⚠️ Error inesperado, usando plantilla base sin personalización');
            return {
                ...baseTemplate,
                reasoning: baseTemplate.reasoning + ' (Error en personalización IA)'
            };
        }
    }

    /**
     * Construye el prompt para la IA
     */
    static buildPrompt(params) {
        return BREAKDOWN_PROMPT
            .replace('{title}', params.title)
            .replace('{description}', params.description || 'Sin descripción adicional')
            .replace('{category}', params.category)
            .replace('{strategy}', params.strategy);
    }

    /**
     * Parsea la respuesta de la IA
     */
    static parseAIResponse(content) {
        try {
            // Intentar extraer JSON del contenido
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Validar estructura
                if (!parsed.milestones || !Array.isArray(parsed.milestones)) {
                    throw new Error('Respuesta sin milestones válidos');
                }

                // Añadir order a cada milestone
                const milestones = parsed.milestones.map((m, idx) => ({
                    title: m.title || `Paso ${idx + 1}`,
                    description: m.description || '',
                    time_estimate: m.time_estimate || 45,
                    order: idx + 1
                }));

                return {
                    generated_milestones: milestones,
                    reasoning: parsed.reasoning || 'Generado con IA',
                    ai_provider: 'ai'
                };
            }

            throw new Error('No se encontró JSON en la respuesta');
        } catch (error) {
            console.error('Error parseando respuesta IA:', error);
            throw new Error('Error procesando respuesta de IA: ' + error.message);
        }
    }

    /**
     * Troceado con OpenAI
     */
    static async openaiBreakdown(params) {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error('OPENAI_API_KEY no configurada. Añádela al archivo .env');
        }

        try {
            // Importación dinámica para no requerir el paquete si no se usa
            const { default: OpenAI } = await import('openai');
            const openai = new OpenAI({ apiKey });

            const prompt = this.buildPrompt(params);

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini', // Modelo rápido y económico
                messages: [
                    { role: 'system', content: 'Eres un coach de productividad. Responde SOLO con JSON válido.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Respuesta vacía de OpenAI');
            }

            console.log('✅ OpenAI: Pasos generados exitosamente');
            const result = this.parseAIResponse(content);
            result.ai_provider = 'openai';
            result.model = 'gpt-4o-mini';
            return result;

        } catch (error) {
            console.error('❌ Error OpenAI:', error.message);

            // Si falla la IA, fallback a templates
            if (error.message.includes('API key') || error.message.includes('401')) {
                throw new Error('API key de OpenAI inválida o expirada');
            }

            // Error 429: Sin créditos
            if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('insufficient_quota')) {
                console.log('⚠️ Sin créditos en OpenAI, usando templates');
                const fallback = this.templateBreakdown(params);
                fallback.reasoning += ' (IA no disponible: sin créditos en OpenAI)';
                fallback.ai_provider = 'template';
                fallback.model = 'templates-locales';
                return fallback;
            }

            // Otros errores: Fallback silencioso a templates
            console.log('⚠️ Fallback a templates por error de OpenAI:', error.message);
            const fallback = this.templateBreakdown(params);
            fallback.reasoning += ` (Fallback: ${error.message.substring(0, 100)})`;
            return fallback;
        }
    }

    /**
     * Troceado con Anthropic/Claude
     */
    static async anthropicBreakdown(params) {
        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY no configurada. Añádela al archivo .env');
        }

        try {
            // Importación dinámica
            const { default: Anthropic } = await import('@anthropic-ai/sdk');
            const anthropic = new Anthropic({ apiKey });

            const prompt = this.buildPrompt(params);

            const response = await anthropic.messages.create({
                model: 'claude-3-haiku-20240307', // Modelo rápido y económico
                max_tokens: 1000,
                messages: [
                    { role: 'user', content: prompt }
                ],
                system: 'Eres un coach de productividad. Responde SOLO con JSON válido, sin texto adicional.'
            });

            const content = response.content[0]?.text;
            if (!content) {
                throw new Error('Respuesta vacía de Anthropic');
            }

            const result = this.parseAIResponse(content);
            result.ai_provider = 'anthropic';
            return result;

        } catch (error) {
            console.error('Error Anthropic:', error);

            if (error.message.includes('API key') || error.message.includes('401')) {
                throw new Error('API key de Anthropic inválida o expirada');
            }

            // Fallback silencioso a templates
            console.log('Fallback a templates por error de Anthropic');
            const fallback = this.templateBreakdown(params);
            fallback.reasoning += ' (Fallback: error en Anthropic)';
            return fallback;
        }
    }

    /**
     * Verifica qué proveedores de IA están disponibles
     */
    static getAvailableProviders() {
        const providers = ['template']; // Siempre disponible

        if (process.env.OPENAI_API_KEY) {
            providers.push('openai');
        }

        if (process.env.ANTHROPIC_API_KEY) {
            providers.push('anthropic');
        }

        return providers;
    }
}

export default AIService;
