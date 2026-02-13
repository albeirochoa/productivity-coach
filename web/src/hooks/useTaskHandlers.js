import { useCallback } from 'react';
import { api } from '../utils/api';

const useTaskHandlers = (fetchData) => {
  const toggleTask = useCallback(async (id) => {
    try {
      await api.toggleTask(id);
      fetchData();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  }, [fetchData]);

  const toggleMilestone = useCallback(async (projectId, milestoneId, completed) => {
    try {
      await api.toggleMilestone(projectId, milestoneId, { completed });
      fetchData();
    } catch (error) {
      console.error('Error toggling milestone:', error);
    }
  }, [fetchData]);

  const commitProjectToWeek = useCallback(async (projectId) => {
    try {
      await api.commitMilestone(projectId);
      fetchData();
    } catch (error) {
      console.error('Error committing project:', error);
    }
  }, [fetchData]);

  const removeFromWeek = useCallback(async (taskId) => {
    try {
      await api.updateTask(taskId, { thisWeek: false });
      fetchData();
    } catch (error) {
      console.error('Error removing from week:', error);
    }
  }, [fetchData]);

  const addQuickTask = useCallback(async (text, category = 'trabajo') => {
    try {
      await api.createTask({
        title: text,
        type: 'simple',
        category,
        thisWeek: true,
      });
      fetchData();
    } catch (error) {
      alert('Error al anadir tarea');
    }
  }, [fetchData]);

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      await api.updateTask(taskId, updates);
      fetchData();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error al actualizar tarea');
    }
  }, [fetchData]);

  return {
    toggleTask,
    toggleMilestone,
    commitProjectToWeek,
    removeFromWeek,
    addQuickTask,
    updateTask,
  };
};

export default useTaskHandlers;
