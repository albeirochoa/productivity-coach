import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import useCalendar from '../../hooks/useCalendar';

// Draggable Task Item
const DraggableTask = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2 bg-white/5 rounded-lg border border-white/10 cursor-move hover:bg-white/10 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-2">
        <GripVertical size={12} className="text-gray-500" />
        <span className="text-xs flex-1 truncate">{task.title}</span>
        <span className="text-[10px]">{task.type === 'project' ? '📦' : '📝'}</span>
      </div>
    </div>
  );
};

// Droppable Day Slot (acepta drops desde DnD Kit y drag nativo)
const DaySlot = ({ date, dayName, blocks, onBlockClick, isToday, onExternalDrop }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date}`,
    data: { type: 'daySlot', date },
  });

  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      onExternalDrop(projectId, date);
    }
  };

  const totalMinutes = blocks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div
      ref={setNodeRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-0 rounded-xl border transition-all ${
        isOver || isDragOver
          ? 'border-cyan-500 bg-cyan-500/10'
          : isToday
          ? 'border-cyan-500/50 bg-cyan-500/5'
          : 'border-white/10 bg-white/5'
      }`}
    >
      {/* Day Header */}
      <div className={`p-3 border-b ${isToday ? 'border-cyan-500/30' : 'border-white/5'}`}>
        <div className="text-xs text-gray-400 uppercase font-semibold mb-1">{dayName}</div>
        <div className={`text-lg font-bold ${isToday ? 'text-cyan-400' : ''}`}>
          {new Date(date + 'T00:00:00').getDate()}
        </div>
        <div className="text-[10px] text-gray-500 mt-1">
          {hours}h {minutes}m
        </div>
      </div>

      {/* Blocks List */}
      <div className="p-2 space-y-1 min-h-[200px] max-h-[400px] overflow-y-auto">
        {blocks.length === 0 ? (
          <div className="text-center py-8">
            {isOver ? (
              <p className="text-xs text-cyan-400">Suelta aquí</p>
            ) : (
              <p className="text-xs text-gray-600">Sin bloques</p>
            )}
          </div>
        ) : (
          blocks.map((block) => (
            <MiniTimeBlock key={block.id} block={block} onClick={() => onBlockClick(block)} />
          ))
        )}
      </div>
    </div>
  );
};

