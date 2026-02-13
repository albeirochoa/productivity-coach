import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import useCalendar from '../../hooks/useCalendar';

const CalendarMonthView = ({ tasks }) => {
  const {
    selectedDate,
    monthData,
    loading,
    createBlock,
    goToToday,
    goToPreviousMonth,
    goToNextMonth,
    getMonthDates,
  } = useCalendar();

  const [selectedDay, setSelectedDay] = useState(null);

  const monthDates = getMonthDates(selectedDate);
  const today = new Date().toISOString().split('T')[0];

  const formatMonthYear = () => {
    const date = new Date(selectedDate + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const handleDayDrop = async (e, date) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      const result = await createBlock({
        taskId: projectId,
        date: date,
        startTime: '09:00',
        endTime: '10:00',
        durationMinutes: 60,
        notes: '',
      });

      if (!result.success) {
        alert(result.error);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const getDayBlocks = (date) => {
    if (!monthData?.days) return [];
    const dayData = monthData.days.find((d) => d.date === date);
    return dayData?.blocks || [];
  };

  const getDayTotalMinutes = (date) => {
    const blocks = getDayBlocks(date);
    return blocks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
  };

  if (loading && !monthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando mes...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h3 className="text-xl font-bold capitalize">{formatMonthYear()}</h3>
            <p className="text-sm text-gray-400 mt-1">
              {monthData?.totalScheduledMinutes
                ? `${Math.floor(monthData.totalScheduledMinutes / 60)}h ${
                    monthData.totalScheduledMinutes % 60
                  }m programados`
                : '0h programados'}
            </p>
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg text-sm font-medium transition-colors"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 flex-1">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {monthDates.map((dateInfo, index) => {
            const blocks = getDayBlocks(dateInfo.date);
            const totalMinutes = getDayTotalMinutes(dateInfo.date);
            const isToday = dateInfo.date === today;
            const isCurrentMonth = dateInfo.isCurrentMonth;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDayDrop(e, dateInfo.date)}
                className={`min-h-[100px] p-2 rounded-lg border transition-all cursor-pointer ${
                  isToday
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                onClick={() => setSelectedDay(dateInfo.date)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-sm font-semibold ${
                      isToday ? 'text-cyan-400' : isCurrentMonth ? '' : 'text-gray-600'
                    }`}
                  >
                    {new Date(dateInfo.date + 'T00:00:00').getDate()}
                  </span>
                  {totalMinutes > 0 && (
                    <span className="text-[10px] text-gray-500">
                      {Math.floor(totalMinutes / 60)}h
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {blocks.slice(0, 3).map((block) => (
                    <div
                      key={block.id}
                      className={`text-[10px] px-2 py-1 rounded truncate ${
                        block.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : block.status === 'in_progress'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {block.startTime.substring(0, 5)} {block.task?.title || 'Tarea'}
                    </div>
                  ))}
                  {blocks.length > 3 && (
                    <div className="text-[10px] text-gray-500 text-center">
                      +{blocks.length - 3} más
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setSelectedDay(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0e27] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {getDayBlocks(selectedDay).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay bloques programados
                </p>
              ) : (
                getDayBlocks(selectedDay).map((block) => (
                  <div
                    key={block.id}
                    className="p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{block.task?.title}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          block.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : block.status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}
                      >
                        {block.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {block.startTime} - {block.endTime} ({block.durationMinutes} min)
                    </div>
                    {block.notes && (
                      <p className="text-xs text-gray-500 mt-2">{block.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedDay(null)}
              className="w-full mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CalendarMonthView;
