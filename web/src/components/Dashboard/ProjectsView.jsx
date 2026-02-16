import { useState } from 'react';
import { Rocket, Scissors } from 'lucide-react';
import ProjectCard from '../shared/ProjectCard';
import AreaFilter from '../shared/AreaFilter';

const ProjectsView = ({ projectTree, projects, onUnparent, onOpenWizard, onRefresh }) => {
  const [areaFilter, setAreaFilter] = useState(null);

  if (projects.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-20">
          <Rocket size={64} className="mx-auto mb-4 text-gray-600 opacity-20" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">No tienes proyectos</h3>
          <p className="text-gray-500 mb-6">Crea tu primer proyecto para dividir tareas grandes</p>
          <button
            onClick={onOpenWizard}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl font-medium transition-all inline-flex items-center gap-2"
          >
            <Scissors size={18} /> Crear Proyecto
          </button>
        </div>
      </div>
    );
  }

  const filteredTree = areaFilter
    ? projectTree.filter(p => p.category === areaFilter)
    : projectTree;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <AreaFilter selectedArea={areaFilter} onSelectArea={setAreaFilter} />

      {filteredTree.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          depth={0}
          onUnparent={onUnparent}
          onRefresh={onRefresh}
        />
      ))}

      {filteredTree.length === 0 && areaFilter && (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-gray-400">No hay proyectos en esta área</p>
        </div>
      )}
    </div>
  );
};

export default ProjectsView;
