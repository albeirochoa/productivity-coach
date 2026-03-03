/**
 * Content Project Templates (Fase 9.1) + Learning Templates (Fase 11)
 *
 * Pre-defined templates for content creation workflows and learning structures.
 * LLM agent can suggest these when user mentions content creation or learning.
 */

export const CONTENT_TEMPLATES = {
    'contenido:video': {
        id: 'contenido:video',
        name: 'Producción de Video',
        category: 'trabajo',
        description: 'Workflow completo para crear y publicar un video',
        milestones: [
            {
                title: 'Idea y guión',
                timeEstimate: 120,
                category: 'trabajo',
                priority: 'high',
            },
            {
                title: 'Grabación',
                timeEstimate: 180,
                category: 'trabajo',
                priority: 'high',
            },
            {
                title: 'Edición',
                timeEstimate: 240,
                category: 'trabajo',
                priority: 'normal',
            },
            {
                title: 'Thumbnail y metadatos',
                timeEstimate: 60,
                category: 'trabajo',
                priority: 'normal',
            },
            {
                title: 'Publicación y promoción',
                timeEstimate: 45,
                category: 'trabajo',
                priority: 'normal',
            },
        ],
    },
    'contenido:podcast': {
        id: 'contenido:podcast',
        name: 'Episodio de Podcast',
        category: 'trabajo',
        description: 'Workflow para grabar y publicar un episodio',
        milestones: [
            {
                title: 'Preparar tema y outline',
                timeEstimate: 60,
                category: 'trabajo',
                priority: 'high',
            },
            {
                title: 'Grabación del episodio',
                timeEstimate: 90,
                category: 'trabajo',
                priority: 'high',
            },
            {
                title: 'Edición de audio',
                timeEstimate: 120,
                category: 'trabajo',
                priority: 'normal',
            },
            {
                title: 'Show notes y timestamps',
                timeEstimate: 45,
                category: 'trabajo',
                priority: 'normal',
            },
            {
                title: 'Publicación en plataformas',
                timeEstimate: 30,
                category: 'trabajo',
                priority: 'normal',
            },
        ],
    },
    'contenido:blog': {
        id: 'contenido:blog',
        name: 'Artículo de Blog',
        category: 'trabajo',
        description: 'Proceso de escritura y publicación',
        milestones: [
            {
                title: 'Investigación y outline',
                timeEstimate: 90,
                category: 'trabajo',
                priority: 'high',
            },
            {
                title: 'Primer borrador',
                timeEstimate: 120,
                category: 'trabajo',
                priority: 'high',
            },
            {
                title: 'Edición y revisión',
                timeEstimate: 60,
                category: 'trabajo',
                priority: 'normal',
            },
            {
                title: 'Imágenes y SEO',
                timeEstimate: 45,
                category: 'trabajo',
                priority: 'normal',
            },
            {
                title: 'Publicación y distribución',
                timeEstimate: 30,
                category: 'trabajo',
                priority: 'normal',
            },
        ],
    },
    'contenido:newsletter': {
        id: 'contenido:newsletter',
        name: 'Newsletter Semanal',
        category: 'trabajo',
        description: 'Curación y envío de newsletter',
        milestones: [
            {
                title: 'Curación de contenido',
                timeEstimate: 60,
                category: 'trabajo',
                priority: 'high',
            },
            {
                title: 'Redacción y edición',
                timeEstimate: 90,
                category: 'trabajo',
                priority: 'high',
            },
            {
                title: 'Diseño y formato',
                timeEstimate: 45,
                category: 'trabajo',
                priority: 'normal',
            },
            {
                title: 'Revisión y test de envío',
                timeEstimate: 30,
                category: 'trabajo',
                priority: 'normal',
            },
        ],
    },
};

/**
 * Detect if user message is requesting content creation.
 * Returns template ID or null.
 */
export function detectContentIntent(message) {
    const lower = message.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // Video keywords
    if (
        lower.includes('video') ||
        lower.includes('grabar un video') ||
        lower.includes('youtube')
    ) {
        return 'contenido:video';
    }

    // Podcast keywords
    if (
        lower.includes('podcast') ||
        lower.includes('episodio') ||
        lower.includes('grabar audio')
    ) {
        return 'contenido:podcast';
    }

    // Blog keywords
    if (
        lower.includes('articulo') ||
        lower.includes('blog post') ||
        lower.includes('escribir') && (lower.includes('blog') || lower.includes('post'))
    ) {
        return 'contenido:blog';
    }

    // Newsletter keywords
    if (
        lower.includes('newsletter') ||
        lower.includes('boletin')
    ) {
        return 'contenido:newsletter';
    }

    return null;
}

