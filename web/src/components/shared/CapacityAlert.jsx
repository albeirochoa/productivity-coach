import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Zap, X } from 'lucide-react';
import { useState } from 'react';

/**
 * CapacityAlert Component
 * Displays capacity warnings and auto-redistribute suggestions
 */
const CapacityAlert = ({ overload, onDismiss, onAutoFix }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!overload) return null;

  const { isOverloaded, percentage, excess, excessFormatted, capacity, current, suggestions } = overload;

  // Determine severity level
  const getSeverity = () => {
    if (percentage >= 150) return { color: 'red', label: 'Crítico', icon: AlertTriangle };
    if (percentage >= 120) return { color: 'orange', label: 'Alto', icon: AlertTriangle };
    if (percentage >= 100) return { color: 'yellow', label: 'Moderado', icon: Zap };
    return { color: 'green', label: 'OK', icon: CheckCircle };
  };

  const severity = getSeverity();
  const Icon = severity.icon;

  if (!isOverloaded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3"
      >
        <CheckCircle size={20} className="text-green-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-300">
            Capacidad OK
          </p>
          <p className="text-xs text-green-400/70">
            {current} / {capacity} ({percentage}%)
          </p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-green-400/50 hover:text-green-400">
            <X size={16} />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`px-4 py-3 rounded-xl bg-${severity.color}-500/10 border border-${severity.color}-500/30`}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} className={`text-${severity.color}-400 mt-0.5`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white">
              Sobrecarga detectada
            </p>
            <span className={`px-2 py-0.5 rounded text-xs bg-${severity.color}-500/20 text-${severity.color}-300`}>
              {severity.label}
            </span>
          </div>

          <p className="text-xs text-gray-300 mb-2">
            Tu semana está sobrecargada por <strong>{excessFormatted}</strong> ({percentage}% de capacidad)
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <span>Comprometido: <strong className="text-white">{current}</strong></span>
            <span className="text-gray-600">•</span>
            <span>Capacidad: <strong className="text-white">{capacity}</strong></span>
            <span className="text-gray-600">•</span>
            <span>Exceso: <strong className={`text-${severity.color}-300`}>{excessFormatted}</strong></span>
          </div>

          {/* Auto-fix suggestion */}
          {onAutoFix && suggestions && suggestions.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={onAutoFix}
                className="px-3 py-1.5 bg-momentum rounded-lg text-xs font-medium hover:bg-momentum/80 transition-all flex items-center gap-1.5"
              >
                <Zap size={12} />
                Auto-redistribuir ({suggestions.length} cambios)
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-3 py-1.5 bg-white/5 rounded-lg text-xs font-medium hover:bg-white/10 transition-all"
              >
                {showDetails ? 'Ocultar' : 'Ver'} detalles
              </button>
            </div>
          )}

          {/* Details */}
          <AnimatePresence>
            {showDetails && suggestions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 pt-3 border-t border-white/10 space-y-1.5"
              >
                <p className="text-xs font-medium text-gray-300 mb-2">Cambios sugeridos:</p>
                {suggestions.map((suggestion, idx) => (
                  <div key={idx} className="text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-momentum">•</span>
                    <span>
                      {suggestion.action === 'defer' ? (
                        <>Posponer "<strong className="text-white">{suggestion.taskTitle}</strong>" (ahorra {suggestion.minutesFormatted})</>
                      ) : (
                        <>Descomprometer milestone "<strong className="text-white">{suggestion.milestoneTitle}</strong>" de {suggestion.taskTitle} (ahorra {suggestion.minutesFormatted})</>
                      )}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default CapacityAlert;
