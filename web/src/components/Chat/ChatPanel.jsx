import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Flame, RefreshCw, Sparkles, Settings, Activity } from 'lucide-react';
import { api } from '../../utils/api';
import ModeSelector from './ModeSelector';
import ActionPreview from './ActionPreview';
import CoachStyleModal from '../shared/CoachStyleModal';
import DiagnosisCard from '../Coach/DiagnosisCard';

const ChatPanel = ({ onClose, onRefresh }) => {
  const [messages, setMessages] = useState([
    { role: 'coach', content: 'Hola! Soy Jarvis-Elite, tu coach de productividad. Puedo diagnosticar tu carga, planificar tu semana, repriorizar tareas, y proteger tu Deep Work.' },
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('suggest');
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [useLegacy, setUseLegacy] = useState(false);
  const [llmPowered, setLlmPowered] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load recent session history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.getCoachChatHistory({ limit: 10 });
        if (res.data.sessions && res.data.sessions.length > 0) {
          const recent = res.data.sessions[0];
          // Reuse session if less than 30 min old
          const age = Date.now() - new Date(recent.startedAt).getTime();
          if (age < 30 * 60 * 1000 && recent.messageCount > 0) {
            setSessionId(recent.id);
            setMode(recent.mode || 'suggest');
            // Load messages
            const histRes = await api.getCoachChatHistory({ sessionId: recent.id, limit: 50 });
            if (histRes.data.messages && histRes.data.messages.length > 0) {
              setMessages(histRes.data.messages.map(m => ({
                role: m.role,
                content: m.content,
                tool: m.tool,
                actionId: m.actionId,
                actionStatus: m.actionStatus,
                actionPreview: m.actionPreview,
              })));
            }
          }
        }
      } catch (err) {
        // Only set legacy if the endpoint doesn't exist (404)
        // Other errors (network, 500, etc) should not trigger legacy mode
        if (err.response?.status === 404) {
          setUseLegacy(true);
        }
        // Silently ignore other errors - new session will be created on first message
      }
    };
    loadHistory();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    try {
      if (useLegacy) {
        // Fallback to legacy chat
        const res = await api.sendMessage(userMsg);
        setMessages(prev => [...prev, { role: 'coach', content: res.data.response }]);
        if (res.data.action === 'refresh_inbox' && onRefresh) onRefresh();
      } else {
        const res = await api.sendCoachChatMessage({
          message: userMsg,
          sessionId,
          mode,
        });

        const data = res.data;
        if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
        }

        // Detect LLM-powered response
        if (data.llmPowered) {
          setLlmPowered(true);
        }

        const coachMsg = {
          role: 'coach',
          content: data.response,
          tool: data.tool,
          actionId: data.actionId,
          actionStatus: data.requiresConfirmation ? 'pending' : null,
          actionPreview: data.preview,
          llmPowered: data.llmPowered,
          blocked: data.blocked,
        };
        setMessages(prev => [...prev, coachMsg]);
      }
    } catch (err) {
      if (err.response?.status === 404 && !useLegacy) {
        setUseLegacy(true);
        // Retry with legacy
        try {
          const res = await api.sendMessage(userMsg);
          setMessages(prev => [...prev, { role: 'coach', content: res.data.response }]);
        } catch {
          setMessages(prev => [...prev, { role: 'coach', content: 'Error de conexion.' }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'coach', content: 'Error de conexion. Intenta de nuevo.' }]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async (actionId) => {
    setConfirming(actionId);
    try {
      const res = await api.confirmCoachChatAction({
        actionId,
        confirm: true,
        sessionId,
      });

      // Update the message status
      setMessages(prev => prev.map(m =>
        m.actionId === actionId ? { ...m, actionStatus: 'confirmed' } : m
      ));

      // Add result message
      setMessages(prev => [...prev, { role: 'coach', content: res.data.response }]);

      if (onRefresh) onRefresh();
    } catch (err) {
      const errorMsg = err.response?.status === 410
        ? 'La accion ha expirado. Solicita una nueva propuesta.'
        : 'Error al confirmar la accion.';
      setMessages(prev => [...prev, { role: 'coach', content: errorMsg }]);

      if (err.response?.status === 410) {
        setMessages(prev => prev.map(m =>
          m.actionId === actionId ? { ...m, actionStatus: 'expired' } : m
        ));
      }
    } finally {
      setConfirming(null);
    }
  };

  const handleCancel = async (actionId) => {
    setConfirming(actionId);
    try {
      const res = await api.confirmCoachChatAction({
        actionId,
        confirm: false,
        sessionId,
      });

      setMessages(prev => prev.map(m =>
        m.actionId === actionId ? { ...m, actionStatus: 'cancelled' } : m
      ));
      setMessages(prev => [...prev, { role: 'coach', content: res.data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', content: 'Error al cancelar la accion.' }]);
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="absolute bottom-20 left-0 w-[400px] h-[540px] glass rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-white/10">
      {/* Header */}
      <div className="p-4 bg-momentum flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            {llmPowered ? (
              <Sparkles size={18} className="text-white fill-white animate-pulse" />
            ) : (
              <Flame size={18} className="text-white fill-white" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              Coach
              {llmPowered && (
                <span className="text-[9px] px-2 py-0.5 bg-white/20 rounded-full">LLM</span>
              )}
            </h3>
            <p className="text-[10px] text-white/70">
              {llmPowered ? 'Asistente especializado' : 'Asistente con acciones'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!useLegacy && <ModeSelector mode={mode} onChange={setMode} />}
          <button onClick={() => setShowDiagnosis(!showDiagnosis)} className={`${showDiagnosis ? 'text-white' : 'text-white/60'} hover:text-white`} title="Diagnostico de Carga">
            <Activity size={16} />
          </button>
          <button onClick={() => setShowStyleModal(true)} className="text-white/60 hover:text-white" title="Configuracion del Coach">
            <Settings size={16} />
          </button>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Diagnosis Card (toggleable) */}
      {showDiagnosis && (
        <div className="p-3 bg-black/20 border-b border-white/5">
          <DiagnosisCard />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'coach' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-line relative ${
                  msg.role === 'coach'
                    ? 'bg-white/5 text-gray-200 rounded-tl-none'
                    : 'bg-momentum text-white rounded-tr-none'
                }`}
              >
                {msg.content}
                {msg.llmPowered && msg.role === 'coach' && (
                  <div className="absolute -top-1 -right-1">
                    <Sparkles size={12} className="text-momentum/80 fill-momentum/80" />
                  </div>
                )}
                {msg.blocked && (
                  <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Bloqueado por guardrails</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Preview */}
            {msg.actionId && msg.actionPreview && (
              <div className="mt-2 ml-0">
                <ActionPreview
                  tool={msg.tool}
                  preview={msg.actionPreview}
                  actionId={msg.actionId}
                  status={msg.actionStatus}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  loading={confirming === msg.actionId}
                />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white/5 text-gray-400 p-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Analizando...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white/5 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={mode === 'act' ? 'Escribe una accion...' : 'Escribe tu pregunta...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-momentum disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-10 h-10 bg-momentum rounded-xl flex items-center justify-center text-white hover:scale-110 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send size={16} />
          </button>
        </div>
      </form>

      {showStyleModal && <CoachStyleModal onClose={() => setShowStyleModal(false)} />}
    </div>
  );
};

export default ChatPanel;
