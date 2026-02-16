import axios from 'axios';

const resolveApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }

  return 'http://127.0.0.1:3000/api';
};

const API_URL = resolveApiUrl();

const normalizeCapacityStatus = (data) => {
  const overload = data.overload || data.status || {};
  const usable = data.capacity?.usable;
  const normalizedUsable = typeof usable === 'number'
    ? {
        minutes: usable,
        formatted: data.capacity?.usableFormatted || `${usable} min`,
      }
    : usable;

  return {
    ...data,
    overload,
    capacity: {
      ...(data.capacity || {}),
      usable: normalizedUsable,
    },
  };
};

const getCapacityStatus = async () => {
  try {
    const response = await axios.get(`${API_URL}/capacity/week`);
    return {
      ...response,
      data: normalizeCapacityStatus(response.data),
    };
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error;
    }

    const fallback = await axios.get(`${API_URL}/capacity/status`);
    return {
      ...fallback,
      data: normalizeCapacityStatus(fallback.data),
    };
  }
};

export const api = {
  // Data fetching
  getTasks: () => axios.get(`${API_URL}/tasks`),
  getInbox: () => axios.get(`${API_URL}/inbox`),
  getStats: () => axios.get(`${API_URL}/stats`),
  getProfile: () => axios.get(`${API_URL}/profile`),

  // Tasks
  toggleTask: (id) => axios.patch(`${API_URL}/tasks/${id}/toggle`),
  updateTask: (id, data) => axios.patch(`${API_URL}/tasks/${id}`, data),
  createTask: (data) => axios.post(`${API_URL}/tasks`, data),
  toggleMilestone: (projectId, milestoneId, data) =>
    axios.patch(`${API_URL}/tasks/${projectId}/milestones/${milestoneId}`, data),
  commitMilestone: (projectId, milestoneId, force = false) =>
    axios.post(`${API_URL}/tasks/${projectId}/commit-milestone`, { milestoneId, force }),

  // Capacity
  getCapacityStatus,
  getCapacityConfig: () => axios.get(`${API_URL}/capacity/config`),
  updateCapacityConfig: (data) => axios.patch(`${API_URL}/capacity/config`, data),
  validateCommitment: (projectId, milestoneId) =>
    axios.post(`${API_URL}/capacity/validate`, { projectId, milestoneId }),
  autoRedistribute: (execute = false) =>
    axios.post(`${API_URL}/capacity/auto-redistribute`, { execute }),

  // Inbox
  captureInbox: (data) => axios.post(`${API_URL}/inbox`, data),
  deleteInboxItem: (type, id) => axios.delete(`${API_URL}/inbox/${type}/${id}`),
  editInboxItem: (type, id, data) => axios.patch(`${API_URL}/inbox/${type}/${id}`, data),
  processInboxItem: (type, id, data) => axios.post(`${API_URL}/inbox/${type}/${id}/process`, data),

  // Projects & Templates
  analyzeProject: (data) => axios.post(`${API_URL}/projects/analyze`, data),
  getTemplates: () => axios.get(`${API_URL}/tasks/templates`),
  deleteTemplate: (id) => axios.delete(`${API_URL}/tasks/templates/${id}`),
  updateTemplate: (id, data) => axios.patch(`${API_URL}/tasks/templates/${id}`, data),
  createProject: (data) => axios.post(`${API_URL}/projects`, data),
  moveProject: (id, data) => axios.patch(`${API_URL}/projects/${id}/move`, data),
  addMilestone: (projectId, data) => axios.post(`${API_URL}/projects/${projectId}/milestones`, data),
  updateMilestone: (projectId, milestoneId, data) =>
    axios.patch(`${API_URL}/projects/${projectId}/milestones/${milestoneId}`, data),
  setNextMilestone: (projectId, milestoneId) =>
    axios.post(`${API_URL}/projects/${projectId}/set-next-milestone`, { milestoneId }),
  addSection: (projectId, data) => axios.post(`${API_URL}/projects/${projectId}/sections`, data),
  deleteSection: (projectId, sectionId) =>
    axios.delete(`${API_URL}/projects/${projectId}/sections/${sectionId}`),
  archiveProject: (id) => axios.patch(`${API_URL}/tasks/${id}`, { status: 'archived' }),
  deleteProject: (id) => axios.delete(`${API_URL}/tasks/${id}`),

  // Calendar / Time Blocking
  getCalendarBlocks: (filters) => axios.get(`${API_URL}/calendar/blocks`, { params: filters }),
  getCalendarDay: (date) => axios.get(`${API_URL}/calendar/day/${date}`),
  createCalendarBlock: (data) => axios.post(`${API_URL}/calendar/blocks`, data),
  updateCalendarBlock: (id, data) => axios.patch(`${API_URL}/calendar/blocks/${id}`, data),
  deleteCalendarBlock: (id) => axios.delete(`${API_URL}/calendar/blocks/${id}`),

  // Chat
  sendMessage: (message) => axios.post(`${API_URL}/chat`, { message }),

  // Life Areas
  getAreas: () => axios.get(`${API_URL}/areas`),
  getArea: (areaId) => axios.get(`${API_URL}/areas/${areaId}`),
  createArea: (data) => axios.post(`${API_URL}/areas`, data),
  updateArea: (areaId, data) => axios.patch(`${API_URL}/areas/${areaId}`, data),
  archiveArea: (areaId) => axios.delete(`${API_URL}/areas/${areaId}`),
  getAreaStats: (areaId) => axios.get(`${API_URL}/areas/${areaId}/stats`),

  // Objectives / Key Results (Fase 7)
  getObjectives: (params) => axios.get(`${API_URL}/objectives`, { params }),
  getObjectiveRiskSignals: () => axios.get(`${API_URL}/objectives/risk-signals`),
  getObjective: (objectiveId) => axios.get(`${API_URL}/objectives/${objectiveId}`),
  createObjective: (data) => axios.post(`${API_URL}/objectives`, data),
  updateObjective: (objectiveId, data) => axios.patch(`${API_URL}/objectives/${objectiveId}`, data),
  deleteObjective: (objectiveId) => axios.delete(`${API_URL}/objectives/${objectiveId}`),

  getKeyResults: (params) => axios.get(`${API_URL}/key-results`, { params }),
  createKeyResult: (data) => axios.post(`${API_URL}/key-results`, data),
  updateKeyResult: (keyResultId, data) => axios.patch(`${API_URL}/key-results/${keyResultId}`, data),
  updateKeyResultProgress: (keyResultId, currentValue) =>
    axios.patch(`${API_URL}/key-results/${keyResultId}/progress`, { currentValue }),
  deleteKeyResult: (keyResultId) => axios.delete(`${API_URL}/key-results/${keyResultId}`),

  // Coach (Fase 8)
  getCoachRecommendations: () => axios.get(`${API_URL}/coach/recommendations`),
  applyCoachRecommendation: (data) => axios.post(`${API_URL}/coach/apply`, data),
  rejectCoachRecommendation: (data) => axios.post(`${API_URL}/coach/reject`, data),
  getCoachHistory: (params) => axios.get(`${API_URL}/coach/history`, { params }),

  // Coach Chat (Fase 9)
  sendCoachChatMessage: (data) => axios.post(`${API_URL}/coach/chat/message`, data),
  confirmCoachChatAction: (data) => axios.post(`${API_URL}/coach/chat/confirm`, data),
  getCoachChatHistory: (params) => axios.get(`${API_URL}/coach/chat/history`, { params }),

  // Coach LLM Agent (Fase 9.1)
  getCoachProactive: () => axios.get(`${API_URL}/coach/chat/proactive`),
  getCoachStyle: () => axios.get(`${API_URL}/coach/chat/style`),
  updateCoachStyle: (data) => axios.post(`${API_URL}/coach/chat/style`, data),

  // Coach Intervention (Fase 10.2)
  getCoachDiagnosis: () => axios.get(`${API_URL}/coach/diagnosis`),
  getCoachCheckin: () => axios.get(`${API_URL}/coach/checkin`),
  sendCoachCheckinResponse: (data) => axios.post(`${API_URL}/coach/checkin/response`, data),
  getCoachPatterns: () => axios.get(`${API_URL}/coach/patterns`),
  analyzeCoachPatterns: () => axios.post(`${API_URL}/coach/patterns/analyze`),
};
