'use client';

import { useTheme } from '@/components/useTheme';
import React, { useState } from 'react';

// Dummy data
const DUMMY_MAINTENANCE_DATA = [
    {
        id: 1,
        code: 'DJI-M300-001',
        serial_number: 'SN12345678',
        model: {
            factory_model: 'Matrice 300 RTK',
            maintenance_cycle_hour: 100,
            maintenance_cycle_flight: 500,
            maintenance_cycle_day: 180
        },
        last_maintenance: '2024-10-15',
        total_hours: 85,
        total_flights: 420,
        status: 'OK',
        trigger: ['FLIGHT', 'HOUR'],
        components: [
            {
                component_type: 'Battery Pack 1',
                serial_number: 'BAT-001',
                model: {
                    factory_type: 'TB60',
                    factory_model: 'Intelligent Battery',
                    maintenance_cycle_hour: 200,
                    maintenance_cycle_flight: 300,
                    maintenance_cycle_day: 365
                },
                last_maintenance: '2024-09-01',
                total_hours: 150,
                total_flights: 250,
                status: 'OK',
                trigger: ['FLIGHT']
            },
            {
                component_type: 'Gimbal Camera',
                serial_number: 'CAM-001',
                model: {
                    factory_type: 'Zenmuse H20T',
                    factory_model: 'Thermal Camera',
                    maintenance_cycle_hour: 150,
                    maintenance_cycle_flight: 400,
                    maintenance_cycle_day: 270
                },
                last_maintenance: '2024-08-20',
                total_hours: 140,
                total_flights: 380,
                status: 'ALERT',
                trigger: ['FLIGHT', 'DAY']
            }
        ]
    },
    {
        id: 2,
        code: 'DJI-M30T-002',
        serial_number: 'SN87654321',
        model: {
            factory_model: 'Matrice 30T',
            maintenance_cycle_hour: 120,
            maintenance_cycle_flight: 600,
            maintenance_cycle_day: 365
        },
        last_maintenance: '2023-12-10',
        total_hours: 125,
        total_flights: 590,
        status: 'DUE',
        trigger: ['HOUR', 'FLIGHT', 'DAY'],
        components: [
            {
                component_type: 'Battery Pack 1',
                serial_number: 'BAT-002',
                model: {
                    factory_type: 'TB30',
                    factory_model: 'Intelligent Battery',
                    maintenance_cycle_hour: 180,
                    maintenance_cycle_flight: 350,
                    maintenance_cycle_day: 365
                },
                last_maintenance: '2024-01-15',
                total_hours: 160,
                total_flights: 340,
                status: 'ALERT',
                trigger: ['FLIGHT', 'DAY']
            }
        ]
    },
    {
        id: 3,
        code: 'DJI-DOCK-001',
        serial_number: 'DOCK-001',
        model: {
            factory_model: 'DJI Dock',
            maintenance_cycle_hour: 0,
            maintenance_cycle_flight: 0,
            maintenance_cycle_day: 90
        },
        last_maintenance: '2024-12-01',
        total_hours: 0,
        total_flights: 0,
        status: 'OK',
        trigger: ['DAY'],
        components: []
    }
];

