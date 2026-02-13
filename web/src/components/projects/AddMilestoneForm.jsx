import { useState } from 'react';
import { X } from 'lucide-react';

const AddMilestoneForm = ({ onAdd, onCancel }) => {
  const [title, setTitle] = useState('');
  const [timeEstimate, setTimeEstimate] = useState(45);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), timeEstimate });
    setTitle('');
    setTimeEstimate(45);
  };

  return (
    <div className="flex gap-2 items-center px-3 py-2 bg-white/5 rounded-lg">
      <div className="w-4 h-4 rounded-full border-2 border-purple-500/50 shrink-0" />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nueva tarea..."
        className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2">
        <input
          type="number"
          value={timeEstimate}
          onChange={(e) => setTimeEstimate(parseInt(e.target.value, 10) || 45)}
          className="w-10 bg-transparent text-center text-xs focus:outline-none"
          min="5"
          max="120"
        />
        <span className="text-[10px] text-white/40">min</span>
      </div>
      <button
        onClick={handleSubmit}
        className="px-3 py-1 bg-purple-500 hover:bg-purple-600 rounded text-xs font-medium transition-colors"
      >
        Agregar
      </button>
      <button
        onClick={onCancel}
        className="p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default AddMilestoneForm;
