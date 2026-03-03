import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';

/**
 * Hook to load all Key Results and build a lookup map (krId → kr).
 * Used by daily views (ThisWeekView, TodayView) for KR badges.
 */
const useKrLookup = () => {
  const [keyResults, setKeyResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAllKrs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getKeyResults();
      setKeyResults(Array.isArray(res.data) ? res.data : []);
    } catch {
      setKeyResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllKrs();
  }, [fetchAllKrs]);

  const krMap = useMemo(() => {
    const map = {};
    for (const kr of keyResults) {
      const range = (kr.targetValue || 0) - (kr.startValue || 0);
      const progress = range > 0
        ? Math.round(((kr.currentValue || 0) - (kr.startValue || 0)) / range * 100)
        : kr.currentValue >= kr.targetValue ? 100 : 0;
      map[kr.id] = { ...kr, progress: Math.max(0, Math.min(100, progress)) };
    }
    return map;
  }, [keyResults]);

  return { krMap, loading, refresh: fetchAllKrs };
};

export default useKrLookup;