export default function MaintenanceDashboard() {
    const { isDark } = useTheme()
    const [data] = useState(DUMMY_MAINTENANCE_DATA);

    const getStatusBadge = (status: string) => {
        const styles = {
            OK: isDark ? 'bg-green-700 text-green-100' : 'bg-green-100 text-green-800',
            ALERT: isDark ? 'bg-yellow-700 text-yellow-100' : 'bg-yellow-100 text-yellow-800',
            DUE: isDark ? 'bg-red-700 text-red-100' : 'bg-red-100 text-red-800'
        };
        return styles[status as keyof typeof styles] || (isDark ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800');
    };

    const getProgressBar = (value: number, max: number, status: string, triggerType: string, triggers: string[]) => {
        if (!max || max === 0) return <span className={`text-${isDark ? 'gray-400' : 'gray-500'}`}>-</span>;

        const percentage = Math.min(100, (value / max) * 100);
        const isTriggered = triggers.includes(triggerType);

        let barColor = isDark ? 'bg-green-500' : 'bg-green-500';
        if (isTriggered && status === 'ALERT') barColor = isDark ? 'bg-yellow-500' : 'bg-yellow-500';
        if (isTriggered && status === 'DUE') barColor = isDark ? 'bg-red-500' : 'bg-red-500';

        return (
            <div>
                <div className={`w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2 mb-1`}>
                    <div
                        className={`${barColor} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {Math.floor(value)}/{max}
                </div>
            </div>
        );
    };

    const calculateDays = (lastMaintenance: string) => {
        const last = new Date(lastMaintenance);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - last.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const stats = {
        total: data.length,
        ok: data.filter(d => d.status === 'OK').length,
        alert: data.filter(d => d.status === 'ALERT').length,
        due: data.filter(d => d.status === 'DUE').length
    };

    return (
        <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto">
                {/* Stats */}
                <div className={`rounded-lg shadow-sm mb-6 p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <h1 className={`text-2xl font-semibold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        System List – Maintenance Overview
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <div className={`text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Systems</div>
                            <div className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.total}</div>
                        </div>
                        <div className={`rounded-lg p-4 ${isDark ? 'bg-green-900' : 'bg-green-50'}`}>
                            <div className={`text-sm mb-1 ${isDark ? 'text-green-200' : 'text-green-700'}`}>OK</div>
                            <div className={`text-3xl font-bold ${isDark ? 'text-green-100' : 'text-green-700'}`}>{stats.ok}</div>
                        </div>
                        <div className={`rounded-lg p-4 ${isDark ? 'bg-yellow-900' : 'bg-yellow-50'}`}>
                            <div className={`text-sm mb-1 ${isDark ? 'text-yellow-200' : 'text-yellow-700'}`}>Alert</div>
                            <div className={`text-3xl font-bold ${isDark ? 'text-yellow-100' : 'text-yellow-700'}`}>{stats.alert}</div>
                        </div>
                        <div className={`rounded-lg p-4 ${isDark ? 'bg-red-900' : 'bg-red-50'}`}>
                            <div className={`text-sm mb-1 ${isDark ? 'text-red-200' : 'text-red-700'}`}>Due</div>
                            <div className={`text-3xl font-bold ${isDark ? 'text-red-100' : 'text-red-700'}`}>{stats.due}</div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className={`rounded-lg shadow-sm overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className={`${isDark ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-gray-50 border-b border-gray-200'}`}>
                                <tr>
                                    {['Drone / Component','Type','Serial','Last Maintenance','Hours','Flights','Days','Status'].map((col) => (
                                        <th key={col} className="px-6 py-3 text-left text-xs font-medium uppercase">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                {data.map((drone) => (
                                    <React.Fragment key={drone.id}>
                                        <tr className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                            <td className={`px-6 py-4 font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{drone.code}</td>
                                            <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Drone ({drone.model.factory_model})</td>
                                            <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{drone.serial_number}</td>
                                            <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{drone.last_maintenance || '-'}</td>
                                            <td className="px-6 py-4">{getProgressBar(drone.total_hours, drone.model.maintenance_cycle_hour, drone.status, 'HOUR', drone.trigger)}</td>
                                            <td className="px-6 py-4">{getProgressBar(drone.total_flights, drone.model.maintenance_cycle_flight, drone.status, 'FLIGHT', drone.trigger)}</td>
                                            <td className="px-6 py-4">{drone.last_maintenance && drone.model.maintenance_cycle_day > 0 ? getProgressBar(calculateDays(drone.last_maintenance), drone.model.maintenance_cycle_day, drone.status, 'DAY', drone.trigger) : '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(drone.status)}`}>
                                                    {drone.status}
                                                </span>
                                            </td>
                                        </tr>

                                        {drone.components.map((comp, idx) => (
                                            <tr key={`${drone.id}-comp-${idx}`} className={`hover:${isDark ? 'bg-gray-600' : 'bg-gray-50'}`}>
                                                <td className={`px-6 py-4 pl-12 ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>{comp.component_type}</td>
                                                <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{comp.model.factory_type} ({comp.model.factory_model})</td>
                                                <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{comp.serial_number}</td>
                                                <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{comp.last_maintenance || '-'}</td>
                                                <td className="px-6 py-4">{getProgressBar(comp.total_hours, comp.model.maintenance_cycle_hour, comp.status, 'HOUR', comp.trigger)}</td>
                                                <td className="px-6 py-4">{getProgressBar(comp.total_flights, comp.model.maintenance_cycle_flight, comp.status, 'FLIGHT', comp.trigger)}</td>
                                                <td className="px-6 py-4">{comp.last_maintenance && comp.model.maintenance_cycle_day > 0 ? getProgressBar(calculateDays(comp.last_maintenance), comp.model.maintenance_cycle_day, comp.status, 'DAY', comp.trigger) : '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(comp.status)}`}>
                                                        {comp.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
