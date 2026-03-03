import { Target } from 'lucide-react';

const STATUS_COLORS = {
  on_track: 'bg-cyan-500/20 text-cyan-300',
  at_risk: 'bg-amber-500/20 text-amber-300',
  off_track: 'bg-red-500/20 text-red-300',
  done: 'bg-emerald-500/20 text-emerald-300',
};

const KrBadge = ({ kr }) => {
  if (!kr) return null;

  const color = STATUS_COLORS[kr.status] || STATUS_COLORS.on_track;
  const shortTitle = kr.title?.length > 22 ? kr.title.slice(0, 20) + '...' : kr.title;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${color}`}
      title={`${kr.title} — ${kr.currentValue ?? 0}/${kr.targetValue ?? 0} ${kr.unit || ''} (${kr.progress}%)`}
    >
      <Target size={10} />
      <span>{shortTitle}</span>
      <span className="opacity-70">{kr.progress}%</span>
    </span>
  );
};

export default KrBadge;
