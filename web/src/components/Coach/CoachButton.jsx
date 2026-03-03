import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Bell } from 'lucide-react';
import CoachPanel from './CoachPanel';
import { api } from '../../utils/api';

/**
 * CoachButton - Floating button to open ceremonies panel
 * Shows notification badge if there are active ceremonies
 */
const CoachButton = () => {
  const [showPanel, setShowPanel] = useState(false);
  const [hasCeremonies, setHasCeremonies] = useState(false);

  // Check for active ceremonies on mount and every 5 minutes
  useEffect(() => {
    const checkCeremonies = async () => {
      try {
        const res = await api.getCoachCeremonies();
        setHasCeremonies(res.data.count > 0);
      } catch (error) {
        console.error('Failed to check ceremonies:', error);
      }
    };

    checkCeremonies();
    const interval = setInterval(checkCeremonies, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="fixed bottom-8 right-8 z-40">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowPanel(true)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30 flex items-center justify-center text-white transition-all"
        >
          <Brain size={28} />
          {hasCeremonies && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center"
            >
              <Bell size={12} />
            </motion.div>
          )}
        </motion.button>
      </div>

      {showPanel && (
        <CoachPanel
          onClose={() => {
            setShowPanel(false);
            // Refresh ceremony count after closing
            api.getCoachCeremonies()
              .then(res => setHasCeremonies(res.data.count > 0))
              .catch(err => console.error('Failed to refresh ceremonies:', err));
          }}
        />
      )}
    </>
  );
};

export default CoachButton;
