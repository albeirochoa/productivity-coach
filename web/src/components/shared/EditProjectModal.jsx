import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Tag, Hash } from 'lucide-react';

const EditProjectModal = ({ project, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'trabajo',
    strategy: 'goteo',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        description: project.description || '',
        category: project.category || 'trabajo',
        strategy: project.strategy || 'goteo',
      });
    }
  }, [project]);

  const categories = [
    { id: 'trabajo', label: 'Trabajo', color: 'bg-blue-500' },
    { id: 'personal', label: 'Personal', color: 'bg-green-500' },
    { id: 'clientes', label: 'Clientes', color: 'bg-purple-500' },
    { id: 'aprender', label: 'Aprender', color: 'bg-yellow-500' },
  ];

  const strategies = [
    { id: 'goteo', label: 'Goteo', description: 'Una tarea a la vez' },
    { id: 'bloque', label: 'Bloque', description: 'Todas juntas' },
    { id: 'paralelo', label: 'Paralelo', description: 'Varias a la vez' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('El título es obligatorio');
      return;
    }

    await onSave(project.id, formData);
    onClose();
  };

  if (!project) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0e27] border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Editar Proyecto</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Título del proyecto
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500"
              placeholder="Nombre del proyecto..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 min-h-[100px]"
              placeholder="¿De qué trata este proyecto?"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Tag size={14} />
              Categoría
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.id })}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    formData.category === cat.id
                      ? 'border-cyan-500 bg-cyan-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                    <span className="text-sm">{cat.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Hash size={14} />
              Estrategia de ejecución
            </label>
            <div className="space-y-2">
              {strategies.map((strat) => (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, strategy: strat.id })}
                  className={`w-full px-4 py-2 rounded-lg border transition-all text-left ${
                    formData.strategy === strat.id
                      ? 'border-cyan-500 bg-cyan-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{strat.label}</span>
                    <span className="text-xs text-gray-500">{strat.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditProjectModal;
