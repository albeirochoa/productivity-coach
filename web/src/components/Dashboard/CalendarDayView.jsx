import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import useCalendar from '../../hooks/useCalendar';

// Draggable Task Item (para arrastrar desde la lista)
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
        <GripVertical size={14} className="text-gray-500" />
        <span className="text-sm flex-1">{task.title}</span>
        <span className="text-xs text-gray-500">{task.type === 'project' ? '📦' : '📝'}</span>
      </div>
    </div>
  );
};

// Droppable Time Slot (acepta drops desde DnD Kit y drag nativo)
const TimeSlot = ({ hour, onExternalDrop }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${hour}`,
    data: { type: 'timeSlot', hour },
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
      onExternalDrop(projectId, hour);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-3 rounded-lg border-2 border-dashed transition-colors ${
        isOver || isDragOver ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Clock size={14} className="text-gray-500" />
        <span className="text-sm text-gray-400">{hour}:00</span>
      </div>
      {(isOver || isDragOver) && <p className="text-xs text-cyan-400">Suelta aquí para crear bloque</p>}
    </div>
  );
};

const TimeBlock = ({ block, onDelete, onStatusChange }) => {
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
            ×
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const CalendarDayView = ({ tasks, hideTaskList = false }) => {
  const {
    selectedDate,
    setSelectedDate,
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
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Si se arrastra una tarea a un time slot
    if (active.data.current?.type === 'task' && over.data.current?.type === 'timeSlot') {
      const task = active.data.current.task;
      const hour = over.data.current.hour;

      // Crear bloque de 1 hora por defecto
      const startTime = `${String(hour).padStart(2, '0')}:00`;
      const endTime = `${String(hour + 1).padStart(2, '0')}:00`;

      const result = await createBlock({
        taskId: task.id,
        startTime,
        endTime,
        durationMinutes: 60,
        notes: '',
      });

      if (!result.success) {
        alert(result.error);
      }
    }
  };

  const handleExternalDrop = async (taskId, hour) => {
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00`;

    const result = await createBlock({
      taskId,
      startTime,
      endTime,
      durationMinutes: 60,
      notes: '',
    });

    if (!result.success) {
      alert(result.error);
    }
  };

  const availableTasks = tasks.filter(t => t.status === 'active');

  if (loading && !dayData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando calendario...</div>
      </div>
    );
  }

  const workHours = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // 9 AM - 5 PM

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`mx-auto ${hideTaskList ? 'max-w-4xl' : 'max-w-5xl grid grid-cols-3 gap-6'}`}>
        {/* Columna izquierda: Tareas disponibles */}
        {!hideTaskList && (
          <div className="col-span-1">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sticky top-6">
              <h3 className="font-semibold mb-3 text-sm text-gray-400">
                Arrastra tareas al calendario
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableTasks.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No hay tareas activas
                  </p>
                ) : (
                  availableTasks.map((task) => (
                    <DraggableTask key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Columna derecha: Calendario */}
        <div className={hideTaskList ? '' : 'col-span-2'}>
          {/* Header con navegación de fecha */}
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
            <p className="text-sm text-gray-400">
              {dayData?.totalScheduledMinutes || 0} minutos programados
            </p>
          </div>

          <button
            onClick={goToNextDay}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Lista de bloques del día */}
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

        {/* Formulario para agregar bloque */}
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

        {/* Time Grid con bloques */}
        <div className="space-y-2">
          {workHours.map((hour) => {
            // Buscar bloques que empiezan en esta hora
            const blocksAtHour = dayData?.blocks.filter((b) => {
              const blockHour = parseInt(b.startTime.split(':')[0]);
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

      {/* Drag Overlay */}
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
