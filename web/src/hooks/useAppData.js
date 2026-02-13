import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const useAppData = () => {
  const [tasks, setTasks] = useState([]);
  const [inbox, setInbox] = useState({ work: [], personal: [] });
  const [stats, setStats] = useState({});
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, inboxRes, statsRes, profRes] = await Promise.all([
        api.getTasks(),
        api.getInbox(),
        api.getStats(),
        api.getProfile(),
      ]);
      setTasks(tasksRes.data || []);
      setInbox(inboxRes.data || { work: [], personal: [] });
      setStats(statsRes.data || {});
      setProfile(profRes.data || {});
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Datos derivados
  const thisWeekTasks = tasks.filter(t => t.thisWeek && t.status !== 'done');
  const completedThisWeek = tasks.filter(t => t.thisWeek && t.status === 'done');
  const somedayTasks = tasks.filter(t => !t.thisWeek && t.status === 'active');
  const projects = tasks.filter(t => t.type === 'project' && t.status !== 'archived');
  const inboxCount = (inbox.work?.length || 0) + (inbox.personal?.length || 0);

  // Construir arbol de proyectos
  const buildProjectTree = (projects) => {
    const projectMap = {};
    const rootProjects = [];

    projects.forEach(p => {
      projectMap[p.id] = { ...p, children: [] };
    });

    projects.forEach(p => {
      if (p.parentId && projectMap[p.parentId]) {
        projectMap[p.parentId].children.push(projectMap[p.id]);
      } else {
        rootProjects.push(projectMap[p.id]);
      }
    });

    return rootProjects;
  };

  const projectTree = buildProjectTree(projects);

  return {
    tasks,
    inbox,
    stats,
    profile,
    loading,
    thisWeekTasks,
    completedThisWeek,
    somedayTasks,
    projects,
    projectTree,
    inboxCount,
    fetchData,
  };
};

export default useAppData;
