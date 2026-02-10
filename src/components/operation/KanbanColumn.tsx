'use client';
import React from 'react';
import MissionCard from './MissionCard';

interface Mission {
  id: number;
  mission_code: string;
  client_name: string;
  pilot_name: string;
  mission_date: string;
  mission_type: string;
  drone_system: string;
  status: string;
}

interface KanbanColumnProps {
  title: string;
  missions: Mission[];
  count: number;
  borderColor: string;
  columnId: string;
  isDark?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  missions,
  count,
  borderColor,
  columnId,
  isDark = false
}) => {
  return (
    <div className="flex-1 min-w-0">
      <div className={`mb-3 pb-2 border-b-2 ${borderColor}`}>
        <h6 className={`font-semibold text-base mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {title}
        </h6>
        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <span id={`tot_${columnId}_mission`}>{count}</span> Missions
        </span>
      </div>
      <div id={columnId} className="pt-1 min-h-100">
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} isDark={isDark} />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;