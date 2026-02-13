import { Calendar, Bell, Edit2, Trash2, GripVertical } from 'lucide-react';

const InboxView = ({
  inbox,
  onProcessItem,
  onEditItem,
  onDeleteItem,
  onOpenWizardWithItem,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-400">
          Procesa tus ideas capturadas: decide si son tareas simples para esta semana o proyectos grandes.
        </p>
      </div>

      {['work', 'personal'].map(type => (
        <div key={type} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            {type === 'work' ? 'Trabajo' : 'Personal'}
            <span className="text-xs text-gray-600">({inbox[type]?.length || 0})</span>
          </h3>

          {(!inbox[type] || inbox[type].length === 0) ? (
            <p className="text-sm text-gray-500 italic py-4 px-4">Inbox vacio</p>
          ) : (
            <div className="space-y-2">
              {inbox[type].map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('projectId', item.id)}
                  className="group flex items-start gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={16} className="mt-0.5 text-gray-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                  <div className="w-5 h-5 mt-0.5 rounded-full border-2 border-gray-500" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm mb-2">{item.text}</p>

                    {/* Metadata */}
                    {(item.category || item.dueDate || item.priority !== 'normal' || item.reminders?.length > 0) && (
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        {item.category && (
                          <>
                            <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400">
                              {item.category}
                            </span>
                            <span className="text-gray-600">&bull;</span>
                          </>
                        )}
                        {item.dueDate && (
                          <>
                            <Calendar size={12} />
                            <span>{new Date(item.dueDate).toLocaleDateString('es-ES')}</span>
                            <span className="text-gray-600">&bull;</span>
                          </>
                        )}
                        {item.priority && item.priority !== 'normal' && (
                          <>
                            <span className={item.priority === 'high' ? 'text-red-400' : 'text-blue-400'}>
                              {item.priority === 'high' ? 'Alta' : 'Baja'}
                            </span>
                            <span className="text-gray-600">&bull;</span>
                          </>
                        )}
                        {item.reminders && item.reminders.length > 0 && (
                          <Bell size={12} />
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onProcessItem(item, type, { taskType: 'simple', thisWeek: true })}
                        className="px-3 py-1.5 text-xs font-medium bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all"
                      >
                        Esta semana
                      </button>
                      <button
                        onClick={() => onOpenWizardWithItem(item, type)}
                        className="px-3 py-1.5 text-xs font-medium bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all"
                      >
                        Trozar proyecto
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditItem(item, type)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id, type)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default InboxView;
