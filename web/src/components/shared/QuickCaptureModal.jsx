import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { api } from '../../utils/api';

const QuickCaptureModal = ({ show, onClose, onRefresh }) => {
  const [captureText, setCaptureText] = useState('');
  const [captureType, setCaptureType] = useState('work');
  const [captureDueDate, setCaptureDueDate] = useState('');
  const [capturePriority, setCapturePriority] = useState('normal');
  const [captureReminders, setCaptureReminders] = useState([]);

  const handleCapture = async (e) => {
    e.preventDefault();
    if (!captureText.trim()) return;
    try {
      await api.captureInbox({
        text: captureText,
        type: captureType,
        dueDate: captureDueDate || null,
        priority: capturePriority,
        reminders: captureReminders,
      });
      setCaptureText('');
      setCaptureDueDate('');
      setCapturePriority('normal');
      setCaptureReminders([]);
      onClose();
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.error || 'Error capturando idea');
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-32 p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1a1f3a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
        >
          <form onSubmit={handleCapture}>
            <div className="p-6 space-y-4">
              {/* Main input */}
              <div>
                <textarea
                  autoFocus
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  className="w-full bg-transparent border-none text-white focus:outline-none resize-none text-base"
                  placeholder="Que tienes en mente?"
                  rows="3"
                />
              </div>

              {/* Date, Priority, Reminders row */}
              <div className="grid grid-cols-3 gap-3 pb-3 border-b border-white/10">
                <div>
                  <label className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={captureDueDate}
                    onChange={(e) => setCaptureDueDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-momentum"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={capturePriority}
                    onChange={(e) => setCapturePriority(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-momentum"
                  >
                    <option value="low">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                    Recordatorio
                  </label>
                  <select
                    value={captureReminders[0] || ''}
                    onChange={(e) => setCaptureReminders(e.target.value ? [e.target.value] : [])}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-momentum"
                  >
                    <option value="">Ninguno</option>
                    <option value="1h">1 hora antes</option>
                    <option value="24h">1 dia antes</option>
                    <option value="on-date">En la fecha</option>
                  </select>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="flex items-center gap-3 pt-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCaptureType('work')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      captureType === 'work'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    Trabajo
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptureType('personal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      captureType === 'personal'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    Personal
                  </button>
                </div>

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!captureText.trim()}
                  className="px-6 py-2 rounded-lg text-sm font-medium bg-momentum text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-momentum/80 transition-all"
                >
                  Guardar
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuickCaptureModal;
