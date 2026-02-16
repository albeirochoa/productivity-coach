import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Layers, Filter } from 'lucide-react';
import useAreas from '../../hooks/useAreas';
import AreaCard from '../shared/AreaCard';
import EditAreaModal from '../shared/EditAreaModal';

const AreasView = ({ onNavigateToTasks }) => {
  const {
    areas,
    activeAreas,
    pausedAreas,
    archivedAreas,
    loading,
    error,
    fetchAreas,
    createArea,
    updateArea,
    archiveArea,
  } = useAreas();

  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all | active | paused | archived

  // Fetch areas on mount
  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const handleCreateArea = () => {
    setEditingArea(null);
    setShowModal(true);
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setShowModal(true);
  };

  const handleSaveArea = async (areaData) => {
    if (editingArea) {
      const result = await updateArea(editingArea.id, areaData);
      if (result.success) {
        setShowModal(false);
        setEditingArea(null);
      } else {
        throw new Error(result.error);
      }
    } else {
      const result = await createArea(areaData);
      if (result.success) {
        setShowModal(false);
      } else {
        throw new Error(result.error);
      }
    }
  };

  const handleArchiveArea = async (areaId) => {
    await archiveArea(areaId);
  };

  const handleViewTasks = (areaId) => {
    // Navigate to thisweek view filtered by category
    if (onNavigateToTasks) {
      onNavigateToTasks('thisweek', areaId);
    }
  };

  // Filter areas based on selected status
  const filteredAreas =
    filterStatus === 'active' ? activeAreas :
    filterStatus === 'paused' ? pausedAreas :
    filterStatus === 'archived' ? archivedAreas :
    areas;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Layers size={32} className="text-cyan-400" />
            <h2 className="text-3xl font-bold">Áreas de Vida</h2>
          </div>
          <p className="text-gray-400">
            Organiza tu vida en áreas estratégicas y vincula tus tareas a cada una
          </p>
        </div>

        <button
          onClick={handleCreateArea}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl font-medium transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva área
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'all'
              ? 'bg-cyan-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Todas ({areas.length})
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'active'
              ? 'bg-cyan-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Activas ({activeAreas.length})
        </button>
        <button
          onClick={() => setFilterStatus('paused')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'paused'
              ? 'bg-cyan-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Pausadas ({pausedAreas.length})
        </button>
        <button
          onClick={() => setFilterStatus('archived')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'archived'
              ? 'bg-cyan-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Archivadas ({archivedAreas.length})
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"
          />
          <p className="text-gray-400 mt-4">Cargando áreas...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          Error al cargar áreas: {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAreas.length === 0 && (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
          <Layers size={64} className="mx-auto mb-4 text-cyan-400 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No hay áreas {filterStatus !== 'all' && filterStatus}</h3>
          <p className="text-gray-400 mb-6">
            {filterStatus === 'all'
              ? 'Crea tu primera área de vida para organizar mejor tus proyectos y tareas'
              : `No tienes áreas ${filterStatus} en este momento`}
          </p>
          {filterStatus === 'all' && (
            <button
              onClick={handleCreateArea}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-xl font-medium transition-all inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Crear primera área
            </button>
          )}
        </div>
      )}

      {/* Areas Grid */}
      {!loading && filteredAreas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAreas.map((area, idx) => (
            <motion.div
              key={area.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <AreaCard
                area={area}
                onEdit={handleEditArea}
                onArchive={handleArchiveArea}
                onViewTasks={handleViewTasks}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <EditAreaModal
        show={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingArea(null);
        }}
        onSave={handleSaveArea}
        area={editingArea}
      />
    </div>
  );
};

export default AreasView;
