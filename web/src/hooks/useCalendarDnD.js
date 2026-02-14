import { useState } from 'react';
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

const useCalendarDnD = ({ createBlock, onCreateError }) => {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const createOneHourBlock = async (taskId, hour) => {
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
      onCreateError?.(result.error);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.data.current?.type === 'task' && over.data.current?.type === 'timeSlot') {
      const task = active.data.current.task;
      const hour = over.data.current.hour;
      await createOneHourBlock(task.id, hour);
    }
  };

  const handleExternalDrop = async (taskId, hour) => {
    await createOneHourBlock(taskId, hour);
  };

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleExternalDrop,
  };
};

export default useCalendarDnD;
