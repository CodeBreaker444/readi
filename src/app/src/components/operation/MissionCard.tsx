'use client';
import React from 'react';

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

interface MissionCardProps {
  mission: Mission;
  isDark?: boolean;
}

const MissionCard: React.FC<MissionCardProps> = ({ mission, isDark = false }) => {
  return (
    <div
      className={`p-4 mb-3 rounded-lg shadow-sm cursor-move ${
        isDark ? 'bg-slate-700 border border-slate-600' : 'bg-white border border-gray-200'
      }`}
      data-id={mission.id}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className={`font-semibold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {mission.mission_code}
        </h4>
        <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-600 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
          {mission.status}
        </span>
      </div>
      <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Client: {mission.client_name}
      </p>
      <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        PiC: {mission.pilot_name}
      </p>
      <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Date: {mission.mission_date}
      </p>
      <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Type: {mission.mission_type}
      </p>
      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Drone: {mission.drone_system}
      </p>
      <div id={`${mission.id}_fk_vehicle_id`} className="hidden">
        {mission.drone_system}
      </div>
    </div>
  );
};

export default MissionCard;