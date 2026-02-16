import { useState } from 'react';
import { motion } from 'framer-motion';
import { Circle, CheckCircle2, Calendar, Archive, GripVertical, Edit2 } from 'lucide-react';
import AreaFilter from '../shared/AreaFilter';
import useAreaCategories from '../../hooks/useAreaCategories';

const SomedayView = ({ somedayTasks, onToggleTask, onRefresh, onSectionDrop, onEditTask }) => {
  const [areaFilter, setAreaFilter] = useState(null);
  const { categories } = useAreaCategories();

  const allPending = somedayTasks.filter(t => t.status === 'active');
  const pending = areaFilter ? allPending.filter(t => t.category === areaFilter) : allPending;

  const getCategoryColor = (category) => {
    const found = categories.find(c => c.id === category);
    return found ? found.color : 'bg-gray-500';
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
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Algun dia</h2>
        <p className="text-gray-400">Tareas sin compromiso semanal</p>
      </div>

      {/* Area Filter */}
      <AreaFilter selectedArea={areaFilter} onSelectArea={setAreaFilter} />

      {/* Tareas */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Circle size={20} className="text-yellow-400" />
          Pendientes ({pending.length})
        </h3>

        {pending.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
            <Archive size={48} className="mx-auto mb-4 text-yellow-400 opacity-50" />
            <p className="text-gray-400">No hay tareas pendientes sin compromiso</p>
            <p className="text-xs text-gray-600 mt-2">Las tareas que no esten en "Esta Semana" apareceran aqui</p>
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
                className="group bg-white/5 border border-white/10 rounded-xl p-4 hover:border-yellow-500/50 transition-all cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start gap-3">
                  <GripVertical size={16} className="mt-1 text-gray-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className="mt-1 w-5 h-5 rounded-full border-2 border-gray-500 hover:border-yellow-400 transition-colors shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium mb-2">{task.title}</h4>

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
                    </div>

                    {task.type === 'project' && task.milestones && task.milestones.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {task.milestones.slice(0, 3).map((milestone) => (
                          <div
                            key={milestone.id}
                            className="flex items-center gap-2 text-xs text-gray-500"
                          >
                            <div className={`w-1 h-1 rounded-full ${milestone.completed ? 'bg-green-500' : 'bg-gray-600'}`} />
                            <span className={milestone.completed ? 'line-through' : ''}>
                              {milestone.title}
                            </span>
                          </div>
                        ))}
                        {task.milestones.length > 3 && (
                          <div className="text-xs text-gray-600 ml-3">
                            +{task.milestones.length - 3} mas
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all shrink-0"
                  >
                    <Edit2 size={14} className="text-gray-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SomedayView;
