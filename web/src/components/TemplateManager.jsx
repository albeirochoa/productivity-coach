import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit2, X, Check, ChevronDown } from 'lucide-react';
import { api } from '../utils/api';

const TemplateManager = ({ show, onClose, onRefresh }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (show) {
      loadTemplates();
    }
  }, [show]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      alert('Error al cargar plantillas');
    }
    setLoading(false);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('¿Eliminar esta plantilla? No se puede deshacer.')) {
      return;
    }

    try {
      await api.deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      alert('Plantilla eliminada');
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error al eliminar plantilla');
    }
  };

  const handleEditName = async (templateId, newName) => {
    if (!newName.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }

    try {
      await api.updateTemplate(templateId, { name: newName });
      setTemplates(prev =>
        prev.map(t => t.id === templateId ? { ...t, name: newName } : t)
      );
      setEditingId(null);
      alert('Plantilla actualizada');
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Error al actualizar plantilla');
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass p-6 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Mis Plantillas</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin inline-block">⏳</div>
              <p className="text-white/60 mt-2">Cargando plantillas...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && templates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/60 text-lg">No tienes plantillas guardadas</p>
              <p className="text-white/40 text-sm mt-2">
                Crea un proyecto manualmente y guarda como plantilla para reutilizarlo después
              </p>
            </div>
          )}

          {/* Templates List */}
          {!loading && templates.length > 0 && (
            <div className="space-y-3">
              {templates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  {/* Header Row */}
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      {editingId === template.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          className="w-full bg-white/10 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditName(template.id, editingName);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                        />
                      ) : (
                        <div>
                          <h3 className="font-semibold text-white">{template.name}</h3>
                          <div className="flex gap-3 text-xs text-white/50 mt-1">
                            <span>📋 {template.milestones.length} pasos</span>
                            <span>📌 {template.category}</span>
                            <span>⏱️ {template.strategy === 'goteo' ? 'Goteo' : 'Batching'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {editingId === template.id ? (
                        <>
                          <button
                            onClick={() => handleEditName(template.id, editingName)}
                            className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors text-green-400"
                            title="Guardar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(template.id);
                              setEditingName(template.name);
                            }}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors text-blue-400"
                            title="Editar nombre"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            title={expandedId === template.id ? 'Contraer' : 'Expandir'}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                expandedId === template.id ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Milestones */}
                  <AnimatePresence>
                    {expandedId === template.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10 bg-white/2 overflow-hidden"
                      >
                        <div className="p-4 space-y-2">
                          {template.milestones.map((milestone, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-sm">
                              <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-medium">{milestone.title}</p>
                                {milestone.description && (
                                  <p className="text-white/60 text-xs mt-1">{milestone.description}</p>
                                )}
                                <p className="text-white/40 text-xs mt-1">
                                  ⏱️ {milestone.time_estimate} min
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

              {/* Summary */}
              <div className="mt-6 pt-4 border-t border-white/10 text-sm text-white/60">
                <p>
                  Total: <span className="text-white font-semibold">{templates.length}</span> plantillas guardadas
                </p>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemplateManager;
