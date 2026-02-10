'use client';
import React, { useEffect, useState } from 'react';
import KanbanColumn from './KanbanColumn';

// Dummy data
const dummyData = {
  scheduled: [
    {
      id: 1,
      mission_code: 'MIS-2026-0001',
      client_name: 'Acme Corporation',
      pilot_name: 'John Doe',
      mission_date: '2026-01-25',
      mission_type: 'Survey',
      drone_system: 'DJI Phantom 4',
      status: 'Scheduled'
    },
    {
      id: 2,
      mission_code: 'MIS-2026-0002',
      client_name: 'Tech Solutions Inc.',
      pilot_name: 'Jane Smith',
      mission_date: '2026-01-26',
      mission_type: 'Mapping',
      drone_system: 'DJI Mavic 3',
      status: 'Scheduled'
    }
  ],
  inProgress: [
    {
      id: 3,
      mission_code: 'MIS-2026-0003',
      client_name: 'Global Logistics Ltd.',
      pilot_name: 'Bob Johnson',
      mission_date: '2026-01-24',
      mission_type: 'Inspection',
      drone_system: 'Custom Drone',
      status: 'In Progress'
    }
  ],
  done: [
    {
      id: 4,
      mission_code: 'MIS-2026-0004',
      client_name: 'Energy Systems Co.',
      pilot_name: 'Alice Brown',
      mission_date: '2026-01-23',
      mission_type: 'Survey',
      drone_system: 'DJI Phantom 4',
      status: 'Done'
    }
  ]
};

interface DailyBoardProps {
  isDark?: boolean;
}

const DailyBoard: React.FC<DailyBoardProps> = ({ isDark = false }) => {
  const [missions, setMissions] = useState(dummyData);

  useEffect(() => {
    // Initialize dragula for drag and drop
    if (typeof window !== 'undefined') {
      const loadDragula = async () => {
        const dragulaScript = document.createElement('script');
        dragulaScript.src = 'https://cdn.jsdelivr.net/npm/dragula@3.7.3/dist/dragula.min.js';
        dragulaScript.async = true;
        
        const dragulaCSS = document.createElement('link');
        dragulaCSS.rel = 'stylesheet';
        dragulaCSS.href = 'https://cdn.jsdelivr.net/npm/dragula@3.7.3/dist/dragula.min.css';
        document.head.appendChild(dragulaCSS);

        dragulaScript.onload = () => {
          const dragula = (window as any).dragula;
          if (dragula) {
            const drake = dragula([
              document.getElementById('mission-scheduled'),
              document.getElementById('mission-progress'),
              document.getElementById('mission-done')
            ]);

            drake.on('drop', (el: any, target: any, source: any) => {
              const missionId = el.getAttribute('data-id');
              const sourceId = source.id;
              const targetId = target.id;
              
              console.log(`Mission ${missionId} moved from ${sourceId} to ${targetId}`);
              // Handle mission status update here
            });
          }
        };

        document.body.appendChild(dragulaScript);
      };

      loadDragula();
    }
  }, []);

  return (
    <div className={`p-6 ${isDark ? 'bg-slate-900' : 'bg-gray-50'} min-h-screen`}>
      <div className="flex gap-4 overflow-x-auto">
        <KanbanColumn
          title="Scheduled"
          missions={missions.scheduled}
          count={missions.scheduled.length}
          borderColor="border-pink-500"
          columnId="mission-scheduled"
          isDark={isDark}
        />
        <KanbanColumn
          title="In Progress"
          missions={missions.inProgress}
          count={missions.inProgress.length}
          borderColor="border-yellow-500"
          columnId="mission-progress"
          isDark={isDark}
        />
        <KanbanColumn
          title="Done"
          missions={missions.done}
          count={missions.done.length}
          borderColor="border-blue-500"
          columnId="mission-done"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default DailyBoard;