// Mini Time Block (for week view)
const MiniTimeBlock = ({ block, onClick }) => {
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-2 rounded-lg border ${getStatusColor(
        block.status
      )} backdrop-blur-sm cursor-pointer hover:scale-105 transition-transform`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1 mb-1">
        <Clock size={10} className="text-cyan-400 flex-shrink-0" />
        <span className="text-[10px] text-gray-400">
          {block.startTime.substring(0, 5)}
        </span>
      </div>
      <p className="text-xs font-medium truncate">{block.task?.title || 'Tarea eliminada'}</p>
      <p className="text-[10px] text-gray-500">{block.durationMinutes}min</p>
    </motion.div>
  );
};

const CalendarWeekView = ({ tasks, hideTaskList = false }) => {
  const {
    selectedDate,
    setSelectedDate,
    weekData,
    loading,
    createBlock,
    deleteBlock,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    getWeekDates,
  } = useCalendar();

  const [activeId, setActiveId] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const availableTasks = tasks.filter((t) => t.status === 'active');

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Drag task to day slot
    if (active.data.current?.type === 'task' && over.data.current?.type === 'daySlot') {
      const task = active.data.current.task;
      const targetDate = over.data.current.date;

      // Create 1-hour block at 9 AM by default
      const result = await createBlock({
        taskId: task.id,
        date: targetDate,
        startTime: '09:00',
        endTime: '10:00',
        durationMinutes: 60,
        notes: '',
      });

      if (!result.success) {
        alert(result.error);
      }
    }
  };

  const handleExternalDrop = async (taskId, targetDate) => {
    const result = await createBlock({
      taskId,
      date: targetDate,
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: 60,
      notes: '',
    });

    if (!result.success) {
      alert(result.error);
    }
  };

  const handleBlockClick = (block) => {
    setSelectedBlock(block);
  };

  const handleDeleteBlock = async () => {
    if (!selectedBlock) return;
    if (!confirm('¿Eliminar este bloque?')) return;

    await deleteBlock(selectedBlock.id);
    setSelectedBlock(null);
  };

  if (loading && !weekData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando semana...</div>
      </div>
    );
  }

  const weekDates = getWeekDates(selectedDate);
  const today = new Date().toISOString().split('T')[0];

  // Calculate week totals
  const weekTotalMinutes = weekData?.days.reduce((sum, day) => sum + (day.totalScheduledMinutes || 0), 0) || 0;
  const weekHours = Math.floor(weekTotalMinutes / 60);
  const weekMinutes = weekTotalMinutes % 60;

  const formatWeekRange = () => {
    if (!weekDates || weekDates.length === 0) return '';
    const firstDate = new Date(weekDates[0].date + 'T00:00:00');
    const lastDate = new Date(weekDates[6].date + 'T00:00:00');

    const options = { month: 'short', day: 'numeric' };
    return `${firstDate.toLocaleDateString('es-ES', options)} - ${lastDate.toLocaleDateString('es-ES', options)}`;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar size={24} className="text-cyan-400" />
              <div>
                <h2 className="text-2xl font-bold">Vista Semanal</h2>
                <p className="text-sm text-gray-400">{formatWeekRange()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <div className="text-sm text-gray-400">Total semanal</div>
                <div className="text-lg font-bold text-cyan-400">
                  {weekHours}h {weekMinutes}m
                </div>
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg text-sm font-medium transition-colors"
              >
                Hoy
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center min-w-[200px]">
              <p className="text-sm text-gray-400">
                Semana {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric' })}
              </p>
            </div>

            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className={hideTaskList ? '' : 'grid grid-cols-8 gap-4'}>
          {/* Tasks Sidebar */}
          {!hideTaskList && (
            <div className="col-span-1">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sticky top-6">
                <h3 className="font-semibold mb-3 text-xs text-gray-400 uppercase">Tareas</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {availableTasks.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Sin tareas</p>
                  ) : (
                    availableTasks.map((task) => <DraggableTask key={task.id} task={task} />)
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Week Days Grid (7 columns) */}
          <div className={`grid grid-cols-7 gap-3 ${hideTaskList ? '' : 'col-span-7'}`}>
            {weekDates.map((dayInfo, index) => {
              const dayBlocks = weekData?.days[index]?.blocks || [];
              return (
                <DaySlot
                  key={dayInfo.date}
                  date={dayInfo.date}
                  dayName={dayInfo.name}
                  blocks={dayBlocks}
                  onBlockClick={handleBlockClick}
                  isToday={dayInfo.date === today}
                  onExternalDrop={handleExternalDrop}
                />
              );
            })}
          </div>
        </div>

        {/* Block Detail Modal */}
        {selectedBlock && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedBlock(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0a0e27] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    {selectedBlock.task?.title || 'Tarea eliminada'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock size={14} />
                    <span>
                      {selectedBlock.startTime} - {selectedBlock.endTime}
                    </span>
                    <span className="text-gray-600">({selectedBlock.durationMinutes} min)</span>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedBlock.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : selectedBlock.status === 'in_progress'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}
                >
                  {selectedBlock.status}
                </span>
              </div>

              {selectedBlock.notes && (
                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-300">{selectedBlock.notes}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteBlock}
                  className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setSelectedBlock(null)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeId.startsWith('task-') ? (
          <div className="p-2 bg-purple-500/30 rounded-lg border border-purple-500 backdrop-blur-sm">
            <span className="text-sm">Arrastrando...</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default CalendarWeekView;
