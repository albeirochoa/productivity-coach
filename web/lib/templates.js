/**
 * Templates inteligentes para troceado automático de tareas
 * Basado en categoría + tipo de proyecto detectado
 */

// Diccionario de templates por categoría:tipo
const TEMPLATES = {
    // === CONTENIDO ===
    'contenido:video': [
        { title: 'Definir tema y estructura', time_estimate: 30, description: 'Elegir enfoque, público objetivo y puntos clave' },
        { title: 'Escribir guion', time_estimate: 45, description: 'Redactar el script completo del video' },
        { title: 'Preparar recursos visuales', time_estimate: 45, description: 'Slides, imágenes, b-roll necesario' },
        { title: 'Grabar video', time_estimate: 45, description: 'Grabación del contenido principal' },
        { title: 'Editar y exportar', time_estimate: 45, description: 'Edición, corrección de color, audio y exportación' },
        { title: 'Publicar y promocionar', time_estimate: 30, description: 'Subir, escribir descripción, thumbnail y compartir' }
    ],

    'contenido:blog': [
        { title: 'Research y documentación', time_estimate: 30, description: 'Investigar fuentes, ejemplos y keywords del tema' },
        { title: 'Crear esquema del artículo', time_estimate: 20, description: 'Definir estructura, headers y puntos principales' },
        { title: 'Escribir introducción y desarrollo', time_estimate: 45, description: 'Redactar el contenido principal del post' },
        { title: 'Añadir ejemplos y casos prácticos', time_estimate: 30, description: 'Incluir screenshots, casos de uso reales' },
        { title: 'Revisar y optimizar SEO', time_estimate: 25, description: 'Corrección, meta description y keywords' },
        { title: 'Publicar y promocionar', time_estimate: 15, description: 'Subir al blog/WordPress y compartir en redes' }
    ],

    'contenido:podcast': [
        { title: 'Definir tema y puntos clave', time_estimate: 20, description: 'Esquema del episodio y talking points' },
        { title: 'Preparar notas/guion', time_estimate: 30, description: 'Notas de referencia para la grabación' },
        { title: 'Grabar episodio', time_estimate: 45, description: 'Grabación del audio principal' },
        { title: 'Editar audio', time_estimate: 45, description: 'Cortes, niveles, música intro/outro' },
        { title: 'Publicar y promocionar', time_estimate: 20, description: 'Subir a plataformas y compartir' }
    ],

    'contenido:curso': [
        { title: 'Definir estructura del curso', time_estimate: 45, description: 'Módulos, lecciones y objetivos de aprendizaje' },
        { title: 'Crear contenido módulo 1', time_estimate: 60, description: 'Desarrollar primer módulo completo' },
        { title: 'Grabar/escribir lecciones', time_estimate: 60, description: 'Producir el contenido de las lecciones' },
        { title: 'Crear ejercicios prácticos', time_estimate: 45, description: 'Diseñar actividades y evaluaciones' },
        { title: 'Revisar y pulir', time_estimate: 30, description: 'Quality check del contenido' },
        { title: 'Configurar plataforma', time_estimate: 30, description: 'Subir a plataforma y configurar acceso' }
    ],

    // === TRABAJO/DESARROLLO ===
    'trabajo:app': [
        { title: 'Definir requisitos', time_estimate: 45, description: 'Documentar funcionalidades y alcance' },
        { title: 'Diseño de interfaz', time_estimate: 45, description: 'Wireframes o mockups básicos' },
        { title: 'Setup del proyecto', time_estimate: 30, description: 'Configurar repo, dependencias y estructura' },
        { title: 'Implementar feature principal', time_estimate: 60, description: 'Desarrollar la funcionalidad core' },
        { title: 'Testing básico', time_estimate: 30, description: 'Probar y corregir bugs principales' },
        { title: 'Deploy inicial', time_estimate: 30, description: 'Desplegar versión funcional' }
    ],

    'trabajo:web': [
        { title: 'Definir estructura y contenido', time_estimate: 30, description: 'Páginas, secciones y textos principales' },
        { title: 'Diseñar layout', time_estimate: 45, description: 'Diseño visual de las páginas' },
        { title: 'Desarrollar maqueta', time_estimate: 60, description: 'HTML/CSS/JS de la estructura' },
        { title: 'Integrar contenido', time_estimate: 45, description: 'Añadir textos, imágenes y multimedia' },
        { title: 'Testing y optimización', time_estimate: 30, description: 'Revisar responsive, velocidad y SEO básico' },
        { title: 'Publicar', time_estimate: 20, description: 'Deploy y configuración de dominio' }
    ],

    'trabajo:automatizacion': [
        { title: 'Mapear proceso actual', time_estimate: 30, description: 'Documentar el flujo manual actual' },
        { title: 'Identificar puntos de automatización', time_estimate: 20, description: 'Definir qué se puede automatizar' },
        { title: 'Diseñar solución', time_estimate: 30, description: 'Elegir herramientas y diseñar flujo' },
        { title: 'Implementar automatización', time_estimate: 60, description: 'Configurar o programar la solución' },
        { title: 'Testing y ajustes', time_estimate: 30, description: 'Probar y refinar el flujo automático' }
    ],

    // === APRENDER ===
    'aprender:skill': [
        { title: 'Investigar recursos', time_estimate: 30, description: 'Encontrar mejores cursos/libros/tutoriales' },
        { title: 'Planificar ruta de aprendizaje', time_estimate: 20, description: 'Definir orden y milestones' },
        { title: 'Estudiar fundamentos', time_estimate: 60, description: 'Completar primeros capítulos/módulos' },
        { title: 'Práctica guiada', time_estimate: 60, description: 'Ejercicios con instrucciones' },
        { title: 'Proyecto personal pequeño', time_estimate: 60, description: 'Aplicar lo aprendido en algo propio' },
        { title: 'Revisar y consolidar', time_estimate: 30, description: 'Repasar conceptos y documentar aprendizajes' }
    ],

    'aprender:idioma': [
        { title: 'Evaluar nivel actual', time_estimate: 20, description: 'Test de nivel y definir objetivos' },
        { title: 'Configurar rutina de práctica', time_estimate: 20, description: 'Apps, recursos y horarios' },
        { title: 'Vocabulario básico', time_estimate: 45, description: 'Aprender palabras esenciales del tema' },
        { title: 'Gramática fundamental', time_estimate: 45, description: 'Estructuras básicas del idioma' },
        { title: 'Práctica de conversación', time_estimate: 45, description: 'Speaking con nativo o app' },
        { title: 'Inmersión', time_estimate: 45, description: 'Consumir contenido en el idioma' }
    ],

    // === CLIENTES ===
    'clientes:proyecto': [
        { title: 'Kickoff con cliente', time_estimate: 45, description: 'Reunión inicial para alinear expectativas' },
        { title: 'Documentar requisitos', time_estimate: 30, description: 'Especificaciones claras y acordadas' },
        { title: 'Primer entregable', time_estimate: 60, description: 'Avance inicial para validación' },
        { title: 'Feedback y ajustes', time_estimate: 30, description: 'Incorporar comentarios del cliente' },
        { title: 'Entrega final', time_estimate: 45, description: 'Versión final y documentación' },
        { title: 'Cierre y seguimiento', time_estimate: 20, description: 'Facturación y feedback post-proyecto' }
    ],

    'clientes:propuesta': [
        { title: 'Investigar al cliente', time_estimate: 20, description: 'Entender su negocio y necesidades' },
        { title: 'Definir alcance', time_estimate: 30, description: 'Qué incluye y qué no incluye' },
        { title: 'Calcular presupuesto', time_estimate: 30, description: 'Costos, tiempo y precio final' },
        { title: 'Redactar propuesta', time_estimate: 45, description: 'Documento formal con todos los detalles' },
        { title: 'Revisar y enviar', time_estimate: 20, description: 'Quality check y envío al cliente' }
    ],

    // === GENÉRICO (fallback) ===
    'generico': [
        { title: 'Definir objetivo claro', time_estimate: 20, description: 'Qué resultado concreto quieres lograr' },
        { title: 'Investigar y planificar', time_estimate: 30, description: 'Recopilar info necesaria y hacer plan' },
        { title: 'Ejecutar tarea principal', time_estimate: 45, description: 'Acción principal del proyecto' },
        { title: 'Revisar resultado', time_estimate: 20, description: 'Verificar calidad del entregable' },
        { title: 'Finalizar y documentar', time_estimate: 20, description: 'Cerrar y guardar aprendizajes' }
    ]
};

