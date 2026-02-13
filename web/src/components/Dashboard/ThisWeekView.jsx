import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Plus, Calendar, Clock, ChevronRight, Bell, Hash, TrendingUp, AlertTriangle, Edit2, GripVertical
} from 'lucide-react';
import { api } from '../../utils/api';

const ThisWeekView = ({
  thisWeekTasks,
  completedThisWeek,
  inboxCount,
  onToggleTask,
  onShowCapture,
  onGoToInbox,
  onRefresh,
  capacityStatus,
  onEditTask,
  onSectionDrop,
}) => {
  // Expandir proyectos en milestones individuales comprometidos
  const buildWeekItems = () => {
    const items = [];

    thisWeekTasks.forEach(task => {
      if (task.type === 'project' && task.milestones) {
        const committed = Array.isArray(task.committedMilestones)
          ? task.committedMilestones
          : task.committedMilestone ? [task.committedMilestone] : [];

        if (committed.length > 0) {
          // Mostrar cada milestone comprometido como item individual
          committed.forEach(mId => {
            const milestone = task.milestones.find(m => m.id === mId);
            if (milestone && !milestone.completed) {
              items.push({
                type: 'milestone',
                task,
                milestone,
                id: `${task.id}--${mId}`,
              });
            }
          });
        } else {
          // Proyecto comprometido sin milestones especificos (legacy)
          items.push({ type: 'task', task, id: task.id });
        }
      } else {
        items.push({ type: 'task', task, id: task.id });
      }
    });

    return items;
  };

  const weekItems = buildWeekItems();

  const handleToggleMilestone = async (projectId, milestoneId, completed) => {
    try {
      await api.toggleMilestone(projectId, milestoneId, { completed: !completed });
      onRefresh();
    } catch (error) {
      console.error('Error toggling milestone:', error);
    }
  };

  return (
    <div
      className="max-w-4xl mx-auto space-y-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('projectId');
        if (taskId && onSectionDrop) onSectionDrop(taskId);
      }}
    >
      {/* Capacity Status Banner */}
      {capacityStatus && (
        <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${
          capacityStatus.overload?.isOverloaded
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-green-500/10 border-green-500/30'
        }`}>
          {capacityStatus.overload?.isOverloaded ? (
            <AlertTriangle size={18} className="text-yellow-400" />
          ) : (
            <TrendingUp size={18} className="text-green-400" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${
                capacityStatus.overload?.isOverloaded ? 'text-yellow-300' : 'text-green-300'
              }`}>
                {capacityStatus.overload?.isOverloaded
                  ? `Sobrecarga: ${capacityStatus.overload.excessFormatted}`
                  : 'Capacidad OK'
                }
              </span>
              <span className="text-xs text-gray-400">
                {capacityStatus.committed.formatted} / {capacityStatus.capacity.usable.formatted} ({capacityStatus.overload?.percentage || 0}%)
              </span>
            </div>
          </div>
          <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                capacityStatus.overload?.isOverloaded ? 'bg-yellow-400' : 'bg-green-400'
              }`}
              style={{ width: `${Math.min((capacityStatus.overload?.percentage || 0), 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Add */}
      <button
        onClick={onShowCapture}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-white/10 text-gray-400 hover:border-momentum hover:text-momentum hover:bg-white/5 transition-all"
      >
        <Plus size={20} />
        <span className="font-medium">Anadir tarea</span>
        <div className="flex-1" />
        <kbd className="px-2 py-1 bg-white/5 rounded text-xs">Q</kbd>
      </button>

      {/* Tasks List */}
      <div className="space-y-2">
        <AnimatePresence>
          {weekItems.map((item, idx) => {
            if (item.type === 'milestone') {
              // Milestone individual de un proyecto
              const { task, milestone } = item;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: idx * 0.02 }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('projectId', task.id)}
                  className="group flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={16} className="mt-0.5 text-gray-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                  <button
                    onClick={() => handleToggleMilestone(task.id, milestone.id, milestone.completed)}
                    className="mt-0.5 w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center transition-all hover:scale-110"
                  >
                    <div className="w-0 h-0 group-hover:w-2.5 group-hover:h-2.5 rounded-full bg-purple-500 transition-all" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{milestone.title}</p>
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300 flex items-center gap-1">
                        <Hash size={10} /> {task.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400">
                        {task.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{task.milestones.filter(m => m.completed).length}/{task.milestones.length} pasos</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <Edit2 size={14} className="text-gray-400" />
                  </button>

                  {milestone.timeEstimate && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>{milestone.timeEstimate}m</span>
                    </div>
                  )}
                </motion.div>
              );
            }

            // Tarea simple o proyecto legacy
            const { task } = item;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: idx * 0.02 }}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('projectId', task.id)}
                className="group flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10 cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={16} className="mt-0.5 text-gray-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                <button
                  onClick={() => onToggleTask(task.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                    task.type === 'project' ? 'border-purple-500' : 'border-blue-500'
                  }`}
                >
                  <div className="w-0 h-0 group-hover:w-2.5 group-hover:h-2.5 rounded-full bg-current transition-all" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.type === 'project' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                        Proyecto
                      </span>
                    )}
                    {task.priority && task.priority !== 'normal' && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        task.priority === 'high' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {task.priority === 'high' ? 'Alta' : 'Baja'}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400">
                      {task.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {task.dueDate && (
                      <>
                        <Calendar size={12} />
                        <span>{new Date(task.dueDate).toLocaleDateString('es-ES')}</span>
                        <span className="text-gray-600">&bull;</span>
                      </>
                    )}
                    {task.reminders && task.reminders.length > 0 && (
                      <>
                        <Bell size={12} />
                        <span>Recordatorio</span>
                        <span className="text-gray-600">&bull;</span>
                      </>
                    )}
                    {task.type === 'project' && task.milestones && (
                      <>
                        <ChevronRight size={12} />
                        <span>{task.milestones[task.currentMilestone]?.title || 'Completado'}</span>
                        <span className="text-gray-600">&bull;</span>
                        <span>{task.milestones.filter(m => m.completed).length}/{task.milestones.length}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTask(task);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <Edit2 size={14} className="text-gray-400" />
                </button>

                {task.type === 'project' && task.milestones?.[task.currentMilestone]?.timeEstimate && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>{task.milestones[task.currentMilestone].timeEstimate}m</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Completed Tasks */}
      {completedThisWeek.length > 0 && (
        <div className="mt-8">
          <details className="group">
            <summary className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors mb-3">
              <ChevronRight size={16} className="transition-transform group-open:rotate-90" />
              <span>Completadas</span>
              <span className="text-gray-500">({completedThisWeek.length})</span>
            </summary>
            <div className="space-y-2 pl-2">
              {completedThisWeek.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl opacity-50 hover:opacity-70 transition-all"
                >
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <CheckCircle size={14} className="text-white" />
                  </button>
                  <span className="flex-1 text-sm line-through">{task.title}</span>
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className="text-xs text-gray-500 hover:text-white"
                  >
                    Deshacer
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Empty state */}
      {weekItems.length === 0 && completedThisWeek.length === 0 && (
        <div className="text-center py-20">
          <Calendar size={64} className="mx-auto mb-4 text-gray-600 opacity-20" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">Todo listo por ahora</h3>
          <p className="text-gray-500 mb-6">No tienes tareas para esta semana</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onGoToInbox}
              className="px-4 py-2 bg-momentum rounded-xl font-medium text-sm hover:bg-momentum/80 transition-all"
            >
              Procesar Inbox ({inboxCount})
            </button>
            <button
              onClick={onShowCapture}
              className="px-4 py-2 bg-white/10 rounded-xl font-medium text-sm hover:bg-white/20 transition-all"
            >
              Anadir Tarea
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThisWeekView;
