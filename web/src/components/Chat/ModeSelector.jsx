import { MessageSquare, Zap } from 'lucide-react';

const ModeSelector = ({ mode, onChange }) => (
  <div className="flex gap-1 bg-white/5 rounded-lg p-1 relative z-10">
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange('suggest');
      }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
        mode === 'suggest'
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <MessageSquare size={12} />
      Sugerir
    </button>
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange('act');
      }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
        mode === 'act'
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Zap size={12} />
      Actuar
    </button>
  </div>
);

export default ModeSelector;
