import { useState, useCallback, useEffect } from 'react';
import { api } from '../utils/api';

const useAreas = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all areas
  const fetchAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAreas();
      setAreas(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching areas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new area
  const createArea = useCallback(async (areaData) => {
    setError(null);
    try {
      await api.createArea(areaData);
      await fetchAreas(); // Refresh list
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Error creating area:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchAreas]);

  // Update existing area
  const updateArea = useCallback(async (areaId, updates) => {
    setError(null);
    try {
      await api.updateArea(areaId, updates);
      await fetchAreas(); // Refresh list
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Error updating area:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchAreas]);

  // Archive area (soft delete)
  const archiveArea = useCallback(async (areaId) => {
    setError(null);
    try {
      await api.archiveArea(areaId);
      await fetchAreas(); // Refresh list
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Error archiving area:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchAreas]);

  // Get area statistics
  const getAreaStats = useCallback(async (areaId) => {
    try {
      const response = await api.getAreaStats(areaId);
      return response.data;
    } catch (err) {
      console.error('Error fetching area stats:', err);
      return null;
    }
  }, []);

  // Computed: Active areas only
  const activeAreas = areas.filter(area => area.status === 'active');

  // Computed: Paused areas
  const pausedAreas = areas.filter(area => area.status === 'paused');

  // Computed: Archived areas
  const archivedAreas = areas.filter(area => area.status === 'archived');

  return {
    areas,
    activeAreas,
    pausedAreas,
    archivedAreas,
    loading,
    error,
    fetchAreas,
    createArea,
    updateArea,
    archiveArea,
    getAreaStats,
  };
};

export default useAreas;
