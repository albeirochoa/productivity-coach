import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500/20 border-green-500/50';
    case 'in_progress':
      return 'bg-blue-500/20 border-blue-500/50';
    case 'cancelled':
      return 'bg-gray-500/20 border-gray-500/50';
    default:
      return 'bg-purple-500/20 border-purple-500/50';
  }
};

const TimeBlock = ({ block, onDelete, onStatusChange }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border ${getStatusColor(block.status)} backdrop-blur-sm group`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-cyan-400" />
            <span className="text-xs text-gray-400">
              {block.startTime} - {block.endTime}
            </span>
            <span className="text-xs text-gray-500">({block.durationMinutes} min)</span>
          </div>
          <h4 className="font-medium text-sm mb-1">{block.task?.title || 'Tarea eliminada'}</h4>
          {block.notes && <p className="text-xs text-gray-400">{block.notes}</p>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {block.status === 'scheduled' && (
            <button
              onClick={() => onStatusChange(block.id, 'in_progress')}
              className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 rounded"
              title="Iniciar"
            >
              Iniciar
            </button>
          )}
          {block.status === 'in_progress' && (
            <button
              onClick={() => onStatusChange(block.id, 'completed')}
              className="px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 rounded"
              title="Completar"
            >
              Completar
            </button>
          )}
          <button
            onClick={() => onDelete(block.id)}
            className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded text-red-400"
          >
            x
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TimeBlock;
