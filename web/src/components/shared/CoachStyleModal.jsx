import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Volume2, Bell, AlignLeft } from 'lucide-react';
import { api } from '../../utils/api';

const STYLE_OPTIONS = {
  tone: {
    label: 'Tono del coach',
    icon: Volume2,
    options: [
      { value: 'directo', label: 'Directo', desc: 'Orientado a accion' },
      { value: 'suave', label: 'Suave', desc: 'Motivador' },
    ],
  },
  insistence: {
    label: 'Nivel de insistencia',
    icon: Bell,
    options: [
      { value: 'baja', label: 'Baja', desc: 'Sugiere 1 vez' },
      { value: 'media', label: 'Media', desc: '2-3 recordatorios' },
      { value: 'alta', label: 'Alta', desc: 'Persistente' },
    ],
  },
  brevity: {
    label: 'Nivel de detalle',
    icon: AlignLeft,
    options: [
      { value: 'breve', label: 'Breve', desc: 'Respuestas cortas' },
      { value: 'detallado', label: 'Detallado', desc: 'Con razonamiento' },
    ],
  },
};

const StyleToggle = ({ config, value, onChange }) => {
  const Icon = config.icon;
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
        <Icon size={14} className="text-cyan-400" />
        {config.label}
      </label>
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        {config.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
              value === opt.value
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div>{opt.label}</div>
            <div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

const CoachStyleModal = ({ onClose }) => {
  const [style, setStyle] = useState({ tone: 'directo', insistence: 'media', brevity: 'breve' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getCoachStyle()
      .then((res) => setStyle(res.data.coachStyle))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateCoachStyle(style);
      onClose();
    } catch {
      // Keep modal open on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0e27] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Configuracion del Coach</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Cargando...</div>
        ) : (
          <div className="space-y-5">
            {Object.entries(STYLE_OPTIONS).map(([key, config]) => (
              <StyleToggle
                key={key}
                config={config}
                value={style[key]}
                onChange={(val) => setStyle((prev) => ({ ...prev, [key]: val }))}
              />
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm text-white font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CoachStyleModal;
