import { api } from '../utils/api';

const useProjectCardActions = ({ projectId, projectTitle, onRefresh }) => {
  const addMilestone = async ({ title, timeEstimate }, sectionId = null) => {
    await api.addMilestone(projectId, {
      title,
      timeEstimate,
      sectionId,
    });
    onRefresh();
  };

  const addSection = async (name) => {
    await api.addSection(projectId, { name });
    onRefresh();
  };

  const deleteSection = async (sectionId) => {
    await api.deleteSection(projectId, sectionId);
    onRefresh();
  };

  const toggleMilestone = async (milestoneId, completed) => {
    await api.toggleMilestone(projectId, milestoneId, { completed: !completed });
    onRefresh();
  };

  const commitMilestoneToWeek = async (milestoneId) => {
    try {
      await api.commitMilestone(projectId, milestoneId, false);
      onRefresh();
      return;
    } catch (error) {
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        const message = `${errorData.message}\n\n¿Quieres comprometer de todas formas?`;
        const force = confirm(message);
        if (force) {
          await api.commitMilestone(projectId, milestoneId, true);
          onRefresh();
        }
        return;
      }
      throw error;
    }
  };

  const archiveProject = async () => {
    if (!confirm(`¿Archivar "${projectTitle}"? Puedes restaurarlo después.`)) return false;
    await api.archiveProject(projectId);
    onRefresh();
    return true;
  };

  const deleteProject = async () => {
    if (!confirm(`¿ELIMINAR "${projectTitle}"? Esta acción NO se puede deshacer.`)) return false;
    await api.deleteProject(projectId);
    onRefresh();
    return true;
  };

  const saveProject = async (targetProjectId, updates) => {
    await api.updateTask(targetProjectId, updates);
    onRefresh();
  };

  const saveMilestone = async (targetProjectId, milestoneId, updates) => {
    await api.updateMilestone(targetProjectId, milestoneId, updates);
    onRefresh();
  };

  return {
    addMilestone,
    addSection,
    deleteSection,
    toggleMilestone,
    commitMilestoneToWeek,
    archiveProject,
    deleteProject,
    saveProject,
    saveMilestone,
  };
};

export default useProjectCardActions;
