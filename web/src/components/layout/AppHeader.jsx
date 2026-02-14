import { Flame } from 'lucide-react';

const titles = {
  inbox: 'Bandeja de entrada',
  hoy: 'Hoy',
  thisweek: 'Esta Semana',
  someday: 'Algun dia',
  calendar: 'Calendario',
  projects: 'Proyectos',
};

const subtitles = ({
  activeView,
  inboxCount,
  todayActiveCount,
  thisWeekCount,
  somedayCount,
  activeProjectCount,
}) => {
  if (activeView === 'inbox') return `${inboxCount} ideas sin procesar`;
  if (activeView === 'hoy') return `${todayActiveCount} tareas para hoy`;
  if (activeView === 'thisweek') return `${thisWeekCount} tareas pendientes`;
  if (activeView === 'someday') return `${somedayCount} tareas sin compromiso semanal`;
  if (activeView === 'calendar') return 'Arrastra proyectos desde el sidebar para planificar';
  if (activeView === 'projects') return `${activeProjectCount} proyectos activos`;
  return '';
};

const AppHeader = ({
  activeView,
  inboxCount,
  todayActiveCount,
  thisWeekCount,
  somedayCount,
  activeProjectCount,
  completedThisWeekCount,
}) => {
  return (
    <header className="px-8 py-6 border-b border-white/5 bg-[#0a0e27]/50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{titles[activeView] || 'Dashboard'}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {subtitles({
              activeView,
              inboxCount,
              todayActiveCount,
              thisWeekCount,
              somedayCount,
              activeProjectCount,
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
            <Flame size={18} className="text-momentum" />
            <span className="text-sm font-semibold">{completedThisWeekCount} esta semana</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
