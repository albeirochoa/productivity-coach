import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, Zap, Clock, ChevronDown, ChevronRight, History
} from 'lucide-react';
import { api } from '../../utils/api';

const SEVERITY_STYLES = {
  high: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
};

const SEVERITY_LABELS = { high: 'Alta', medium: 'Media', low: 'Baja' };

const CoachView = ({ onRefreshData }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState(null);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCoachRecommendations();
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Coach no disponible. Verifica que el servidor este actualizado.');
      } else {
        setError('Error al cargar recomendaciones');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.getCoachHistory({ limit: 10 });
      setHistory(res.data.events || []);
    } catch {
      // History may not be available
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
    loadHistory();
  }, [loadRecommendations, loadHistory]);

  const handleApply = async (rec) => {
    setApplying(rec.id);
    try {
      await api.applyCoachRecommendation({
        recommendationId: rec.id,
        actionType: rec.suggestedAction.type,
        payload: rec.suggestedAction.payload,
      });
      // Remove from list and refresh
      setRecommendations(prev => prev.filter(r => r.id !== rec.id));
      loadHistory();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error applying recommendation:', err);
    } finally {
      setApplying(null);
    }
  };

  const handleReject = async (rec) => {
    try {
      await api.rejectCoachRecommendation({
        recommendationId: rec.id,
        ruleId: rec.ruleId,
        reason: 'Descartada por el usuario',
      });
      setRecommendations(prev => prev.filter(r => r.id !== rec.id));
      loadHistory();
    } catch (err) {
      console.error('Error rejecting recommendation:', err);
    }
  };

  const highCount = recommendations.filter(r => r.severity === 'high').length;
  const mediumCount = recommendations.filter(r => r.severity === 'medium').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Coach</h2>
            <p className="text-sm text-gray-400">Recomendaciones basadas en tu estado actual</p>
          </div>
        </div>
        <button
          onClick={loadRecommendations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Zap size={24} className="mx-auto mb-2 text-cyan-400" />
          <div className="text-2xl font-bold">{recommendations.length}</div>
          <div className="text-xs text-gray-400">Recomendaciones</div>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
          <AlertTriangle size={24} className="mx-auto mb-2 text-red-400" />
          <div className="text-2xl font-bold text-red-400">{highCount}</div>
          <div className="text-xs text-gray-400">Prioridad Alta</div>
        </div>
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-center">
          <TrendingUp size={24} className="mx-auto mb-2 text-yellow-400" />
          <div className="text-2xl font-bold text-yellow-400">{mediumCount}</div>
          <div className="text-xs text-gray-400">Prioridad Media</div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw size={32} className="mx-auto mb-4 text-gray-500 animate-spin" />
          <p className="text-gray-400">Analizando tu estado actual...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-400 opacity-50" />
          <h3 className="text-lg font-semibold mb-2 text-green-300">Todo en orden</h3>
          <p className="text-gray-400 text-sm">No hay recomendaciones en este momento. Buen trabajo.</p>
        </div>
      )}

      {/* Recommendations List */}
      {!loading && (
        <AnimatePresence>
          {recommendations.map((rec, idx) => {
            const style = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.low;
            const isApplying = applying === rec.id;
            const canApply = ['auto_redistribute', 'focus_task', 'plan_week', 'review_kr'].includes(rec.suggestedAction?.type);

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: idx * 0.05 }}
                className={`${style.bg} border ${style.border} rounded-xl p-5 space-y-3`}
              >
                {/* Title row */}
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className={`mt-0.5 shrink-0 ${style.icon}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{rec.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${style.badge}`}>
                        {SEVERITY_LABELS[rec.severity]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{rec.description}</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="ml-8 px-3 py-2 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Por que: </span>
                    {rec.reason}
                  </p>
                </div>

                {/* Actions */}
                <div className="ml-8 flex items-center gap-3">
                  {canApply && (
                    <button
                      onClick={() => handleApply(rec)}
                      disabled={isApplying}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium disabled:opacity-50"
                    >
                      {isApplying ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      {rec.suggestedAction?.label || 'Aplicar'}
                    </button>
                  )}

                  {!canApply && rec.suggestedAction && (
                    <span className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-lg text-sm">
                      <Clock size={14} />
                      {rec.suggestedAction.label} (manual)
                    </span>
                  )}

                  <button
                    onClick={() => handleReject(rec)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 transition-all text-sm"
                  >
                    <XCircle size={14} />
                    Descartar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      {/* History Section */}
      <div className="border-t border-white/10 pt-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <History size={16} />
          <span>Historial de acciones</span>
          {showHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {history.length > 0 && (
            <span className="px-2 py-0.5 bg-white/5 rounded text-xs">{history.length}</span>
          )}
        </button>

        {showHistory && (
          <div className="mt-4 space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Sin historial aun</p>
            ) : (
              history.map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-lg text-sm"
                >
                  {event.eventType === 'applied' && <CheckCircle size={16} className="text-green-400 shrink-0" />}
                  {event.eventType === 'rejected' && <XCircle size={16} className="text-red-400 shrink-0" />}
                  {event.eventType === 'generated' && <Zap size={16} className="text-cyan-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.createdAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    event.eventType === 'applied' ? 'bg-green-500/20 text-green-300'
                    : event.eventType === 'rejected' ? 'bg-red-500/20 text-red-300'
                    : 'bg-white/10 text-gray-400'
                  }`}>
                    {event.eventType === 'applied' ? 'Aplicada' : event.eventType === 'rejected' ? 'Descartada' : 'Generada'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachView;
