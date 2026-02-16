import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Users, Video, Heart, GraduationCap, Circle, Target, Layers } from 'lucide-react';

const ICONS = [
  { value: 'Briefcase', icon: Briefcase, label: 'Trabajo' },
  { value: 'Users', icon: Users, label: 'Clientes' },
  { value: 'Video', icon: Video, label: 'Contenido' },
  { value: 'Heart', icon: Heart, label: 'Salud' },
  { value: 'GraduationCap', icon: GraduationCap, label: 'Aprender' },
  { value: 'Target', icon: Target, label: 'Meta' },
  { value: 'Layers', icon: Layers, label: 'Proyectos' },
  { value: 'Circle', icon: Circle, label: 'General' },
];

const COLORS = [
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'purple', label: 'Morado', class: 'bg-purple-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-500' },
  { value: 'red', label: 'Rojo', class: 'bg-red-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'orange', label: 'Naranja', class: 'bg-orange-500' },
  { value: 'gray', label: 'Gris', class: 'bg-gray-500' },
];

const EditAreaModal = ({ show, onClose, onSave, area = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    current_focus: '',
    status: 'active',
    color: 'blue',
    icon: 'Circle',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Pre-fill form if editing existing area
  useEffect(() => {
    if (area) {
      setFormData({
        name: area.name || '',
        description: area.description || '',
        priority: area.priority || 'medium',
        current_focus: area.current_focus || '',
        status: area.status || 'active',
        color: area.color || 'blue',
        icon: area.icon || 'Circle',
      });
    } else {
      // Reset for new area
      setFormData({
        name: '',
        description: '',
        priority: 'medium',
        current_focus: '',
        status: 'active',
        color: 'blue',
        icon: 'Circle',
      });
    }
    setErrors({});
  }, [area, show]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Error al guardar el área' });
    } finally {
      setSaving(false);
    }
  };

  const SelectedIcon = ICONS.find(i => i.value === formData.icon)?.icon || Circle;

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0a0e27]/95 backdrop-blur-sm z-10">
            <h2 className="text-xl font-bold">
              {area ? 'Editar Área' : 'Nueva Área de Vida'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre del área *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 transition-all"
                placeholder="ej: Trabajo, Familia, Salud..."
                maxLength={50}
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 transition-all resize-none"
                placeholder="Describe brevemente esta área de tu vida..."
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/200 caracteres
              </p>
            </div>

            {/* Current Focus */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Enfoque actual
              </label>
              <input
                type="text"
                value={formData.current_focus}
                onChange={(e) => setFormData({ ...formData, current_focus: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 transition-all"
                placeholder="¿En qué te estás enfocando ahora?"
                maxLength={100}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Prioridad
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['high', 'medium', 'low'].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority })}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      formData.priority === priority
                        ? priority === 'high'
                          ? 'bg-red-500/20 border-2 border-red-500 text-red-300'
                          : priority === 'medium'
                          ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-300'
                          : 'bg-blue-500/20 border-2 border-blue-500 text-blue-300'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {priority === 'high' && 'Alta'}
                    {priority === 'medium' && 'Media'}
                    {priority === 'low' && 'Baja'}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Estado
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['active', 'paused', 'archived'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status })}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      formData.status === status
                        ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-300'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {status === 'active' && 'Activa'}
                    {status === 'paused' && 'Pausada'}
                    {status === 'archived' && 'Archivada'}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Icono
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ICONS.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: value })}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      formData.icon === value
                        ? 'bg-cyan-500/20 border-2 border-cyan-500'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-[10px]">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map(({ value, label, class: colorClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: value })}
                    className={`p-3 rounded-xl flex items-center gap-2 transition-all ${
                      formData.color === value
                        ? 'bg-white/10 border-2 border-white/30'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${colorClass}`} />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Vista previa:</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${COLORS.find(c => c.value === formData.color)?.class} flex items-center justify-center`}>
                  <SelectedIcon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{formData.name || 'Nombre del área'}</h4>
                  <p className="text-xs text-gray-400">{formData.description || 'Sin descripción'}</p>
                </div>
              </div>
            </div>

            {/* Error */}
            {errors.submit && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? 'Guardando...' : area ? 'Guardar cambios' : 'Crear área'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditAreaModal;
