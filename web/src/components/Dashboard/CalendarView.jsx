import { useState } from 'react';
import { Calendar, Grid3x3, Rows3, Square } from 'lucide-react';
import CalendarDayView from './CalendarDayView';
import CalendarWeekView from './CalendarWeekView';
import CalendarMonthView from './CalendarMonthView';

const CalendarView = ({ tasks }) => {
  const [viewMode, setViewMode] = useState('week'); // 'day' | 'week' | 'month'

  const viewModes = [
    { id: 'day', label: 'Día', icon: Square },
    { id: 'week', label: 'Semana', icon: Rows3 },
    { id: 'month', label: 'Mes', icon: Grid3x3 },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* View Selector */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-cyan-400" />
          <h2 className="text-2xl font-bold">Calendario</h2>
        </div>

        <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === mode.id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <mode.icon size={16} />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'day' && <CalendarDayView tasks={tasks} hideTaskList />}
        {viewMode === 'week' && <CalendarWeekView tasks={tasks} hideTaskList />}
        {viewMode === 'month' && <CalendarMonthView tasks={tasks} />}
      </div>
    </div>
  );
};

export default CalendarView;
