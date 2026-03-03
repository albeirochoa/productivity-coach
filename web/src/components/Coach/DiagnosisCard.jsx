import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, TrendingUp, Lightbulb } from 'lucide-react';
import { api } from '../../utils/api';

const DiagnosisCard = () => {
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiagnosis();
    // Refresh every 5 minutes
    const interval = setInterval(loadDiagnosis, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDiagnosis = async () => {
    try {
      const res = await api.getCoachDiagnosis();
      setDiagnosis(res.data);
    } catch (err) {
      console.error('Failed to load diagnosis:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-24 bg-white/5 rounded"></div>
      </div>
    );
  }

  if (!diagnosis) return null;

  const state = diagnosis?.state || 'equilibrado';
  const capacity = diagnosis?.capacity || {
    utilizationPct: 0,
    formatted: { used: '0m', usable: '0m' },
  };
  const diag = diagnosis?.diagnosis || {};

  // State colors and icons
  const stateConfig = {
    saturado: {
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: AlertTriangle,
      label: 'Sobrecargado',
    },
    equilibrado: {
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: CheckCircle,
      label: 'Equilibrado',
    },
    infrautilizado: {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      icon: TrendingUp,
      label: 'Infrautilizado',
    },
  };

  const config = stateConfig[state] || stateConfig.equilibrado;
  const Icon = config.icon;

  return (
    <div className={`glass rounded-xl p-4 border ${config.borderColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={20} className={config.color} />
          <h3 className="font-bold text-white text-sm">Diagnóstico de Carga</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
          {config.label}
        </div>
      </div>

      {/* Capacity Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Capacidad</span>
          <span>{capacity.utilizationPct}%</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              capacity.utilizationPct > 100
                ? 'bg-red-500'
                : capacity.utilizationPct > 85
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, capacity.utilizationPct)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{capacity.formatted.used}</span>
          <span>{capacity.formatted.usable}</span>
        </div>
      </div>

      {/* Primary Risk */}
      {diag.primaryRisk && (
        <div className="mb-3">
          <p className="text-xs text-orange-400 font-medium mb-1">⚠️ Riesgo Principal</p>
          <p className="text-xs text-gray-300">{diag.primaryRisk}</p>
        </div>
      )}

      {/* Recommendation */}
      {diag.recommendation && (
        <div className="mb-3">
          <p className="text-xs text-cyan-400 font-medium mb-1">💡 Recomendación</p>
          <p className="text-xs text-gray-300">{diag.recommendation}</p>
        </div>
      )}

      {/* Next Action */}
      {diag.nextAction && (
        <div className="mb-3 p-2 bg-white/5 rounded-lg">
          <p className="text-xs text-white font-medium mb-1">🎯 Siguiente Paso</p>
          <p className="text-xs text-gray-300">{diag.nextAction}</p>
        </div>
      )}

      {/* Tip de Oro */}
      {diag.tipDeOro && (
        <div className="flex items-start gap-2 p-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
          <Lightbulb size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-yellow-400 font-medium mb-0.5">Tip de Oro</p>
            <p className="text-xs text-gray-300">{diag.tipDeOro}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosisCard;
