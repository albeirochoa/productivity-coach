import { useState } from 'react';
import { motion } from 'framer-motion';
import { Circle, CheckCircle2, Calendar, Tag, GripVertical, Edit2, Trash2, Plus } from 'lucide-react';
import AreaFilter from '../shared/AreaFilter';
import KrBadge from '../shared/KrBadge';
import useAreaCategories from '../../hooks/useAreaCategories';

const TodayView = ({ todayTasks = [], onToggleTask, onRefresh, onSectionDrop, onEditTask, onDeleteTask, krMap = {}, onShowCapture }) => {
  const [areaFilter, setAreaFilter] = useState(null);
  const { categories } = useAreaCategories();

  const safeTasks = Array.isArray(todayTasks) ? todayTasks : [];

  const getCategoryColor = (category) => {
    const found = categories.find(c => c.id === category);
    return found ? found.color : 'bg-gray-500';
  };

  const allPending = safeTasks.filter(t => t.status === 'active');
  const allCompleted = safeTasks.filter(t => t.status === 'done');
  const pending = areaFilter ? allPending.filter(t => t.category === areaFilter) : allPending;
  const completed = areaFilter ? allCompleted.filter(t => t.category === areaFilter) : allCompleted;

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
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Próximo</h2>
        <p className="text-gray-400">Tareas próximas a trabajar</p>
      </div>

      {/* Area Filter */}
      <AreaFilter selectedArea={areaFilter} onSelectArea={setAreaFilter} />

      {/* Quick Add */}
      {onShowCapture && (
        <button
          onClick={onShowCapture}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-white/10 text-gray-400 hover:border-momentum hover:text-momentum hover:bg-white/5 transition-all"
        >
          <Plus size={20} />
          <span className="font-medium">Anadir tarea</span>
          <div className="flex-1" />
          <kbd className="px-2 py-1 bg-white/5 rounded text-xs">Q</kbd>
        </button>
      )}

      {/* Tareas pendientes */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Circle size={20} className="text-cyan-400" />
          Pendientes ({pending.length})
        </h3>

        {pending.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-green-400 opacity-50" />
            <p className="text-gray-400">¡Todo listo por hoy!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('projectId', task.id)}
                className="group bg-white/5 border border-white/10 rounded-xl p-4 hover:border-cyan-500/50 transition-all cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start gap-3">
                  <GripVertical size={16} className="mt-1 text-gray-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                  {/* Checkbox */}
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className="mt-1 w-5 h-5 rounded-full border-2 border-gray-500 hover:border-cyan-400 transition-colors shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium mb-2">{task.title}</h4>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {task.category && (
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${getCategoryColor(task.category)}`} />
                          <span className="capitalize">{task.category}</span>
                        </div>
                      )}

                      {task.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          <span>{new Date(task.dueDate).toLocaleDateString('es-ES')}</span>
                        </div>
                      )}

                      {task.type === 'project' && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                          Proyecto
                        </span>
                      )}
                      {task.keyResultId && krMap[task.keyResultId] ? (
                        <KrBadge kr={krMap[task.keyResultId]} />
                      ) : task.objectiveId ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">
                          Objetivo
                        </span>
                      ) : null}
                    </div>

                    {/* Milestones comprometidos si es proyecto */}
                    {task.type === 'project' && task.milestones && task.committedMilestones?.length > 0 && (() => {
                      const committed = task.milestones.filter(m => task.committedMilestones.includes(m.id));
                      return (
                        <div className="mt-3 space-y-1">
                          {committed.map((milestone) => (
                            <div
                              key={milestone.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${milestone.completed ? 'bg-green-500' : 'bg-cyan-500'}`} />
                              <span className={milestone.completed ? 'line-through text-gray-500' : 'text-gray-300'}>
                                {milestone.title}
                              </span>
                              {milestone.timeEstimate && (
                                <span className="text-gray-600 ml-auto">{milestone.timeEstimate}m</span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTask(task);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Edit2 size={14} className="text-gray-400" />
                    </button>
                    {onDeleteTask && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Eliminar "${task.title}"?`)) onDeleteTask(task.id);
                        }}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={14} className="text-gray-400 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Tareas completadas */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-400">
            <CheckCircle2 size={20} />
            Completadas ({completed.length})
          </h3>

          <div className="space-y-2">
            {completed.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl opacity-60"
              >
                <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                <span className="flex-1 line-through text-sm">{task.title}</span>
                {task.category && (
                  <div className={`w-2 h-2 rounded-full ${getCategoryColor(task.category)}`} />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayView;
