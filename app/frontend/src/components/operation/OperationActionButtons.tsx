'use client';
import React from 'react';

interface OperationActionButtonsProps {
  onAddMission: () => void;
  onImportMission: () => void;
  onAddCommunication: () => void;
  isDark?: boolean;
}

const OperationActionButtons: React.FC<OperationActionButtonsProps> = ({
  onAddMission,
  onImportMission,
  onAddCommunication,
  isDark = false
}) => {
  return (
    <div className="flex justify-end gap-2 mb-6">
      <button
        onClick={onAddMission}
        className={`px-4 py-2 rounded-md text-sm font-medium ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
      >
        Add New Mission
      </button>
      <button
        onClick={onImportMission}
        className={`px-4 py-2 rounded-md text-sm font-medium ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
      >
        Import Mission
      </button>
      <button
        onClick={onAddCommunication}
        className={`px-4 py-2 rounded-md text-sm font-medium ${isDark ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
      >
        Add a General Communication
      </button>
    </div>
  );
};

export default OperationActionButtons;