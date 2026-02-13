import { useState } from 'react';
import { ChevronRight, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ProjectTreeItem = ({ project, depth = 0, onClick, onDrop }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isOver, setIsOver] = useState(false);
  const hasChildren = project.children && project.children.length > 0;
  const progress = project.milestones
    ? (project.milestones.filter(m => m.completed).length / project.milestones.length) * 100
    : 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: `${12 + depth * 16}px`,
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    const draggedProjectId = e.dataTransfer.getData('projectId');
    if (draggedProjectId && draggedProjectId !== project.id) {
      onDrop(draggedProjectId, project.id);
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('projectId', project.id);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all group cursor-move ${
          isOver ? 'bg-purple-500/20 border-2 border-purple-500 border-dashed' : ''
        }`}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50">
          <GripVertical size={14} />
        </div>
        {hasChildren && (
          <ChevronRight
            size={14}
            className={`transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          />
        )}
        {!hasChildren && <div className="w-3.5" />}
        <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
        <button onClick={onClick} className="flex-1 text-left text-sm truncate">
          {project.title}
        </button>
        <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {project.children.map(child => (
            <ProjectTreeItem
              key={child.id}
              project={child}
              depth={depth + 1}
              onClick={onClick}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default ProjectTreeItem;
