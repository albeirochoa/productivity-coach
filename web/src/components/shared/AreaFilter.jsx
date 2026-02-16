import useAreaCategories from '../../hooks/useAreaCategories';

const AreaFilter = ({ selectedArea, onSelectArea }) => {
  const { categories } = useAreaCategories();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onSelectArea(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          !selectedArea
            ? 'bg-white/15 text-white border border-white/20'
            : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
        }`}
      >
        Todas
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelectArea(selectedArea === cat.id ? null : cat.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            selectedArea === cat.id
              ? 'bg-white/15 text-white border border-white/20'
              : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${cat.color}`} />
          {cat.label}
        </button>
      ))}
    </div>
  );
};

export default AreaFilter;
