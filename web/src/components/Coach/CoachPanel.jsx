import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../utils/api';

/**
 * CoachPanel - Fase 10.5
 *
 * Coach-first UX with proactive ceremonies based on risk signals.
 * Shows Morning Brief, Midweek Check, or Weekly Review when risks are detected.
 */
const CoachPanel = ({ onClose }) => {
  const [ceremonies, setCeremonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCeremonies = async () => {
    try {
      setRefreshing(true);
      const res = await api.getCoachCeremonies();
      setCeremonies(res.data.ceremonies || []);
    } catch (error) {
      console.error('Failed to load ceremonies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCeremonies();
  }, []);

  const handleDismiss = async (ceremony, action) => {
    try {
      await api.dismissCoachCeremony({
        ceremonyType: ceremony.type,
        action,
      });

      // Remove from local state
      setCeremonies(prev => prev.filter(c => c.type !== ceremony.type));
    } catch (error) {
      console.error('Failed to dismiss ceremony:', error);
    }
  };

  const getCeremonyIcon = (type) => {
    switch (type) {
      case 'morning_brief':
        return <Sun className="w-6 h-6" />;
      case 'midweek_check':
        return <TrendingUp className="w-6 h-6" />;
      case 'weekly_review':
        return <Calendar className="w-6 h-6" />;
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 border-red-500/40 text-red-200';
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200';
      default:
        return 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-slate-900/95 border border-cyan-500/30 rounded-xl p-8">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (ceremonies.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900/95 border border-cyan-500/30 rounded-xl p-8 max-w-md"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Coach Panel</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-slate-300 mb-2">Todo bajo control</p>
            <p className="text-sm text-slate-400">
              No hay riesgos detectados en este momento.
            </p>
          </div>
          <button
            onClick={loadCeremonies}
            disabled={refreshing}
            className="w-full mt-4 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900/95 border border-cyan-500/30 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Coach Panel</h2>
            <p className="text-sm text-slate-400 mt-1">
              {ceremonies.length} ceremonia(s) activa(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Ceremonies */}
        <div className="space-y-4">
          <AnimatePresence>
            {ceremonies.map((ceremony) => (
              <motion.div
                key={ceremony.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`border rounded-xl p-5 ${getSeverityColor(ceremony.severity)}`}
              >
                {/* Ceremony Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    {getCeremonyIcon(ceremony.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {ceremony.title}
                    </h3>
                    <p className="text-sm opacity-90">{ceremony.reason}</p>
                  </div>
                </div>

                {/* Risks */}
                {ceremony.risks && ceremony.risks.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {ceremony.risks.map((risk, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-sm bg-slate-800/30 rounded-lg p-3"
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{risk.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Actions */}
                {ceremony.suggestedActions && ceremony.suggestedActions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-white mb-2">
                      Acciones recomendadas:
                    </p>
                    <div className="space-y-2">
                      {ceremony.suggestedActions.map((action, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-800/30 rounded-lg p-3"
                        >
                          <p className="text-sm font-medium text-white mb-1">
                            {action.label}
                          </p>
                          <p className="text-xs opacity-75">{action.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDismiss(ceremony, 'apply')}
                    className="flex-1 px-4 py-2 bg-cyan-500/30 border border-cyan-500/50 text-white rounded-lg hover:bg-cyan-500/40 transition-colors flex items-center justify-center gap-2 min-w-[120px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aplicar
                  </button>
                  <button
                    onClick={() => handleDismiss(ceremony, 'postpone')}
                    className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-slate-300 rounded-lg hover:bg-slate-700/70 transition-colors flex items-center justify-center gap-2 min-w-[120px]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Posponer
                  </button>
                  <button
                    onClick={() => handleDismiss(ceremony, 'not_applicable')}
                    className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-slate-300 rounded-lg hover:bg-slate-700/70 transition-colors flex items-center justify-center gap-2 min-w-[120px]"
                  >
                    <XCircle className="w-4 h-4" />
                    No aplica
                  </button>
                  <button
                    onClick={() => handleDismiss(ceremony, 'explain')}
                    className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-slate-300 rounded-lg hover:bg-slate-700/70 transition-colors flex items-center justify-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Explícame
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Refresh Button */}
        <button
          onClick={loadCeremonies}
          disabled={refreshing}
          className="w-full mt-6 px-4 py-3 bg-slate-800/50 border border-slate-600/50 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </motion.div>
    </div>
  );
};

export default CoachPanel;
