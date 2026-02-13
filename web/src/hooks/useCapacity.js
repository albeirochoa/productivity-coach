import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

/**
 * useCapacity Hook
 * Manages capacity status, config, and auto-redistribution
 */
const useCapacity = () => {
  const [capacityStatus, setCapacityStatus] = useState(null);
  const [capacityConfig, setCapacityConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch capacity status
  const fetchCapacityStatus = useCallback(async () => {
    try {
      const response = await api.getCapacityStatus();
      setCapacityStatus(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch capacity status:', err);
      setError(err.response?.data?.error || 'Failed to load capacity');
    }
  }, []);

  // Fetch capacity config
  const fetchCapacityConfig = useCallback(async () => {
    try {
      const response = await api.getCapacityConfig();
      setCapacityConfig(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch capacity config:', err);
      setError(err.response?.data?.error || 'Failed to load config');
    }
  }, []);

  // Update capacity config
  const updateConfig = useCallback(async (newConfig) => {
    try {
      const response = await api.updateCapacityConfig(newConfig);
      setCapacityConfig(response.data.config);
      await fetchCapacityStatus(); // Refresh status after config change
      return { success: true };
    } catch (err) {
      console.error('Failed to update capacity config:', err);
      setError(err.response?.data?.error || 'Failed to update config');
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchCapacityStatus]);

  // Auto-redistribute (preview mode)
  const previewRedistribute = useCallback(async () => {
    try {
      const response = await api.autoRedistribute(false);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Failed to preview redistribution:', err);
      return { success: false, error: err.response?.data?.error };
    }
  }, []);

  // Auto-redistribute (execute mode)
  const executeRedistribute = useCallback(async () => {
    try {
      const response = await api.autoRedistribute(true);
      await fetchCapacityStatus(); // Refresh status after redistribution
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Failed to execute redistribution:', err);
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchCapacityStatus]);

  // Initial load
  useEffect(() => {
    const loadCapacity = async () => {
      setLoading(true);
      await Promise.all([fetchCapacityStatus(), fetchCapacityConfig()]);
      setLoading(false);
    };
    loadCapacity();
  }, [fetchCapacityStatus, fetchCapacityConfig]);

  return {
    capacityStatus,
    capacityConfig,
    loading,
    error,
    fetchCapacityStatus,
    updateConfig,
    previewRedistribute,
    executeRedistribute,
  };
};

export default useCapacity;
