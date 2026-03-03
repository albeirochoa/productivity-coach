import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X } from 'lucide-react';
import { api } from '../../utils/api';

const KrProgressPrompt = ({ kr, onClose, onUpdated }) => {
  const [value, setValue] = useState(`${kr?.currentValue ?? 0}`);
  const [saving, setSaving] = useState(false);

  if (!kr) return null;

  const handleSave = async () => {
    const next = Number(value);
    if (Number.isNaN(next)) return;
    setSaving(true);
    try {
      await api.updateKeyResultProgress(kr.id, next);
      onUpdated?.();
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-24 right-8 z-50 w-80 bg-[#1a1f3a]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 shadow-2xl shadow-cyan-500/10"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">Avance de KR</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={14} className="text-gray-400" />
          </button>
        </div>

        <p className="text-sm mb-3">{kr.title}</p>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all"
              style={{ width: `${kr.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{kr.progress}%</span>
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-400">Nuevo valor:</span>
          <input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500/50"
            autoFocus
          />
          <span className="text-xs text-gray-400">/ {kr.targetValue} {kr.unit}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-sm font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Actualizar'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-colors"
          >
            Ahora no
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default KrProgressPrompt;
