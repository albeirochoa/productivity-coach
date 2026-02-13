import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const useCalendar = (initialDate = null) => {
  const [selectedDate, setSelectedDate] = useState(initialDate || getTodayString());
  const [dayData, setDayData] = useState(null);
  const [weekData, setWeekData] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  function getWeekDates(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const weekDates = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      weekDates.push({
        date: currentDate.toISOString().split('T')[0],
        name: dayNames[i],
      });
    }

    return weekDates;
  }

  function getMonthDates(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const firstMonday = new Date(firstDay);
    firstMonday.setDate(1 - (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1));

    // Generate 6 weeks (42 days) to fill calendar grid
    const monthDates = [];
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(firstMonday);
      currentDate.setDate(firstMonday.getDate() + i);
      monthDates.push({
        date: currentDate.toISOString().split('T')[0],
        isCurrentMonth: currentDate.getMonth() === month,
      });
    }

    return monthDates;
  }

  const fetchDayData = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCalendarDay(date);
      setDayData(response.data);
    } catch (err) {
      console.error('Error fetching calendar day:', err);
      setError(err.message);
      setDayData({ date, blocks: [], totalScheduledMinutes: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeekData = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const weekDates = getWeekDates(date);
      const weekPromises = weekDates.map((d) => api.getCalendarDay(d.date));
      const responses = await Promise.all(weekPromises);

      const days = responses.map((res) => res.data);
      const totalScheduledMinutes = days.reduce((sum, day) => sum + (day.totalScheduledMinutes || 0), 0);

      setWeekData({ days, totalScheduledMinutes });
    } catch (err) {
      console.error('Error fetching week data:', err);
      setError(err.message);
      setWeekData({ days: [], totalScheduledMinutes: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonthData = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const monthDates = getMonthDates(date);
      const uniqueDates = [...new Set(monthDates.map(d => d.date))];
      const monthPromises = uniqueDates.map((d) => api.getCalendarDay(d));
      const responses = await Promise.all(monthPromises);

      const days = responses.map((res) => res.data);
      const totalScheduledMinutes = days.reduce((sum, day) => sum + (day.totalScheduledMinutes || 0), 0);

      setMonthData({ days, totalScheduledMinutes });
    } catch (err) {
      console.error('Error fetching month data:', err);
      setError(err.message);
      setMonthData({ days: [], totalScheduledMinutes: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDayData(selectedDate);
      fetchWeekData(selectedDate);
      fetchMonthData(selectedDate);
    }
  }, [selectedDate, fetchDayData, fetchWeekData, fetchMonthData]);

  const createBlock = async (blockData) => {
    try {
      const response = await api.createCalendarBlock({
        ...blockData,
        date: selectedDate,
      });
      await fetchDayData(selectedDate);
      return { success: true, block: response.data };
    } catch (err) {
      console.error('Error creating block:', err);
      return {
        success: false,
        error: err.response?.data?.error || err.message,
        conflictBlock: err.response?.data?.conflictBlock,
      };
    }
  };

  const updateBlock = async (blockId, updates) => {
    try {
      await api.updateCalendarBlock(blockId, updates);
      await fetchDayData(selectedDate);
      return { success: true };
    } catch (err) {
      console.error('Error updating block:', err);
      return {
        success: false,
        error: err.response?.data?.error || err.message,
        conflictBlock: err.response?.data?.conflictBlock,
      };
    }
  };

  const deleteBlock = async (blockId) => {
    try {
      await api.deleteCalendarBlock(blockId);
      await fetchDayData(selectedDate);
      return { success: true };
    } catch (err) {
      console.error('Error deleting block:', err);
      return { success: false, error: err.message };
    }
  };

  const goToToday = () => {
    setSelectedDate(getTodayString());
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToPreviousWeek = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 7);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextWeek = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 7);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToPreviousMonth = () => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextMonth = () => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return {
    selectedDate,
    setSelectedDate,
    dayData,
    weekData,
    monthData,
    loading,
    error,
    createBlock,
    updateBlock,
    deleteBlock,
    refreshDay: () => fetchDayData(selectedDate),
    refreshWeek: () => fetchWeekData(selectedDate),
    refreshMonth: () => fetchMonthData(selectedDate),
    goToToday,
    goToPreviousDay,
    goToNextDay,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousMonth,
    goToNextMonth,
    getWeekDates,
    getMonthDates,
  };
};

export default useCalendar;
