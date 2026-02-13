import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, Plus, X, ChevronRight, Hash, Clock, Calendar, Archive, Trash2, Edit2
} from 'lucide-react';
import AddMilestoneForm from '../projects/AddMilestoneForm';
import useProjectCardActions from '../../hooks/useProjectCardActions';
import { api } from '../../utils/api';
import EditProjectModal from './EditProjectModal';
import EditMilestoneModal from './EditMilestoneModal';

const ProjectCard = ({ project, depth = 0, onUnparent, onRefresh }) => {
  const completedMilestones = project.milestones?.filter(m => m.completed).length || 0;
  const totalMilestones = project.milestones?.length || 1;
  const progress = (completedMilestones / totalMilestones) * 100;
  const hasChildren = project.children && project.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [addingToSection, setAddingToSection] = useState(null); // sectionId o null
  const [editingProject, setEditingProject] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const {
    addMilestone,
    addSection,
    deleteSection,
    toggleMilestone,
    commitMilestoneToWeek,
    archiveProject,
    deleteProject,
    saveProject,
    saveMilestone,
  } = useProjectCardActions({
    projectId: project.id,
    projectTitle: project.title,
    onRefresh,
  });

  const sections = project.sections || [];
  const milestonesWithoutSection = project.milestones?.filter(m => !m.sectionId) || [];
  const milestonesBySection = {};
  sections.forEach(section => {
    milestonesBySection[section.id] = project.milestones?.filter(m => m.sectionId === section.id) || [];
  });

  const handleAddMilestone = async ({ title, timeEstimate }, sectionId = null) => {
    try {
      await addMilestone({ title, timeEstimate }, sectionId);
      setShowAddMilestone(false);
      setAddingToSection(null);
    } catch (error) {
      alert('Error al agregar tarea');
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      await addSection(newSectionName);
      setNewSectionName('');
      setShowSectionForm(false);
    } catch (error) {
      alert('Error al crear seccion');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Eliminar esta seccion? Los milestones quedaran sin seccion.')) return;
    try {
      await deleteSection(sectionId);
    } catch (error) {
      alert('Error al eliminar seccion');
    }
  };

  const handleToggleMilestone = async (milestoneId, completed) => {
    try {
      await toggleMilestone(milestoneId, completed);
    } catch (error) {
      console.error('Error toggling milestone:', error);
    }
  };

  const handleCommitMilestoneToWeek = async (milestoneId) => {
    try {
      await commitMilestoneToWeek(milestoneId);
    } catch (error) {
      // Check if it's a capacity error (HTTP 409)
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        const message = `${errorData.message}\n\n¿Quieres comprometer de todas formas?`;
        const force = confirm(message);
        if (force) {
          try {
            await api.commitMilestone(project.id, milestoneId, true);
            onRefresh();
          } catch (forceError) {
            alert('Error al comprometer milestone: ' + forceError.message);
          }
        }
      } else {
        console.error('Error committing milestone:', error);
        alert('Error al comprometer milestone');
      }
    }
  };

  const handleArchiveProject = async () => {
    if (!confirm(`¿Archivar "${project.title}"? Puedes restaurarlo después.`)) return;
    try {
      await api.archiveProject(project.id);
      onRefresh();
    } catch (error) {
      alert('Error al archivar proyecto');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`¿ELIMINAR "${project.title}"? Esta acción NO se puede deshacer.`)) return;
    try {
      await api.deleteProject(project.id);
      onRefresh();
    } catch (error) {
      alert('Error al eliminar proyecto');
    }
  };

  const handleSaveProject = async (projectId, updates) => {
    try {
      await api.updateTask(projectId, updates);
      onRefresh();
    } catch (error) {
      alert('Error al actualizar proyecto');
    }
  };

  const handleSaveMilestone = async (projectId, milestoneId, updates) => {
    try {
      await api.updateMilestone(projectId, milestoneId, updates);
      onRefresh();
    } catch (error) {
      alert('Error al actualizar tarea');
    }
  };

  const committedMilestones = Array.isArray(project.committedMilestones)
    ? project.committedMilestones
    : project.committedMilestone ? [project.committedMilestone] : [];

  const renderMilestone = (milestone, mIdx) => {
    const isCommitted = committedMilestones.includes(milestone.id);

    return (
      <div
        key={milestone.id}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group/milestone ${
          milestone.completed
            ? 'opacity-50'
            : isCommitted
            ? 'bg-green-500/10 border border-green-500/30'
            : mIdx === project.currentMilestone
            ? 'bg-purple-500/10 border border-purple-500/30'
            : 'hover:bg-white/5'
        }`}
      >
        <button
          onClick={() => handleToggleMilestone(milestone.id, milestone.completed)}
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
            milestone.completed ? 'bg-green-500 border-green-500' : 'border-purple-500'
          }`}
        >
          {milestone.completed && <CheckCircle size={10} className="text-white" />}
        </button>
        <span className={`flex-1 text-sm ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
          {milestone.title}
        </span>
        {milestone.timeEstimate && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={10} /> {milestone.timeEstimate}m
          </span>
        )}
        {/* Boton editar tarea */}
        <button
          onClick={() => setEditingMilestone(milestone)}
          className="opacity-0 group-hover/milestone:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
          title="Editar tarea"
        >
          <Edit2 size={12} className="text-gray-400" />
        </button>
        {/* Boton esta semana */}
        {!milestone.completed && (
          <button
            onClick={() => handleCommitMilestoneToWeek(milestone.id)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all ${
              isCommitted
                ? 'bg-green-500/20 text-green-300 hover:bg-red-500/20 hover:text-red-300'
                : 'opacity-0 group-hover/milestone:opacity-100 bg-white/5 text-gray-400 hover:bg-green-500/20 hover:text-green-300'
            }`}
            title={isCommitted ? 'Quitar de esta semana' : 'Agregar a esta semana'}
          >
            <Calendar size={10} />
            {isCommitted ? 'Esta semana' : 'Semana'}
          </button>
        )}
        {mIdx === project.currentMilestone && !milestone.completed && !isCommitted && (
          <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">
            Proximo
          </span>
        )}
      </div>
    );
  };

  // Boton para agregar tarea (reutilizable)
  const renderAddButton = (sectionId = null) => {
    const isAdding = sectionId ? addingToSection === sectionId : showAddMilestone;

    if (isAdding) {
      return (
        <AddMilestoneForm
          onAdd={(data) => handleAddMilestone(data, sectionId)}
          onCancel={() => {
            setShowAddMilestone(false);
            setAddingToSection(null);
          }}
        />
      );
    }

    return (
      <button
        onClick={() => {
          if (sectionId) {
            setAddingToSection(sectionId);
            setShowAddMilestone(false);
          } else {
            setShowAddMilestone(true);
            setAddingToSection(null);
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-purple-400 hover:bg-white/5 transition-all"
      >
        <Plus size={12} /> Agregar tarea
      </button>
    );
  };

  return (
    <div style={{ marginLeft: `${depth * 24}px` }}>
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all mb-4 group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {hasChildren && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              )}
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <h3 className="text-lg font-semibold flex-1">{project.title}</h3>

              {/* Action buttons */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingProject(true)}
                  className="p-2 hover:bg-cyan-500/20 rounded transition-colors text-cyan-400"
                  title="Editar proyecto"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={handleArchiveProject}
                  className="p-2 hover:bg-orange-500/20 rounded transition-colors text-orange-400"
                  title="Archivar proyecto"
                >
                  <Archive size={16} />
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="p-2 hover:bg-red-500/20 rounded transition-colors text-red-400"
                  title="Eliminar proyecto"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {depth > 0 && (
                <button
                  onClick={() => onUnparent(project.id)}
                  className="ml-2 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Sacar de jerarquia"
                >
                  Mover a raiz
                </button>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-gray-400 mb-3">{project.description}</p>
            )}
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400">
                {project.category}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400">
                {project.strategy === 'goteo' ? 'Goteo' : 'Batching'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-momentum">{Math.round(progress)}%</span>
            <p className="text-xs text-gray-400">{completedMilestones}/{totalMilestones} pasos</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full"
          />
        </div>

        {/* Milestones */}
        <div className="space-y-4 mb-4">
          {/* Tareas sin seccion */}
          <div className="space-y-2">
            {milestonesWithoutSection.map((milestone, mIdx) => renderMilestone(milestone, mIdx))}
            {renderAddButton(null)}
          </div>

          {/* Secciones con sus tareas */}
          {sections.map(section => (
            <div key={section.id} className="border-l-2 border-purple-500/30 pl-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wide flex items-center gap-2">
                  <Hash size={12} />
                  {section.name}
                </h4>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {milestonesBySection[section.id]?.map((milestone) => renderMilestone(milestone))}
                {renderAddButton(section.id)}
              </div>
            </div>
          ))}

          {/* Agregar seccion */}
          {showSectionForm ? (
            <div className="flex gap-2 items-center px-3 py-2 bg-white/5 rounded-lg">
              <Hash size={14} className="text-purple-400" />
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Nombre de la seccion..."
                className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSection();
                  if (e.key === 'Escape') setShowSectionForm(false);
                }}
              />
              <button
                onClick={handleAddSection}
                className="px-3 py-1 bg-purple-500 hover:bg-purple-600 rounded text-xs font-medium transition-colors"
              >
                Anadir
              </button>
              <button
                onClick={() => setShowSectionForm(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSectionForm(true)}
              className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-white/10 text-xs text-gray-500 hover:border-purple-500/50 hover:text-purple-400 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Anadir seccion
            </button>
          )}
        </div>

        {/* Status */}
        {committedMilestones.length > 0 && (
          <div className="text-center text-sm text-green-400 flex items-center justify-center gap-2">
            <Calendar size={16} /> {committedMilestones.length} tarea{committedMilestones.length > 1 ? 's' : ''} esta semana
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-4">
          {project.children.map(child => (
            <ProjectCard
              key={child.id}
              project={child}
              depth={depth + 1}
              onUnparent={onUnparent}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {editingProject && (
        <EditProjectModal
          project={project}
          onClose={() => setEditingProject(false)}
          onSave={handleSaveProject}
        />
      )}

      {editingMilestone && (
        <EditMilestoneModal
          milestone={editingMilestone}
          projectId={project.id}
          onClose={() => setEditingMilestone(null)}
          onSave={handleSaveMilestone}
        />
      )}
    </div>
  );
};

export default ProjectCard;
