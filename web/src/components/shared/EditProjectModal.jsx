import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Tag, Hash, Target } from 'lucide-react';
import useAreaCategories from '../../hooks/useAreaCategories';
import useObjectivesCatalog from '../../hooks/useObjectivesCatalog';

const EditProjectModal = ({ project, onClose, onSave }) => {
  const { categories } = useAreaCategories();
  const { objectiveOptions, loadingObjectives, objectivesError } = useObjectivesCatalog();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'trabajo',
    strategy: 'goteo',
    objectiveId: null,
  });

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        description: project.description || '',
        category: project.category || 'trabajo',
        strategy: project.strategy || 'goteo',
        objectiveId: project.objectiveId || null,
      });
    }
  }, [project]);

  const strategies = [
    { id: 'goteo', label: 'Goteo', description: 'Una tarea a la vez' },
    { id: 'bloque', label: 'Bloque', description: 'Todas juntas' },
    { id: 'paralelo', label: 'Paralelo', description: 'Varias a la vez' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('El titulo es obligatorio');
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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Editar Proyecto</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Titulo del proyecto
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

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Descripcion
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 min-h-[100px]"
              placeholder="De que trata este proyecto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Tag size={14} />
              Area
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

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Target size={14} />
              Objetivo estrategico (opcional)
            </label>
            <select
              value={formData.objectiveId || ''}
              onChange={(e) => setFormData({ ...formData, objectiveId: e.target.value || null })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500"
            >
              <option value="">Sin objetivo vinculado</option>
              {objectiveOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {loadingObjectives && <p className="text-xs text-gray-500 mt-1">Cargando objetivos...</p>}
            {!loadingObjectives && objectivesError && (
              <p className="text-xs text-yellow-400 mt-1">
                {objectivesError}. Si no tienes objetivos, crea uno en la vista Objetivos.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Hash size={14} />
              Estrategia de ejecucion
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