// Palabras clave para detectar tipo de proyecto (ORDEN IMPORTA - de más específico a más general)
const TYPE_KEYWORDS = {
    blog: ['blog', 'artículo', 'post', 'escribir post', 'redactar', 'publicar texto', 'contenido escrito'],
    video: ['video', 'youtube', 'vlog', 'tutorial video', 'grabar', 'filmar'],
    podcast: ['podcast', 'audio', 'episodio', 'entrevista audio'],
    curso: ['curso', 'formación', 'enseñar', 'capacitación', 'workshop', 'taller'],
    web: ['web', 'página', 'sitio', 'landing', 'website'],
    app: ['app', 'aplicación', 'software', 'programa', 'desarrollar app', 'feature', 'funcionalidad'],
    automatizacion: ['automatizar', 'automatización', 'script', 'bot', 'workflow'],
    skill: ['aprender', 'estudiar', 'dominar', 'skill', 'habilidad'],
    idioma: ['idioma', 'inglés', 'español', 'francés', 'alemán', 'language'],
    proyecto: ['proyecto cliente', 'encargo', 'freelance', 'trabajo para'],
    propuesta: ['propuesta', 'cotización', 'presupuesto', 'quote']
};

/**
 * Detecta el tipo de proyecto basado en el título y descripción
 */
