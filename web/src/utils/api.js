import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

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
  getCapacityStatus: () => axios.get(`${API_URL}/capacity/status`),
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
};
