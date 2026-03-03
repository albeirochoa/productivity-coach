import { useState } from 'react';
import {
  Wrench, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';

const TOOL_LABELS = {
  plan_week: 'Planificar Semana',
  schedule_block: 'Agendar Bloque',
  reprioritize: 'Repriorizar',
  goal_review: 'Revision de Objetivos',
};

const ActionPreview = ({ tool, preview, actionId, onConfirm, onCancel, loading, status }) => {
  const [expanded, setExpanded] = useState(false);

  const isResolved = status === 'confirmed' || status === 'cancelled' || status === 'expired';

  return (
    <div className={`rounded-xl p-4 space-y-3 ${
      isResolved
        ? status === 'confirmed'
          ? 'bg-green-500/5 border border-green-500/20'
          : 'bg-white/3 border border-white/10 opacity-60'
        : 'bg-white/5 border border-cyan-500/30'
    }`}>
      {/* Tool badge */}
      <div className="flex items-center gap-2">
        <Wrench size={14} className="text-cyan-400" />
        <span className="text-xs text-cyan-400 font-medium">
          {TOOL_LABELS[tool] || tool}
        </span>
        {isResolved && (
          <span className={`text-xs px-2 py-0.5 rounded ${
            status === 'confirmed'
              ? 'bg-green-500/20 text-green-300'
              : status === 'expired'
              ? 'bg-yellow-500/20 text-yellow-300'
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {status === 'confirmed' ? 'Ejecutada' : status === 'expired' ? 'Expirada' : 'Cancelada'}
          </span>
        )}
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-200 whitespace-pre-line">{preview.summary}</p>

      {/* Changes list (expandable) */}
      {preview.changes && preview.changes.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {preview.changes.length} cambio(s) propuesto(s)
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 ml-5">
              {preview.changes.map((change, i) => (
                <div key={change.taskId || i} className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span className="truncate">{change.title}</span>
                  {change.minutes && (
                    <span className="text-gray-600 shrink-0">({change.minutes}min)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Impact metrics */}
      {preview.impact && Object.keys(preview.impact).length > 0 && preview.impact.capacityUsedPct !== undefined && (
        <div className="flex gap-3 text-xs">
          <span className="text-gray-500">
            Capacidad: <span className={`font-medium ${
              preview.impact.capacityUsedPct > 90 ? 'text-yellow-400' : 'text-green-400'
            }`}>{preview.impact.capacityUsedPct}%</span>
          </span>
        </div>
      )}

      {/* Warnings */}
      {preview.warnings && preview.warnings.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-yellow-400">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{preview.warnings.join('. ')}</span>
        </div>
      )}

      {/* Reason */}
      {preview.reason && !isResolved && (
        <div className="px-3 py-2 bg-white/5 rounded-lg">
          <p className="text-xs text-gray-400">
            <span className="font-medium text-gray-300">Razon: </span>
            {preview.reason}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isResolved && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onConfirm(actionId)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            Confirmar
          </button>
          <button
            onClick={() => onCancel(actionId)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 transition-all text-sm disabled:opacity-50"
          >
            <XCircle size={14} />
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
};

export default ActionPreview;