/**
 * Create a project from a content template.
 */
export async function createFromContentTemplate(templateId, title, deps) {
    const { writeJson, readJson, generateId } = deps;

    const template = CONTENT_TEMPLATES[templateId];
    if (!template) {
        throw new Error(`Template not found: ${templateId}`);
    }

    const data = await readJson('tasks-data.json');

    const projectId = generateId('task');
    const project = {
        id: projectId,
        title: title || template.name,
        type: 'project',
        status: 'active',
        category: template.category,
        thisWeek: false,
        milestones: template.milestones.map((m, idx) => ({
            id: `${projectId}-m${idx + 1}`,
            ...m,
            completed: false,
        })),
        committedMilestones: [],
        sections: [],
        createdAt: new Date().toISOString(),
    };

    data.tasks.push(project);
    await writeJson('tasks-data.json', data);

    return project;
}

// ─── Learning Templates (Fase 11) ────────────────────────────

export const LEARNING_TEMPLATES = {
    'aprender:curso': {
        id: 'aprender:curso',
        name: 'Curso/Formación',
        category: 'aprender',
        description: 'Estructura para completar un curso con módulos',
        defaultKRs: [
            {
                titleTemplate: 'Completar curso de {skill}',
                metricType: 'percentage',
                startValue: 0,
                targetValue: 100,
                unit: '%',
            },
            {
                titleTemplate: 'Aplicar {skill} en {practiceCount} proyectos reales',
                metricType: 'number',
                startValue: 0,
                targetValue: 3,
                unit: 'proyectos',
            },
            {
                titleTemplate: 'Documentar {docCount} aprendizajes clave de {skill}',
                metricType: 'number',
                startValue: 0,
                targetValue: 5,
                unit: 'artículos',
            },
        ],
        generateMilestones: (moduleCount, moduleNames) => {
            return Array.from({ length: moduleCount }, (_, i) => ({
                title: moduleNames?.[i] || `Completar Módulo ${i + 1}`,
                timeEstimate: 120,
                category: 'aprender',
            }));
        },
    },
    'aprender:skill': {
        id: 'aprender:skill',
        name: 'Aprender Skill (autodidacta)',
        category: 'aprender',
        description: 'Estructura para aprender una habilidad sin curso formal',
        defaultKRs: [
            {
                titleTemplate: 'Alcanzar nivel intermedio en {skill}',
                metricType: 'percentage',
                startValue: 0,
                targetValue: 100,
                unit: '%',
            },
            {
                titleTemplate: 'Completar {practiceCount} proyectos prácticos de {skill}',
                metricType: 'number',
                startValue: 0,
                targetValue: 3,
                unit: 'proyectos',
            },
        ],
        defaultMilestones: [
            { title: 'Investigar recursos y crear plan de estudio', timeEstimate: 60 },
            { title: 'Fundamentos teóricos', timeEstimate: 120 },
            { title: 'Primer ejercicio práctico', timeEstimate: 90 },
            { title: 'Práctica guiada', timeEstimate: 120 },
            { title: 'Proyecto personal aplicado', timeEstimate: 180 },
            { title: 'Revisión y documentación', timeEstimate: 60 },
        ],
    },
};

/**
 * Detect if user message is requesting a learning structure.
 * Returns template ID or null.
 */
export function detectLearningIntent(message) {
    const lower = message.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const learningKeywords = [
        'quiero aprender', 'voy a aprender', 'voy a estudiar',
        'quiero estudiar', 'necesito aprender',
        'tengo un curso', 'empezar un curso', 'iniciar un curso',
        'hacer un curso', 'tomar un curso', 'voy a hacer un curso',
        'objetivo de aprendizaje', 'plan de estudio',
        'aprender sobre', 'formarme en', 'capacitarme en',
    ];

    if (learningKeywords.some(k => lower.includes(k))) {
        const moduleMatch = lower.match(/(\d+)\s*modulos?/);
        if (moduleMatch) return 'aprender:curso';
        if (lower.includes('curso')) return 'aprender:curso';
        return 'aprender:skill';
    }

    return null;
}
