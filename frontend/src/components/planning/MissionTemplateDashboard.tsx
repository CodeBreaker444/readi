'use client';
import React, { useState } from 'react';
import MissionTemplateFilters from './MissionTemplateFilter';
import MissionTemplateTable from './MissionTemplateTable';

const dummyData = {
    clients: [
        { id: 1, name: 'Acme Corporation' },
        { id: 2, name: 'Tech Solutions Inc.' },
        { id: 3, name: 'Global Logistics Ltd.' }
    ],
    pilots: [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' },
        { id: 3, name: 'Bob Johnson' }
    ],
    evaluations: [
        { id: 1, name: 'EVAL-2026-0001' },
        { id: 2, name: 'EVAL-2026-0002' },
        { id: 3, name: 'EVAL-2026-0003' }
    ],
    plannings: [
        { id: 1, name: 'PLAN-2026-0001' },
        { id: 2, name: 'PLAN-2026-0002' },
        { id: 3, name: 'PLAN-2026-0003' }
    ],
    templates: [
        {
            id: 1,
            template_code: 'TMP-2026-0001',
            client_name: 'Acme Corporation',
            pilot_name: 'John Doe',
            evaluation_code: 'EVAL-2026-0001',
            planning_code: 'PLAN-2026-0001',
            mission_type: 'Survey',
            last_update: '2026-01-20',
            status: 'Active'
        },
        {
            id: 2,
            template_code: 'TMP-2026-0002',
            client_name: 'Tech Solutions Inc.',
            pilot_name: 'Jane Smith',
            evaluation_code: 'EVAL-2026-0002',
            planning_code: 'PLAN-2026-0002',
            mission_type: 'Mapping',
            last_update: '2026-01-21',
            status: 'Active'
        },
        {
            id: 3,
            template_code: 'TMP-2026-0003',
            client_name: 'Global Logistics Ltd.',
            pilot_name: 'Bob Johnson',
            evaluation_code: 'EVAL-2026-0003',
            planning_code: 'PLAN-2026-0003',
            mission_type: 'Inspection',
            last_update: '2026-01-22',
            status: 'Draft'
        }
    ]
};

interface MissionTemplateDashboardProps {
    isDark?: boolean;
}

const MissionTemplateDashboard: React.FC<MissionTemplateDashboardProps> = ({ isDark = false }) => {
    const [filters, setFilters] = useState({
        clientId: 0,
        pilotId: 0,
        evaluationId: 0,
        planningId: 0,
        dateStart: '',
        dateEnd: ''
    });
    const [templates, setTemplates] = useState(dummyData.templates);

    const handleFilterChange = (type: string, value: number | string) => {
        setFilters(prev => ({ ...prev, [type]: value }));
    };

    const handleSearch = () => {
        // Filter logic here
        let filtered = dummyData.templates;

        if (filters.clientId > 0) {
            filtered = filtered.filter(t => t.id === filters.clientId);
        }
        if (filters.pilotId > 0) {
            filtered = filtered.filter(t => t.id === filters.pilotId);
        }

        setTemplates(filtered);
    };

    return (
        <div className={`p-6 ${isDark ? 'bg-slate-900' : 'bg-gray-50'} min-h-screen`}>
            <MissionTemplateFilters
                clients={dummyData.clients}
                pilots={dummyData.pilots}
                evaluations={dummyData.evaluations}
                plannings={dummyData.plannings}
                onClientChange={(id) => handleFilterChange('clientId', id)}
                onPilotChange={(id) => handleFilterChange('pilotId', id)}
                onEvaluationChange={(id) => handleFilterChange('evaluationId', id)}
                onPlanningChange={(id) => handleFilterChange('planningId', id)}
                onDateRangeChange={(start, end) => {
                    handleFilterChange('dateStart', start);
                    handleFilterChange('dateEnd', end);
                }}
                onSearch={handleSearch}
                isDark={isDark}
            />
            <MissionTemplateTable data={templates} isDark={isDark} />
        </div>
    );
};

export default MissionTemplateDashboard;