function detectProjectType(title, description = '') {
    const text = `${title} ${description}`.toLowerCase();

    for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                return type;
            }
        }
    }

    return null; // No se detectó tipo específico
}

/**
 * Obtiene el template apropiado para un proyecto
 */
function getTemplateForProject(category, title, description = '') {
    const type = detectProjectType(title, description);

    // Intentar match exacto categoría:tipo
    if (type) {
        const key = `${category}:${type}`;
        if (TEMPLATES[key]) {
            return {
                milestones: TEMPLATES[key],
                detected_type: type,
                template_key: key
            };
        }
    }

    // Buscar cualquier template de la categoría
    const categoryTemplates = Object.keys(TEMPLATES).filter(k => k.startsWith(`${category}:`));
    if (categoryTemplates.length > 0) {
        const firstMatch = categoryTemplates[0];
        return {
            milestones: TEMPLATES[firstMatch],
            detected_type: firstMatch.split(':')[1],
            template_key: firstMatch
        };
    }

    // Fallback a genérico
    return {
        milestones: TEMPLATES['generico'],
        detected_type: 'generico',
        template_key: 'generico'
    };
}

/**
 * Genera troceado usando templates
 */
function templateBreakdown(params) {
    const { title, description, category, strategy } = params;

    const result = getTemplateForProject(category, title, description);

    // Ajustar según estrategia
    let milestones = result.milestones.map((m, idx) => ({
        ...m,
        order: idx + 1
    }));

    // Para batching, podemos sugerir tiempos más cortos (sprints intensivos)
    if (strategy === 'batching') {
        milestones = milestones.map(m => ({
            ...m,
            time_estimate: Math.min(m.time_estimate, 45) // Max 45 min en batching
        }));
    }

    return {
        generated_milestones: milestones,
        detected_type: result.detected_type,
        template_used: result.template_key,
        reasoning: `Troceado basado en template "${result.template_key}" con ${milestones.length} pasos.`
    };
}

export {
    TEMPLATES,
    TYPE_KEYWORDS,
    detectProjectType,
    getTemplateForProject,
    templateBreakdown
};
