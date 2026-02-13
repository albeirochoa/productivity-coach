import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, X } from 'lucide-react';
import { api } from '../../utils/api';
import WizardStep1 from './WizardStep1';
import WizardStep2 from './WizardStep2';
import WizardStep3 from './WizardStep3';

const INITIAL_FORM = {
  title: '',
  description: '',
  category: 'trabajo',
  strategy: 'goteo',
  templateId: '',
};

const ProjectWizard = ({ show, onClose, onRefresh, initialForm }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMilestones, setGeneratedMilestones] = useState([]);
  const [projectForm, setProjectForm] = useState(initialForm || INITIAL_FORM);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [wasManuallyCreated, setWasManuallyCreated] = useState(false);

  const handleClose = () => {
    setStep(1);
    setGeneratedMilestones([]);
    setProjectForm(INITIAL_FORM);
    onClose();
  };

  const handleGenerateSteps = async (useAI = false) => {
    if (!projectForm.title.trim()) {
      alert('Primero escribe el titulo del proyecto');
      return;
    }

    // Caso 1: Sin plantilla (crear desde 0)
    if (!projectForm.templateId && !useAI) {
      setWasManuallyCreated(true);
      setGeneratedMilestones([]);
      setStep(2);
      return;
    }

    // Caso 2: Con plantilla o con IA
    setIsGenerating(true);
    try {
      const response = await api.analyzeProject({
        title: projectForm.title,
        description: projectForm.description,
        category: projectForm.category,
        strategy: projectForm.strategy,
        templateId: projectForm.templateId || undefined,
        useAI,
        apiProvider: useAI ? 'openai' : undefined,
      });

      setGeneratedMilestones(response.data.generated_milestones || []);
      setWasManuallyCreated(false);
      if (response.data.generated_milestones?.length > 0) {
        setStep(2);
      } else {
        alert('No se pudieron generar pasos.');
      }
    } catch (error) {
      alert('Error generando pasos: ' + (error.response?.data?.error || error.message));
    }
    setIsGenerating(false);
  };

  const handleUseTemplate = () => {
    if (!projectForm.templateId) {
      alert('Primero selecciona una plantilla');
      return;
    }
    handleGenerateSteps(false);
  };

  const handleCreateProject = async (saveAsTemplate = false, templateName = '') => {
    if (generatedMilestones.length === 0) {
      alert('Genera los pasos primero');
      return;
    }

    try {
      await api.createProject({
        title: projectForm.title,
        description: projectForm.description,
        category: projectForm.category,
        strategy: projectForm.strategy,
        milestones: generatedMilestones.map(m => ({
          title: m.title,
          description: m.description || '',
          time_estimate: m.time_estimate || 45,
        })),
        saveAsTemplate,
        templateName: templateName || projectForm.title,
      });

      handleClose();
      onRefresh();
      alert(saveAsTemplate ? 'Proyecto creado y plantilla guardada!' : 'Proyecto creado!');
    } catch (error) {
      alert('Error al crear proyecto');
    }
  };

  const handleDeleteMilestone = (idx) => {
    if (generatedMilestones.length <= 1) return;
    setGeneratedMilestones(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddMilestone = () => {
    setGeneratedMilestones(prev => [...prev, { title: 'Nuevo paso', description: '', time_estimate: 45 }]);
  };

  const handleReorderMilestone = (fromIdx, direction) => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= generatedMilestones.length) return;
    const newMilestones = [...generatedMilestones];
    const [item] = newMilestones.splice(fromIdx, 1);
    newMilestones.splice(toIdx, 0, item);
    setGeneratedMilestones(newMilestones);
  };

  const handleUpdateMilestone = (idx, field, value) => {
    const newMilestones = [...generatedMilestones];
    newMilestones[idx][field] = value;
    setGeneratedMilestones(newMilestones);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass p-6 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Scissors className="w-6 h-6 text-purple-400" />
                Trozar Proyecto
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Paso {step} de 3
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {[1, 2, 3].map(s => (
                  <div
                    key={s}
                    className={`w-3 h-3 rounded-full transition-all ${
                      s === step
                        ? 'bg-purple-500 scale-125'
                        : s < step
                        ? 'bg-green-500'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <button onClick={handleClose} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {step === 1 && (
            <WizardStep1
              projectForm={projectForm}
              setProjectForm={setProjectForm}
              isGenerating={isGenerating}
              onGenerateSteps={handleGenerateSteps}
              onUseTemplate={handleUseTemplate}
            />
          )}

          {step === 2 && (
            <WizardStep2
              generatedMilestones={generatedMilestones}
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onAddMilestone={handleAddMilestone}
              onReorderMilestone={handleReorderMilestone}
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <WizardStep3
              projectForm={projectForm}
              generatedMilestones={generatedMilestones}
              wasManuallyCreated={wasManuallyCreated}
              onBack={() => setStep(2)}
              onCreate={handleCreateProject}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectWizard;
