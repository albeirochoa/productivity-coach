import { useState } from 'react';
import { Calendar, Inbox, Hash, Bell, Scissors, Settings, BookOpen, ChevronDown, ChevronRight, GripVertical, Sun, CalendarDays, Archive, Layers, Target, Brain } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import ProjectTreeItem from '../shared/ProjectTreeItem';

const Sidebar = ({
  profile,
  stats,
  activeView,
  setActiveView,
  thisWeekCount,
  inboxCount,
  activeProjectCount,
  projectTree,
  thisWeekTasks,
  todayTasks,
  todayCount,
  somedayTasks,
  somedayCount,
  inbox,
  onProjectDrop,
  onSectionDrop,
  onOpenWizard,
  onOpenTemplateManager,
  onOpenSettings,
}) => {
  const [expanded, setExpanded] = useState({});
  const [dragOverSection, setDragOverSection] = useState(null);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const navItems = [
    { id: 'inbox', icon: Inbox, label: 'Bandeja de entrada', count: inboxCount, color: 'text-blue-400', expandable: true },
    { id: 'hoy', icon: Sun, label: 'Próximo', count: todayCount || 0, color: 'text-orange-400', expandable: true },
    { id: 'thisweek', icon: CalendarDays, label: 'Esta Semana', count: thisWeekCount, color: 'text-green-400', expandable: true },
    { id: 'someday', icon: Archive, label: 'Algun dia', count: somedayCount || 0, color: 'text-yellow-400', expandable: true },
    { id: 'calendar', icon: Calendar, label: 'Calendario', count: 0, color: 'text-cyan-400', expandable: false },
    { id: 'projects', icon: Hash, label: 'Proyectos', count: activeProjectCount, color: 'text-purple-400', expandable: false },
    { id: 'objectives', icon: Target, label: 'Objetivos', count: 0, color: 'text-emerald-400', expandable: false },
    { id: 'coach', icon: Brain, label: 'Coach', count: 0, color: 'text-pink-400', expandable: false },
    { id: 'areas', icon: Layers, label: 'Áreas', count: 0, color: 'text-indigo-400', expandable: false },
  ];

  const inboxItems = [...(inbox?.work || []), ...(inbox?.personal || [])];

  return (
    <aside className="w-72 bg-[#0a0e27]/95 border-r border-white/5 flex flex-col overflow-hidden">
      {/* User Section */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-momentum to-purple-500 flex items-center justify-center text-white font-bold text-lg">
            {profile.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{profile.name || 'Usuario'}</h3>
            <p className="text-xs text-gray-400">{stats.tasks_completed || 0} completadas</p>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Bell size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-2 space-y-1">
          {navItems.map(item => {
            const isDropTarget = ['hoy', 'thisweek', 'someday'].includes(item.id);
            const isDragOver = dragOverSection === item.id;
            return (
            <div key={item.id}>
              <button
                data-testid={`sidebar-${item.id}`}
                onClick={() => {
                  setActiveView(item.id);
                  if (item.expandable) {
                    toggleExpand(item.id);
                  }
                }}
                onDragOver={isDropTarget ? (e) => { e.preventDefault(); setDragOverSection(item.id); } : undefined}
                onDragLeave={isDropTarget ? () => setDragOverSection(null) : undefined}
                onDrop={isDropTarget ? (e) => {
                  e.preventDefault();
                  setDragOverSection(null);
                  const taskId = e.dataTransfer.getData('projectId');
                  if (taskId && onSectionDrop) {
                    onSectionDrop(taskId, item.id);
                  }
                } : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                  isDragOver
                    ? 'bg-white/20 text-white ring-2 ring-cyan-500/50'
                    : activeView === item.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} className={activeView === item.id || isDragOver ? item.color : ''} />
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                <div className="flex items-center gap-1">
                  {isDragOver && (
                    <span className="text-[10px] text-cyan-400 font-medium">Soltar aqui</span>
                  )}
                  {!isDragOver && item.count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeView === item.id ? 'bg-white/20' : 'bg-white/5'
                    }`}>
                      {item.count}
                    </span>
                  )}
                  {item.expandable && (
                    expanded[item.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  )}
                </div>
              </button>

              {/* Desplegable: Bandeja de entrada */}
              {item.id === 'inbox' && expanded.inbox && (
                <div className="ml-4 mt-1 space-y-1">
                  {inboxItems.length === 0 ? (
                    <div className="px-3 py-1.5 text-xs text-gray-600 italic">
                      Bandeja vacia
                    </div>
                  ) : (
                    <>
                      {inboxItems.slice(0, 8).map((inboxItem) => (
                        <div
                          key={inboxItem.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('projectId', inboxItem.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-all cursor-move group"
                        >
                          <GripVertical size={12} className="opacity-0 group-hover:opacity-50" />
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          <span className="flex-1 truncate">{inboxItem.text}</span>
                        </div>
                      ))}
                      {inboxItems.length > 8 && (
                        <div className="px-3 py-1 text-[10px] text-gray-600">
                          +{inboxItems.length - 8} mas
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Desplegable: Próximo */}
              {item.id === 'hoy' && expanded.hoy && (
                <div className="ml-4 mt-1 space-y-1">
                  {(!todayTasks || todayTasks.filter(t => t.status === 'active').length === 0) ? (
                    <div className="px-3 py-1.5 text-xs text-gray-600 italic">
                      Sin tareas próximas
                    </div>
                  ) : (
                    todayTasks.filter(t => t.status === 'active').map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('projectId', task.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-all cursor-move group"
                      >
                        <GripVertical size={12} className="opacity-0 group-hover:opacity-50" />
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        <span className="flex-1 truncate">{task.title}</span>
                        <span className="text-[10px]">{task.type === 'project' ? '📦' : '📝'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Desplegable: Esta Semana */}
              {item.id === 'thisweek' && expanded.thisweek && thisWeekTasks && (
                <div className="ml-4 mt-1 space-y-1">
                  {thisWeekTasks.length === 0 ? (
                    <div className="px-3 py-1.5 text-xs text-gray-600 italic">
                      Sin tareas esta semana
                    </div>
                  ) : (
                    thisWeekTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('projectId', task.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-all cursor-move group"
                      >
                        <GripVertical size={12} className="opacity-0 group-hover:opacity-50" />
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        <span className="flex-1 truncate">{task.title}</span>
                        <span className="text-[10px]">{task.type === 'project' ? '📦' : '📝'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Desplegable: Algun dia */}
              {item.id === 'someday' && expanded.someday && (
                <div className="ml-4 mt-1 space-y-1">
                  {(!somedayTasks || somedayTasks.length === 0) ? (
                    <div className="px-3 py-1.5 text-xs text-gray-600 italic">
                      Sin tareas pendientes
                    </div>
                  ) : (
                    <>
                      {somedayTasks.slice(0, 8).map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('projectId', task.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-all cursor-move group"
                        >
                          <GripVertical size={12} className="opacity-0 group-hover:opacity-50" />
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                          <span className="flex-1 truncate">{task.title}</span>
                          <span className="text-[10px]">{task.type === 'project' ? '📦' : '📝'}</span>
                        </div>
                      ))}
                      {somedayTasks.length > 8 && (
                        <div className="px-3 py-1 text-[10px] text-gray-600">
                          +{somedayTasks.length - 8} mas
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
          })}
        </div>

        {/* Projects Tree */}
        {projectTree.length > 0 && (
          <div className="mt-6 px-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Mis Proyectos</span>
              <span className="text-gray-600">({projectTree.length})</span>
            </div>
            <div className="px-3 py-1 mb-2 text-[10px] text-gray-600 italic">
              Arrastra para anidar proyectos
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter}>
              <div className="space-y-1">
                {projectTree.map(project => (
                  <ProjectTreeItem
                    key={project.id}
                    project={project}
                    onClick={() => setActiveView('projects')}
                    onDrop={onProjectDrop}
                  />
                ))}
              </div>
            </DndContext>
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <button
          onClick={onOpenWizard}
          data-testid="sidebar-new-project-btn"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-all text-sm font-medium"
        >
          <Scissors size={16} />
          <span>Nuevo Proyecto</span>
        </button>
        <button
          onClick={onOpenTemplateManager}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-all text-sm font-medium"
        >
          <BookOpen size={16} />
          <span>Mis Plantillas</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-all text-sm"
        >
          <Settings size={16} />
          <span>Configuracion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
