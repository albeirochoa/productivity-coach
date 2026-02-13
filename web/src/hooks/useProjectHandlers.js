import { useCallback, useState } from 'react';
import { api } from '../utils/api';

const useProjectHandlers = (fetchData) => {
  const [capacityError, setCapacityError] = useState(null);

  const moveProject = useCallback(async (draggedId, targetId) => {
    try {
      await api.moveProject(draggedId, { parentId: targetId });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al mover proyecto');
    }
  }, [fetchData]);

  const unparentProject = useCallback(async (projectId) => {
    try {
      await api.moveProject(projectId, { parentId: null });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al mover proyecto');
    }
  }, [fetchData]);

  const commitMilestone = useCallback(async (projectId, milestoneId, force = false) => {
    try {
      setCapacityError(null);
      await api.commitMilestone(projectId, milestoneId, force);
      fetchData();
      return { success: true };
    } catch (error) {
      // Check if it's a capacity error (HTTP 409)
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        setCapacityError({
          isOverloaded: true,
          message: errorData.message,
          percentage: errorData.overload?.percentage || 0,
          excess: errorData.overload?.excess || 0,
          excessFormatted: errorData.overload?.excessFormatted || '',
          current: errorData.capacity?.current?.formatted || '',
          capacity: errorData.capacity?.limit?.formatted || '',
          projectId,
          milestoneId,
        });
        return { success: false, capacityError: errorData };
      }

      // Other errors
      alert(error.response?.data?.error || 'Error al comprometer milestone');
      return { success: false, error: error.response?.data?.error };
    }
  }, [fetchData]);

  const forceCommitMilestone = useCallback(async (projectId, milestoneId) => {
    return commitMilestone(projectId, milestoneId, true);
  }, [commitMilestone]);

  const clearCapacityError = useCallback(() => {
    setCapacityError(null);
  }, []);

  return {
    moveProject,
    unparentProject,
    commitMilestone,
    forceCommitMilestone,
    capacityError,
    clearCapacityError,
  };
};

export default useProjectHandlers;
