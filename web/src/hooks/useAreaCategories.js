import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const COLOR_TO_TAILWIND = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-500',
};

const FALLBACK_CATEGORIES = [
  { id: 'trabajo', label: 'Trabajo', color: 'bg-blue-500' },
  { id: 'personal', label: 'Personal', color: 'bg-green-500' },
];

/**
 * Hook que carga las áreas activas y las convierte al formato de categorías.
 * Usado por EditTaskModal, EditProjectModal, EditInboxModal, WizardStep1.
 */
const useAreaCategories = () => {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.getAreas();
      const areas = response.data || [];
      const active = areas
        .filter(a => a.status === 'active')
        .map(a => ({
          id: a.id,
          label: a.name,
          color: COLOR_TO_TAILWIND[a.color] || 'bg-blue-500',
        }));

      if (active.length > 0) {
        setCategories(active);
      }
    } catch (err) {
      console.error('Error loading area categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading };
};

export default useAreaCategories;
