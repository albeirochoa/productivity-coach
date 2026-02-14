const MilestoneList = ({ milestones, renderMilestone, renderAddButton }) => {
  return (
    <div className="space-y-2">
      {milestones.map((milestone, mIdx) => renderMilestone(milestone, mIdx))}
      {renderAddButton(null)}
    </div>
  );
};

export default MilestoneList;
