import { Sparkles, Zap, CheckCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const WizardStep1 = ({ projectForm, setProjectForm, isGenerating, onGenerateSteps, onUseTemplate }) => {
  const [userTemplates, setUserTemplates] = useState([]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await api.getTemplates();
        setUserTemplates(response.data || []);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };
    loadTemplates();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-purple-500/20 rounded-xl p-4 text-sm">
        <p className="font-semibold mb-2">Describe tu proyecto</p>
        <p className="text-white/80">Lo dividiremos en pasos de maximo 45 minutos.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Titulo *</label>
        <input
          type="text"
          value={projectForm.title}
          onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
          className="w-full bg-white/5 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Ej: Crear Video YouTube sobre Google Ads"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Descripcion (opcional)</label>
        <textarea
          value={projectForm.description}
          onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
          className="w-full bg-white/5 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows="2"
          placeholder="Mas detalles..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Categoria</label>
          <select
            value={projectForm.category}
            onChange={(e) => setProjectForm(prev => ({ ...prev, category: e.target.value }))}
            className="w-full bg-white/5 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="trabajo">Trabajo</option>
            <option value="contenido">Contenido</option>
            <option value="clientes">Clientes</option>
            <option value="aprender">Aprender</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Estrategia</label>
          <select
            value={projectForm.strategy}
            onChange={(e) => setProjectForm(prev => ({ ...prev, strategy: e.target.value }))}
            className="w-full bg-white/5 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="goteo">Goteo (1 paso/semana)</option>
            <option value="batching">Batching (sprint)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Plantilla (opcional)</label>
        <select
          value={projectForm.templateId}
          onChange={(e) => setProjectForm(prev => ({ ...prev, templateId: e.target.value }))}
          className="w-full bg-white/5 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Sin plantilla (crear desde 0)</option>

          {/* Plantillas guardadas por el usuario */}
          {userTemplates.length > 0 && (
            <optgroup label="Mis Plantillas">
              {userTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.milestones.length} pasos)
                </option>
              ))}
            </optgroup>
          )}

          {/* Plantillas predefinidas */}
          <optgroup label="Contenido">
            <option value="contenido:blog">Post de blog</option>
            <option value="contenido:video">Video YouTube</option>
            <option value="contenido:curso">Curso online</option>
          </optgroup>
          <optgroup label="Trabajo">
            <option value="trabajo:app">Desarrollar app</option>
            <option value="trabajo:web">Crear sitio web</option>
          </optgroup>
        </select>
      </div>

      <div className="pt-4 border-t border-white/10">
        <p className="text-sm text-white/60 mb-3">Como quieres generar los pasos?</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onGenerateSteps(false)}
            disabled={isGenerating || !projectForm.title.trim()}
            className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 flex flex-col items-center gap-1"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span className="font-semibold">Generar</span>
            <span className="text-xs text-white/70">
              {projectForm.templateId ? 'Usar plantilla' : 'Crear desde 0'}
            </span>
          </button>
          <button
            onClick={() => onGenerateSteps(true)}
            disabled={isGenerating || !projectForm.title.trim()}
            className="p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex flex-col items-center gap-1"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            <span className="font-semibold">Generar con IA</span>
            <span className="text-xs text-white/70">Personalizado</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WizardStep1;
