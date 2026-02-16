import { motion } from 'framer-motion';
import { Edit2, Archive, List, Briefcase, Users, Video, Heart, GraduationCap, Circle, Target, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const ICON_MAP = {
  Briefcase,
  Users,
  Video,
  Heart,
  GraduationCap,
  Circle,
  Target,
  Layers,
};

const COLOR_MAP = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-500',
};

const PRIORITY_CONFIG = {
  high: { label: 'Alta', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  medium: { label: 'Media', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  low: { label: 'Baja', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

const AreaCard = ({ area, onEdit, onArchive, onViewTasks }) => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const Icon = ICON_MAP[area.icon] || Circle;
  const colorClass = COLOR_MAP[area.color] || COLOR_MAP.blue;
  const priorityConfig = PRIORITY_CONFIG[area.priority] || PRIORITY_CONFIG.medium;

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const response = await api.getAreaStats(area.id);
        setStats(response);
      } catch (error) {
        console.error('Error fetching area stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [area.id]);

  const handleArchive = () => {
    if (confirm(`¿Estás seguro de archivar "${area.name}"?`)) {
      onArchive(area.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 hover:bg-white/[0.07] transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
          <Icon size={24} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{area.name}</h3>
            {area.status === 'paused' && (
              <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded border border-gray-500/30">
                Pausada
              </span>
            )}
          </div>

          {area.description && (
            <p className="text-sm text-gray-400 line-clamp-2">{area.description}</p>
          )}
        </div>

        {/* Actions (hover visible) */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(area)}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
            title="Editar área"
          >
            <Edit2 size={14} className="text-gray-400" />
          </button>
          {area.status !== 'archived' && (
            <button
              onClick={handleArchive}
              className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
              title="Archivar área"
            >
              <Archive size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Current Focus */}
      {area.current_focus && (
        <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <p className="text-xs text-cyan-400 mb-1">Enfoque actual:</p>
          <p className="text-sm">{area.current_focus}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        {/* Priority Badge */}
        <span className={`px-2.5 py-1 text-xs font-medium rounded border ${priorityConfig.color}`}>
          {priorityConfig.label}
        </span>

        {/* Stats */}
        {loadingStats ? (
          <div className="text-xs text-gray-500">Cargando...</div>
        ) : stats ? (
          <button
            onClick={() => onViewTasks(area.id)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <List size={14} />
            <span>
              {stats.activeTasks} {stats.activeTasks === 1 ? 'tarea' : 'tareas'} activa{stats.activeTasks !== 1 && 's'}
            </span>
            {stats.activeProjects > 0 && (
              <>
                <span className="text-gray-600">•</span>
                <span>{stats.activeProjects} {stats.activeProjects === 1 ? 'proyecto' : 'proyectos'}</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-xs text-gray-500">Sin datos</div>
        )}
      </div>

      {/* Completion Rate (if has tasks) */}
      {stats && stats.totalTasks > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Progreso</span>
            <span>{stats.completionRate}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.completionRate}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`h-full ${colorClass}`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AreaCard;
