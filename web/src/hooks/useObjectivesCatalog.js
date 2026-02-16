import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';

const useObjectivesCatalog = () => {
  const [objectives, setObjectives] = useState([]);
  const [loadingObjectives, setLoadingObjectives] = useState(false);
  const [objectivesError, setObjectivesError] = useState('');

  const [keyResults, setKeyResults] = useState([]);
  const [loadingKeyResults, setLoadingKeyResults] = useState(false);
  const [keyResultsError, setKeyResultsError] = useState('');

  const fetchObjectives = useCallback(async () => {
    setLoadingObjectives(true);
    setObjectivesError('');
    try {
      const response = await api.getObjectives();
      setObjectives(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setObjectives([]);
      setObjectivesError(error.response?.data?.error || error.message || 'No se pudo cargar objetivos');
    } finally {
      setLoadingObjectives(false);
    }
  }, []);

  const fetchKeyResults = useCallback(async (objectiveId) => {
    if (!objectiveId) {
      setKeyResults([]);
      setKeyResultsError('');
      return;
    }

    setLoadingKeyResults(true);
    setKeyResultsError('');
    try {
      const response = await api.getKeyResults({ objectiveId });
      setKeyResults(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setKeyResults([]);
      setKeyResultsError(error.response?.data?.error || error.message || 'No se pudo cargar key results');
    } finally {
      setLoadingKeyResults(false);
    }
  }, []);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  const objectiveOptions = useMemo(
    () => objectives.map((objective) => ({ id: objective.id, label: objective.title })),
    [objectives]
  );

  return {
    objectives,
    objectiveOptions,
    loadingObjectives,
    objectivesError,
    fetchObjectives,
    keyResults,
    loadingKeyResults,
    keyResultsError,
    fetchKeyResults,
  };
};

export default useObjectivesCatalog;

