import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { api } from './utils/api';

// Hooks
import useAppData from './hooks/useAppData';
import useTaskHandlers from './hooks/useTaskHandlers';
import useInboxHandlers from './hooks/useInboxHandlers';
import useProjectHandlers from './hooks/useProjectHandlers';
import useCapacity from './hooks/useCapacity';

import Sidebar from './components/Dashboard/Sidebar';
import ChatBubble from './components/Chat/ChatBubble';
import ProjectWizard from './components/ProjectWizard/ProjectWizard';
import QuickCaptureModal from './components/shared/QuickCaptureModal';
import EditInboxModal from './components/shared/EditInboxModal';
import EditTaskModal from './components/shared/EditTaskModal';
import TemplateManager from './components/TemplateManager';
import AppHeader from './components/layout/AppHeader';
import MainViewRouter from './components/layout/MainViewRouter';

const App = () => {
  // Data & derived state
  const {
    inbox,
    stats,
    profile,
    loading,
    thisWeekTasks,
    completedThisWeek,
    somedayTasks,
    projects,
    projectTree,
    inboxCount,
    fetchData,
  } = useAppData();

  // Handlers
  const { toggleTask, updateTask } = useTaskHandlers(fetchData);
  const {
    editingInboxItem,
    setEditingInboxItem,
    deleteInboxItem,
    editInboxItem,
    saveInboxEdit,
    processInboxItem,
  } = useInboxHandlers(fetchData);
  const {
    moveProject,
    unparentProject,
    capacityError,
    clearCapacityError
  } = useProjectHandlers(fetchData);

  // Capacity management
  const {
    capacityStatus,
    fetchCapacityStatus,
    previewRedistribute,
    executeRedistribute,
  } = useCapacity();

  // UI state
  const [activeView, setActiveView] = useState('inbox');
  const [showCapture, setShowCapture] = useState(false);
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [wizardInitialForm, setWizardInitialForm] = useState(null);
  const [redistributeSuggestions, setRedistributeSuggestions] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  // Calcular tareas de hoy:
  // 1. Tareas con dueDate = hoy
  // 2. Tareas de esta semana sin dueDate asignado (necesitan atencion hoy)
  const todayTasks = thisWeekTasks.filter(task => {
    if (!task.dueDate) return true; // Sin fecha = mostrar en hoy
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  });

  // Handler para abrir wizard desde inbox (con datos pre-cargados)
  const handleOpenWizardWithItem = (item, type) => {
    setWizardInitialForm({
      title: item.text,
      description: '',
      category: type === 'work' ? 'trabajo' : 'familia',
      strategy: 'goteo',
      templateId: '',
    });
    deleteInboxItem(item.id, type);
    setShowProjectWizard(true);
  };

  // Capacity handlers
  const handleAutoRedistribute = async () => {
    const preview = await previewRedistribute();
    if (preview.success) {
      setRedistributeSuggestions(preview.data);
      // Show confirmation dialog
      const confirmed = confirm(
        `¿Quieres redistribuir automáticamente?\n\n${preview.data.message}\n\nCambios: ${preview.data.suggestions?.length || 0}`
      );
      if (confirmed) {
        const result = await executeRedistribute();
        if (result.success) {
          alert(result.data.message);
          fetchData(); // Refresh main data
        }
      }
    }
  };

  const refreshCapacity = async () => {
    await fetchCapacityStatus();
  };

  // Handler para drop entre secciones (sidebar ↔ main content)
  const handleSectionDrop = async (taskId, targetSection) => {
    try {
      // Detectar si es un inbox item (ID formato: inbox-work-123 o inbox-personal-123)
      if (taskId.startsWith('inbox-')) {
        const parts = taskId.split('-');
        const inboxType = parts[1]; // 'work' o 'personal'
        const inboxItem = inbox[inboxType]?.find(i => i.id === taskId);
        if (inboxItem) {
          const thisWeek = targetSection === 'thisweek' || targetSection === 'hoy';
          await api.processInboxItem(inboxType, taskId, {
            taskType: 'simple',
            thisWeek,
            category: inboxType === 'work' ? 'trabajo' : 'familia',
          });
          fetchData();
        }
        return;
      }

      if (targetSection === 'thisweek' || targetSection === 'hoy') {
        await updateTask(taskId, { thisWeek: true });
      } else if (targetSection === 'someday') {
        await updateTask(taskId, { thisWeek: false });
      }
    } catch (error) {
      console.error('Error moving task:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-momentum border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-dark to-[#1a1f3a] text-white flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        profile={profile}
        stats={stats}
        activeView={activeView}
        setActiveView={setActiveView}
        thisWeekCount={thisWeekTasks.length}
        thisWeekTasks={thisWeekTasks}
        todayTasks={todayTasks}
        todayCount={todayTasks.filter(t => t.status === 'active').length}
        somedayTasks={somedayTasks}
        somedayCount={somedayTasks.length}
        inbox={inbox}
        inboxCount={inboxCount}
        activeProjectCount={projects.filter(p => p.status !== 'done').length}
        projectTree={projectTree}
        onProjectDrop={moveProject}
        onSectionDrop={handleSectionDrop}
        onOpenWizard={() => setShowProjectWizard(true)}
        onOpenTemplateManager={() => setShowTemplateManager(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          activeView={activeView}
          inboxCount={inboxCount}
          todayActiveCount={todayTasks.filter(t => t.status === 'active').length}
          thisWeekCount={thisWeekTasks.length}
          somedayCount={somedayTasks.length}
          activeProjectCount={projects.filter(p => p.status !== 'done').length}
          completedThisWeekCount={completedThisWeek.length}
        />

        <MainViewRouter
          activeView={activeView}
          capacityError={capacityError}
          clearCapacityError={clearCapacityError}
          handleAutoRedistribute={handleAutoRedistribute}
          inbox={inbox}
          processInboxItem={processInboxItem}
          editInboxItem={editInboxItem}
          deleteInboxItem={deleteInboxItem}
          handleOpenWizardWithItem={handleOpenWizardWithItem}
          todayTasks={todayTasks}
          toggleTask={toggleTask}
          fetchData={fetchData}
          handleSectionDrop={handleSectionDrop}
          setEditingTask={setEditingTask}
          thisWeekTasks={thisWeekTasks}
          completedThisWeek={completedThisWeek}
          inboxCount={inboxCount}
          setShowCapture={setShowCapture}
          setActiveView={setActiveView}
          refreshCapacity={refreshCapacity}
          capacityStatus={capacityStatus}
          somedayTasks={somedayTasks}
          projects={projects}
          projectTree={projectTree}
          unparentProject={unparentProject}
          setShowProjectWizard={setShowProjectWizard}
        />
      </main>

      {/* Modals */}
      <QuickCaptureModal
        show={showCapture}
        onClose={() => setShowCapture(false)}
        onRefresh={fetchData}
      />

      <ProjectWizard
        show={showProjectWizard}
        onClose={() => {
          setShowProjectWizard(false);
          setWizardInitialForm(null);
        }}
        onRefresh={fetchData}
        initialForm={wizardInitialForm}
      />

      <EditInboxModal
        editingItem={editingInboxItem}
        setEditingItem={setEditingInboxItem}
        onSave={saveInboxEdit}
      />

      <EditTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={updateTask}
        projects={projects}
      />

      <TemplateManager
        show={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        onRefresh={fetchData}
      />

      {/* Floating Quick Add Button */}
      <button
        onClick={() => setShowCapture(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-momentum hover:bg-momentum/80 rounded-full shadow-2xl shadow-momentum/40 flex items-center justify-center text-white transition-all hover:scale-110"
      >
        <Plus size={28} />
      </button>

      {/* Chat */}
      <ChatBubble onRefresh={fetchData} />
    </div>
  );
};

export default App;
