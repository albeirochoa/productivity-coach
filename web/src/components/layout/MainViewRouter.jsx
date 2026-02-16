import CapacityAlert from '../shared/CapacityAlert';
import InboxView from '../Dashboard/InboxView';
import TodayView from '../Dashboard/TodayView';
import ThisWeekView from '../Dashboard/ThisWeekView';
import SomedayView from '../Dashboard/SomedayView';
import CalendarView from '../Dashboard/CalendarView';
import ProjectsView from '../Dashboard/ProjectsView';
import AreasView from '../Dashboard/AreasView';
import ObjectivesView from '../Dashboard/ObjectivesView';
import CoachView from '../Dashboard/CoachView';

const MainViewRouter = ({
  activeView,
  capacityError,
  clearCapacityError,
  handleAutoRedistribute,
  inbox,
  processInboxItem,
  editInboxItem,
  deleteInboxItem,
  handleOpenWizardWithItem,
  todayTasks,
  toggleTask,
  fetchData,
  handleSectionDrop,
  setEditingTask,
  thisWeekTasks,
  completedThisWeek,
  inboxCount,
  setShowCapture,
  setActiveView,
  refreshCapacity,
  capacityStatus,
  somedayTasks,
  projects,
  projectTree,
  unparentProject,
  setShowProjectWizard,
}) => {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      {capacityError && activeView === 'thisweek' && (
        <div className="max-w-4xl mx-auto mb-4">
          <CapacityAlert
            overload={capacityError}
            onDismiss={clearCapacityError}
            onAutoFix={handleAutoRedistribute}
          />
        </div>
      )}

      {activeView === 'inbox' && (
        <InboxView
          inbox={inbox}
          onProcessItem={processInboxItem}
          onEditItem={editInboxItem}
          onDeleteItem={deleteInboxItem}
          onOpenWizardWithItem={handleOpenWizardWithItem}
        />
      )}

      {activeView === 'hoy' && (
        <TodayView
          todayTasks={todayTasks}
          onToggleTask={toggleTask}
          onRefresh={fetchData}
          onSectionDrop={(taskId) => handleSectionDrop(taskId, 'hoy')}
          onEditTask={setEditingTask}
        />
      )}

      {activeView === 'thisweek' && (
        <ThisWeekView
          thisWeekTasks={thisWeekTasks}
          completedThisWeek={completedThisWeek}
          inboxCount={inboxCount}
          onToggleTask={toggleTask}
          onShowCapture={() => setShowCapture(true)}
          onGoToInbox={() => setActiveView('inbox')}
          onRefresh={() => {
            fetchData();
            refreshCapacity();
          }}
          capacityStatus={capacityStatus}
          onEditTask={setEditingTask}
          onSectionDrop={(taskId) => handleSectionDrop(taskId, 'thisweek')}
        />
      )}

      {activeView === 'someday' && (
        <SomedayView
          somedayTasks={somedayTasks}
          onToggleTask={toggleTask}
          onRefresh={fetchData}
          onSectionDrop={(taskId) => handleSectionDrop(taskId, 'someday')}
          onEditTask={setEditingTask}
        />
      )}

      {activeView === 'calendar' && <CalendarView tasks={thisWeekTasks.concat(projects)} />}

      {activeView === 'projects' && (
        <ProjectsView
          projectTree={projectTree}
          projects={projects}
          onUnparent={unparentProject}
          onOpenWizard={() => setShowProjectWizard(true)}
          onRefresh={fetchData}
        />
      )}

      {activeView === 'areas' && (
        <AreasView
          onNavigateToTasks={(view, category) => {
            setActiveView(view);
            // TODO: Implement category filter in task views
          }}
        />
      )}

      {activeView === 'objectives' && <ObjectivesView />}

      {activeView === 'coach' && <CoachView onRefreshData={fetchData} />}
    </div>
  );
};

export default MainViewRouter;
