import { GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

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
        <span className="text-xs text-gray-500">{task.type === 'project' ? 'project' : 'task'}</span>
      </div>
    </div>
  );
};

export default DraggableTask;
