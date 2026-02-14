import { useState } from 'react';
import { Clock } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';

const TimeSlot = ({ hour, onExternalDrop }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${hour}`,
    data: { type: 'timeSlot', hour },
  });

  const [isDragOver, setIsDragOver] = useState(false);

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
      {(isOver || isDragOver) && <p className="text-xs text-cyan-400">Suelta aqui para crear bloque</p>}
    </div>
  );
};

export default TimeSlot;
