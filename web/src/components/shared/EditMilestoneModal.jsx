import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Calendar, Tag, AlertCircle } from 'lucide-react';

const EditMilestoneModal = ({ milestone, projectId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    timeEstimate: 45,
    category: 'trabajo',
    priority: 'normal',
    dueDate: '',
  });

  useEffect(() => {
    if (milestone) {
      setFormData({
        title: milestone.title || '',
        description: milestone.description || '',
        timeEstimate: milestone.timeEstimate || 45,
        category: milestone.category || 'trabajo',
        priority: milestone.priority || 'normal',
        dueDate: milestone.dueDate || '',
      });
    }
  }, [milestone]);

  const categories = [
    { id: 'trabajo', label: 'Trabajo', color: 'bg-blue-500' },
    { id: 'personal', label: 'Personal', color: 'bg-green-500' },
    { id: 'clientes', label: 'Clientes', color: 'bg-purple-500' },
    { id: 'aprender', label: 'Aprender', color: 'bg-yellow-500' },
  ];

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

    await onSave(projectId, milestone.id, formData);
    onClose();
  };

  if (!milestone) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0e27] border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Editar Tarea</h3>
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
              Titulo
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500"
              placeholder="Nombre de la tarea..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Descripcion (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 min-h-[80px]"
              placeholder="Detalles de la tarea..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Tag size={14} />
              Categoria
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

          {/* Priority */}
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

          {/* Due Date */}
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

          {/* Time Estimate */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Clock size={14} />
              Estimacion de tiempo (minutos)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="240"
                step="5"
                value={formData.timeEstimate}
                onChange={(e) => setFormData({ ...formData, timeEstimate: parseInt(e.target.value) })}
                className="flex-1"
              />
              <input
                type="number"
                min="5"
                max="240"
                value={formData.timeEstimate}
                onChange={(e) => setFormData({ ...formData, timeEstimate: parseInt(e.target.value) || 45 })}
                className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 text-center"
              />
              <span className="text-sm text-gray-400">min</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {formData.timeEstimate < 30 && 'Tarea rapida'}
              {formData.timeEstimate >= 30 && formData.timeEstimate < 60 && 'Tarea mediana'}
              {formData.timeEstimate >= 60 && formData.timeEstimate < 120 && 'Tarea larga'}
              {formData.timeEstimate >= 120 && 'Tarea muy larga'}
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

export default EditMilestoneModal;
