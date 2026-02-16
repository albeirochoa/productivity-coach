import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Tag, Hash, AlertCircle, Target, BarChart3 } from 'lucide-react';
import useAreaCategories from '../../hooks/useAreaCategories';
import useObjectivesCatalog from '../../hooks/useObjectivesCatalog';

const EditTaskModal = ({ task, onClose, onSave, projects }) => {
  const { categories } = useAreaCategories();
  const {
    objectiveOptions,
    loadingObjectives,
    objectivesError,
    keyResults,
    loadingKeyResults,
    keyResultsError,
    fetchKeyResults,
  } = useObjectivesCatalog();

  const [formData, setFormData] = useState({
    title: '',
    category: 'trabajo',
    dueDate: '',
    parentId: null,
    priority: 'normal',
    objectiveId: null,
    keyResultId: null,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        category: task.category || task.areaId || 'trabajo',
        dueDate: task.dueDate || '',
        parentId: task.parentId || null,
        priority: task.priority || 'normal',
        objectiveId: task.objectiveId || null,
        keyResultId: task.keyResultId || null,
      });
    }
  }, [task]);

  useEffect(() => {
    fetchKeyResults(formData.objectiveId);
  }, [formData.objectiveId, fetchKeyResults]);

  const priorities = [
    { id: 'low', label: 'Baja', color: 'text-blue-400' },
    { id: 'normal', label: 'Normal', color: 'text-gray-400' },
    { id: 'high', label: 'Alta', color: 'text-red-400' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('El titulo es obligatorio');
      return;
    }

    await onSave(task.id, formData);
    onClose();
  };

  if (!task) return null;

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
          <h3 className="text-xl font-bold">Editar Tarea</h3>
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
              Titulo
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500"
              placeholder="Nombre de la tarea..."
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
              onChange={(e) => {
                const objectiveId = e.target.value || null;
                setFormData((prev) => ({
                  ...prev,
                  objectiveId,
                  keyResultId: null,
                }));
              }}
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
              <p className="text-xs text-yellow-400 mt-1">{objectivesError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <BarChart3 size={14} />
              Key result (opcional)
            </label>
            <select
              value={formData.keyResultId || ''}
              onChange={(e) => setFormData({ ...formData, keyResultId: e.target.value || null })}
              disabled={!formData.objectiveId}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              <option value="">Sin key result vinculado</option>
              {keyResults.map((kr) => (
                <option key={kr.id} value={kr.id}>
                  {kr.title}
                </option>
              ))}
            </select>
            {!formData.objectiveId && (
              <p className="text-xs text-gray-500 mt-1">Primero selecciona un objetivo para ver sus KRs.</p>
            )}
            {loadingKeyResults && <p className="text-xs text-gray-500 mt-1">Cargando KRs...</p>}
            {!loadingKeyResults && keyResultsError && (
              <p className="text-xs text-yellow-400 mt-1">{keyResultsError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <AlertCircle size={14} />
              Prioridad
            </label>
            <div className="flex gap-2">
              {priorities.map((pri) => (
                <button
                  key={pri.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: pri.id })}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                    formData.priority === pri.id
                      ? 'border-cyan-500 bg-cyan-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <span className={`text-sm ${formData.priority === pri.id ? '' : pri.color}`}>
                    {pri.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Calendar size={14} />
              Fecha limite
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500"
            />
          </div>

          {task.type !== 'project' && projects && projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Hash size={14} />
                Asignar a proyecto
              </label>
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500"
              >
                <option value="">Sin proyecto</option>
                {projects
                  .filter((p) => p.type === 'project' && p.status !== 'done')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </div>
          )}

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

export default EditTaskModal;
