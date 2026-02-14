import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import useCalendar from '../../hooks/useCalendar';
import useCalendarDnD from '../../hooks/useCalendarDnD';
import DraggableTask from '../calendar/DraggableTask';
import TimeSlot from '../calendar/TimeSlot';
import TimeBlock from '../calendar/TimeBlock';

const CalendarDayView = ({ tasks, hideTaskList = false }) => {
  const {
    selectedDate,
    dayData,
    loading,
    createBlock,
    updateBlock,
    deleteBlock,
    goToToday,
    goToPreviousDay,
    goToNextDay,
  } = useCalendar();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newBlock, setNewBlock] = useState({
    taskId: '',
    startTime: '09:00',
    endTime: '10:00',
    notes: '',
  });

  const {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleExternalDrop,
  } = useCalendarDnD({
    createBlock,
    onCreateError: (error) => alert(error),
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCreateBlock = async () => {
    if (!newBlock.taskId) {
      alert('Selecciona una tarea');
      return;
    }

    const result = await createBlock(newBlock);
    if (result.success) {
      setShowAddForm(false);
      setNewBlock({ taskId: '', startTime: '09:00', endTime: '10:00', notes: '' });
    } else {
      alert(result.error);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('¿Eliminar este bloque?')) return;
    await deleteBlock(blockId);
  };

  const handleStatusChange = async (blockId, newStatus) => {
    await updateBlock(blockId, { status: newStatus });
  };

  const availableTasks = tasks.filter((t) => t.status === 'active');

  if (loading && !dayData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando calendario...</div>
      </div>
    );
  }

  const workHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`mx-auto ${hideTaskList ? 'max-w-4xl' : 'max-w-5xl grid grid-cols-3 gap-6'}`}>
        {!hideTaskList && (
          <div className="col-span-1">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sticky top-6">
              <h3 className="font-semibold mb-3 text-sm text-gray-400">Arrastra tareas al calendario</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableTasks.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No hay tareas activas</p>
                ) : (
                  availableTasks.map((task) => <DraggableTask key={task.id} task={task} />)
                )}
              </div>
            </div>
          </div>
        )}

        <div className={hideTaskList ? '' : 'col-span-2'}>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar size={24} className="text-cyan-400" />
                <h2 className="text-2xl font-bold">Calendario</h2>
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg text-sm font-medium transition-colors"
              >
                Hoy
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousDay}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="text-center">
                <h3 className="text-lg font-semibold capitalize">{formatDate(selectedDate)}</h3>
                <p className="text-sm text-gray-400">{dayData?.totalScheduledMinutes || 0} minutos programados</p>
              </div>

              <button
                onClick={goToNextDay}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Bloques programados</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
                Agregar bloque
              </button>
            </div>

            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white/5 rounded-lg p-4 mb-4"
              >
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Tarea</label>
                    <select
                      value={newBlock.taskId}
                      onChange={(e) => setNewBlock({ ...newBlock, taskId: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar tarea...</option>
                      {availableTasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Inicio</label>
                      <input
                        type="time"
                        value={newBlock.startTime}
                        onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Fin</label>
                      <input
                        type="time"
                        value={newBlock.endTime}
                        onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <input
                  type="text"
                  value={newBlock.notes}
                  onChange={(e) => setNewBlock({ ...newBlock, notes: e.target.value })}
                  placeholder="Notas (opcional)..."
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm mb-3"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleCreateBlock}
                    className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Crear bloque
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              {workHours.map((hour) => {
                const blocksAtHour = dayData?.blocks.filter((b) => {
                  const blockHour = parseInt(b.startTime.split(':')[0], 10);
                  return blockHour === hour;
                }) || [];

                return (
                  <div key={hour}>
                    {blocksAtHour.length > 0 ? (
                      blocksAtHour.map((block) => (
                        <TimeBlock
                          key={block.id}
                          block={block}
                          onDelete={handleDeleteBlock}
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    ) : (
                      <TimeSlot hour={hour} onExternalDrop={handleExternalDrop} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && activeId.startsWith('task-') ? (
          <div className="p-2 bg-purple-500/30 rounded-lg border border-purple-500 backdrop-blur-sm">
            <span className="text-sm">Arrastrando tarea...</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default CalendarDayView;
