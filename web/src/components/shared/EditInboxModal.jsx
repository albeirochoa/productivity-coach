import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Tag, AlertCircle } from 'lucide-react';
import useAreaCategories from '../../hooks/useAreaCategories';

const EditInboxModal = ({ editingItem, setEditingItem, onSave }) => {
  const { categories } = useAreaCategories();

  if (!editingItem) return null;

  const priorities = [
    { id: 'low', label: 'Baja', color: 'text-blue-400' },
    { id: 'normal', label: 'Normal', color: 'text-gray-400' },
    { id: 'high', label: 'Alta', color: 'text-red-400' },
  ];

  const updateField = (field, value) => {
    setEditingItem(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={() => setEditingItem(null)}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0a0e27] border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Editar Idea</h3>
            <button
              onClick={() => setEditingItem(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Text */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Descripción
              </label>
              <textarea
                value={editingItem.text || ''}
                onChange={(e) => updateField('text', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white min-h-[100px] focus:outline-none focus:border-cyan-500"
                autoFocus
                placeholder="Describe tu idea..."
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
                    onClick={() => updateField('category', cat.id)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      (editingItem.category || 'trabajo') === cat.id
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
                    onClick={() => updateField('priority', pri.id)}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                      (editingItem.priority || 'normal') === pri.id
                        ? 'border-cyan-500 bg-cyan-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span className={`text-sm ${(editingItem.priority || 'normal') === pri.id ? '' : pri.color}`}>
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
                Fecha límite
              </label>
              <input
                type="date"
                value={editingItem.dueDate || ''}
                onChange={(e) => updateField('dueDate', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <button
              onClick={() => setEditingItem(null)}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors"
            >
              Guardar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditInboxModal;
