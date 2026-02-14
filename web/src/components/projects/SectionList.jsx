import { Hash, X } from 'lucide-react';

const SectionList = ({
  sections,
  milestonesBySection,
  renderMilestone,
  renderAddButton,
  onDeleteSection,
}) => {
  return (
    <>
      {sections.map((section) => (
        <div key={section.id} className="border-l-2 border-purple-500/30 pl-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wide flex items-center gap-2">
              <Hash size={12} />
              {section.name}
            </h4>
            <button
              onClick={() => onDeleteSection(section.id)}
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
    </>
  );
};

export default SectionList;
