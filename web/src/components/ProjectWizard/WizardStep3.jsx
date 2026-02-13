import { CheckCircle, Save } from 'lucide-react';
import { useState } from 'react';

const WizardStep3 = ({ projectForm, generatedMilestones, wasManuallyCreated, onBack, onCreate }) => {
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/20 rounded-xl p-4 text-sm">
        <p className="font-semibold mb-2">Resumen</p>
        <p className="text-white/80">Revisa antes de crear.</p>
      </div>

      <div className="bg-white/5 rounded-xl p-6 space-y-4">
        <div>
          <p className="text-xs text-white/40 uppercase">Proyecto</p>
          <p className="text-xl font-bold">{projectForm.title}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40 uppercase">Categoria</p>
            <p className="font-medium capitalize">{projectForm.category}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase">Estrategia</p>
            <p className="font-medium">
              {projectForm.strategy === 'goteo' ? 'Goteo' : 'Batching'}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-white/40 uppercase mb-2">{generatedMilestones.length} Pasos</p>
          {generatedMilestones.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm py-1">
              <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs">
                {idx + 1}
              </div>
              <span className="flex-1">{m.title}</span>
              <span className="text-white/40">{m.time_estimate || 45} min</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-between">
          <span className="text-white/60">Tiempo total:</span>
          <span className="font-bold">
            {generatedMilestones.reduce((acc, m) => acc + (m.time_estimate || 45), 0)} min
          </span>
        </div>
      </div>

      {/* Opción de guardar como plantilla (solo si fue creado manualmente o con IA) */}
      {wasManuallyCreated && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="saveTemplate"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/30"
            />
            <label htmlFor="saveTemplate" className="text-sm font-medium flex items-center gap-2">
              <Save size={16} className="text-blue-400" />
              Guardar como plantilla para reutilizar
            </label>
          </div>

          {saveAsTemplate && (
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nombre de la plantilla (ej: Video YouTube)"
              className="w-full bg-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <p className="text-xs text-white/50">
            Podrás usar esta plantilla en futuros proyectos similares
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10"
        >
          Editar
        </button>
        <button
          onClick={() => onCreate(saveAsTemplate, templateName)}
          className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 font-bold text-lg flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          {saveAsTemplate ? 'Crear y Guardar Plantilla!' : 'Crear Proyecto!'}
        </button>
      </div>
    </div>
  );
};

export default WizardStep3;
