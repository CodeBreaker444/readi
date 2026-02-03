'use client';
import React from 'react';

interface FilterOption {
    id: number;
    name: string;
}

interface MissionTemplateFiltersProps {
    clients: FilterOption[];
    pilots: FilterOption[];
    evaluations: FilterOption[];
    plannings: FilterOption[];
    onClientChange: (clientId: number) => void;
    onPilotChange: (pilotId: number) => void;
    onEvaluationChange: (evaluationId: number) => void;
    onPlanningChange: (planningId: number) => void;
    onDateRangeChange: (start: string, end: string) => void;
    onSearch: () => void;
    isDark?: boolean;
}

const MissionTemplateFilters: React.FC<MissionTemplateFiltersProps> = ({
    clients,
    pilots,
    evaluations,
    plannings,
    onClientChange,
    onPilotChange,
    onEvaluationChange,
    onPlanningChange,
    onDateRangeChange,
    onSearch,
    isDark = false
}) => {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 ${isDark ? 'text-gray-100' : ''}`}>
            {/* Column 1 */}
            <div className="space-y-4">
                <div>
                    <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Client <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{clients.length}</span>
                    </label>
                    <select
                        onChange={(e) => onClientChange(Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
                    >
                        <option value="0">Select</option>
                        {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                                {client.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        PiC <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{pilots.length}</span>
                    </label>
                    <select
                        onChange={(e) => onPilotChange(Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
                    >
                        <option value="0">Select</option>
                        {pilots.map((pilot) => (
                            <option key={pilot.id} value={pilot.id}>
                                {pilot.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
                <div>
                    <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Evaluation List <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{evaluations.length}</span>
                    </label>
                    <select
                        onChange={(e) => onEvaluationChange(Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
                    >
                        <option value="0">Select</option>
                        {evaluations.map((evaluation) => (
                            <option key={evaluation.id} value={evaluation.id}>
                                {evaluation.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Last Update
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            onChange={(e) => onDateRangeChange(e.target.value, '')}
                            className={`flex-1 px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
                        />
                        <span className="self-center">to</span>
                        <input
                            type="date"
                            onChange={(e) => onDateRangeChange('', e.target.value)}
                            className={`flex-1 px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
                        />
                    </div>
                </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
                <div>
                    <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Planning List <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{plannings.length}</span>
                    </label>
                    <select
                        onChange={(e) => onPlanningChange(Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
                    >
                        <option value="0">Select</option>
                        {plannings.map((planning) => (
                            <option key={planning.id} value={planning.id}>
                                {planning.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Filter Logbook
                    </label>
                    <button
                        onClick={onSearch}
                        className={`w-full px-4 py-2 rounded-md font-medium ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}
                    >
                        Search
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MissionTemplateFilters;