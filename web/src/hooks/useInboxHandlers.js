import { useState, useCallback } from 'react';
import { api } from '../utils/api';

const useInboxHandlers = (fetchData) => {
  const [editingInboxItem, setEditingInboxItem] = useState(null);

  const deleteInboxItem = useCallback(async (id, type) => {
    if (!confirm('Borrar esta idea?')) return;
    try {
      await api.deleteInboxItem(type, id);
      fetchData();
    } catch (error) {
      alert('Error al borrar idea');
    }
  }, [fetchData]);

  const editInboxItem = useCallback((item, type) => {
    setEditingInboxItem({ id: item.id, text: item.text, type });
  }, []);

  const saveInboxEdit = useCallback(async () => {
    if (!editingInboxItem?.text.trim()) return;
    try {
      await api.editInboxItem(editingInboxItem.type, editingInboxItem.id, {
        text: editingInboxItem.text,
      });
      setEditingInboxItem(null);
      fetchData();
    } catch (error) {
      alert('Error al editar idea');
    }
  }, [editingInboxItem, fetchData]);

  const processInboxItem = useCallback(async (item, type, options) => {
    try {
      await api.processInboxItem(type, item.id, {
        taskType: options.taskType,
        thisWeek: options.thisWeek,
        category: options.category || (type === 'work' ? 'trabajo' : 'familia'),
      });
      fetchData();
    } catch (error) {
      alert('Error al procesar idea');
    }
  }, [fetchData]);

  return {
    editingInboxItem,
    setEditingInboxItem,
    deleteInboxItem,
    editInboxItem,
    saveInboxEdit,
    processInboxItem,
  };
};

export default useInboxHandlers;
