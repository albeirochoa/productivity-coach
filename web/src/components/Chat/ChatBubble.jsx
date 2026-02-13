import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, MessageCircle, Send, X } from 'lucide-react';
import { api } from '../../utils/api';

const ChatBubble = ({ onRefresh }) => {
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'coach', text: '!Hola! Soy tu Coach de Momentum. Que puedo ayudarte hoy?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    try {
      const res = await api.sendMessage(chatInput);
      setChatMessages(prev => [...prev, { role: 'coach', text: res.data.response }]);
      if (res.data.action === 'refresh_inbox') onRefresh();
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'coach', text: 'Error de conexion.' }]);
    }
  };

  return (
    <div className="fixed bottom-8 left-8 z-50">
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 left-0 w-[380px] h-[500px] glass rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-white/10"
          >
            <div className="p-5 bg-momentum flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Flame size={20} className="text-white fill-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Coach</h3>
                  <p className="text-xs text-white/70">En linea</p>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="text-white/60 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'coach' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.role === 'coach'
                        ? 'bg-white/5 text-gray-200 rounded-tl-none'
                        : 'bg-momentum text-white rounded-tr-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white/5 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-momentum"
                />
                <button
                  type="submit"
                  className="w-10 h-10 bg-momentum rounded-xl flex items-center justify-center text-white hover:scale-110 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowChat(!showChat)}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all ${
          showChat ? 'bg-red-500' : 'bg-gradient-to-r from-momentum to-purple-500 shadow-momentum/40'
        }`}
      >
        {showChat ? <X size={28} /> : <MessageCircle size={28} />}
      </motion.button>
    </div>
  );
};

export default ChatBubble;
