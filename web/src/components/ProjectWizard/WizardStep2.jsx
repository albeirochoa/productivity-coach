import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

const WizardStep2 = ({
  generatedMilestones,
  onUpdateMilestone,
  onDeleteMilestone,
  onAddMilestone,
  onReorderMilestone,
  onBack,
  onContinue,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-green-500/20 rounded-xl p-4 text-sm">
        <p className="font-semibold mb-2">Pasos generados</p>
        <p className="text-white/80">Edita, elimina o anade segun necesites.</p>
      </div>

      <div className="space-y-3">
        {generatedMilestones.map((milestone, idx) => (
          <div key={idx} className="bg-white/5 rounded-xl p-4 group">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={milestone.title}
                  onChange={(e) => onUpdateMilestone(idx, 'title', e.target.value)}
                  className="w-full bg-white/5 rounded-lg p-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={milestone.description || ''}
                    onChange={(e) => onUpdateMilestone(idx, 'description', e.target.value)}
                    className="flex-1 bg-white/5 rounded-lg p-2 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Descripcion..."
                  />
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2">
                    <input
                      type="number"
                      value={milestone.time_estimate || 45}
                      onChange={(e) => onUpdateMilestone(idx, 'time_estimate', parseInt(e.target.value) || 45)}
                      className="w-12 bg-transparent text-center text-sm focus:outline-none"
                      min="5"
                      max="120"
                    />
                    <span className="text-xs text-white/40">min</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 opacity-50 group-hover:opacity-100">
                <button
                  onClick={() => onReorderMilestone(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onReorderMilestone(idx, 'down')}
                  disabled={idx === generatedMilestones.length - 1}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteMilestone(idx)}
                  className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onAddMilestone}
        className="w-full py-3 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-purple-500 hover:text-purple-400 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" /> Anadir paso
      </button>

      <div className="bg-white/5 rounded-xl p-4 flex justify-between">
        <span className="text-white/60">Tiempo total:</span>
        <span className="font-bold">
          {generatedMilestones.reduce((acc, m) => acc + (m.time_estimate || 45), 0)} min
        </span>
      </div>

      <div className="flex gap-3 pt-4 border-t border-white/10">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10"
        >
          Atras
        </button>
        <button
          onClick={onContinue}
          disabled={generatedMilestones.length === 0}
          className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold disabled:opacity-50"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

export default WizardStep2;
