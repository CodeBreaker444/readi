'use client';
import { Clock, Navigation, Plane, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from "react";
import { useTheme } from "../useTheme";
import DashboardSkeleton from './DashboardSkeleton';
interface DashboardClientProps {
    ownerId: number;
    userProfileCode: string;
    userId: number;
}

interface StatData {
    label: string;
    value: string;
    trend: 'up' | 'down';
    color: string;
    percentageChange?: number;
    icon: React.ElementType;
    bgColor: string;
}

interface MissionData {
    id: string;
    name: string;
    date: string;
    status: 'Left' | 'Waiting' | 'Completed';
    completion: 'Completed' | 'Waiting';
}
export default function DashboardClient({ ownerId, userProfileCode, userId }: DashboardClientProps) {
    const { isDark } = useTheme();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const stats: StatData[] = [
        {
            label: 'Total Missions',
            value: data?.readi_mission_total?.total_mission?.toString() || '0',
            trend: 'up',
            color: 'blue',
            percentageChange: 12,
            icon: Plane,
            bgColor: 'bg-blue-100'
        },
        {
            label: 'Logged Drones',
            value: data?.readi_mission_total?.total_drones_used?.toString() || '0',
            trend: 'up',
            color: 'cyan',
            percentageChange: 8,
            icon: Navigation,
            bgColor: 'bg-cyan-100'
        },
        {
            label: 'Total Hours Flown',
            value: data?.pilot_total?.total_hours?.toString() || data?.readi_mission_total?.total_hours?.toString() || '0',
            trend: 'down',
            color: 'pink',
            percentageChange: -3,
            icon: Clock,
            bgColor: 'bg-pink-100'
        },
        {
            label: 'Total Km Flown',
            value: Math.round((data?.pilot_total?.total_distance || data?.readi_mission_total?.total_meter || 0) / 1000).toString(),
            trend: 'up',
            color: 'yellow',
            percentageChange: 15,
            icon: TrendingUp,
            bgColor: 'bg-yellow-100'
        }
    ];

    useEffect(() => {
        async function fetchDashboard() {
            try {
                setLoading(true);
                const response = await fetch(`/api/dashboard/${ownerId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        user_profile_code: userProfileCode,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message);
                }

                setData(result.data);
            } catch (err: any) {
                console.log(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboard();
    }, [ownerId, userProfileCode]);

    const missions: MissionData[] = (data?.readi_mission_scheduler_executed || []).map((mission: any) => ({
        id: `#${mission.mission_id}`,
        name: mission.pilot_name || 'Unknown',
        date: mission.date,
        status: mission.mission_result_desc === 'Completed' ? 'Completed' : 'Waiting',
        completion: mission.mission_result_desc === 'Completed' ? 'Completed' : 'Waiting'
    }));

    const nextMissions: MissionData[] = (data?.readi_mission_scheduler_planned || []).map((mission: any) => ({
        id: `#${mission.mission_id}`,
        name: mission.pilot_name || 'Unknown',
        date: mission.date,
        status: 'Waiting',
        completion: 'Waiting'
    }));

    if (loading) {
        return <DashboardSkeleton isDark={isDark} />;
    }


    return (
        <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="mb-6 lg:mb-8">
                <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Dashboard {new Date().getFullYear()}
                </h1>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
                {stats.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                        <div
                            key={index}
                            className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 sm:p-6`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {stat.label}
                                </span>
                                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                                    <IconComponent className={`text-${stat.color}-600`} size={20} />
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {stat.value}
                                </div>
                                {stat.trend === 'up' ? (
                                    <TrendingUp className="text-green-500" size={16} />
                                ) : (
                                    <TrendingDown className="text-red-500" size={16} />
                                )}
                            </div>
                            {stat.percentageChange && (
                                <p className={`text-xs mt-1 ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                    {stat.trend === 'up' ? '+' : ''}{stat.percentageChange}% from last month
                                </p>
                            )}
                        </div>
                    );
                })}

                <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 sm:p-6`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Customer Served
                        </span>
                        <div className="bg-orange-100 p-2 rounded-lg">
                            <Users className="text-orange-600" size={20} />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            48
                        </div>
                        <TrendingUp className="text-green-500" size={16} />
                    </div>
                    <p className="text-xs mt-1 text-gray-500">
                        2026 year
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 lg:mb-8">
                <div className={`lg:col-span-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 sm:p-6`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                        <h2 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Mission Overview
                        </h2>
                        <select className={`text-sm border rounded-lg px-3 py-2 w-full sm:w-auto ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}>
                            <option>This Year</option>
                            <option>This Month</option>
                            <option>This Week</option>
                        </select>
                    </div>

                    <div className={`h-64 sm:h-80 rounded-lg flex items-center justify-center ${isDark ? 'bg-linear-to-br from-slate-700 to-slate-600' : 'bg-linear-to-br from-blue-50 to-purple-50'
                        }`}>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                            Chart visualization area
                        </p>
                    </div>
                </div>

                <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 sm:p-6`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                        <h2 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Mission Results
                        </h2>
                        <select className={`text-sm border rounded-lg px-2 py-1 w-full sm:w-auto ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}>
                            <option>All</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-center h-48">
                        <div className="relative">
                            <div className={`w-40 h-40 rounded-full border-20 ${isDark ? 'border-slate-700' : 'border-gray-200'
                                } flex items-center justify-center`}
                                style={{
                                    borderTopColor: '#10b981',
                                    borderRightColor: '#f59e0b',
                                    borderBottomColor: '#ef4444',
                                    borderLeftColor: '#3b82f6'
                                }}
                            >
                                <div className={`text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    <p className="text-2xl font-bold">85%</p>
                                    <p className="text-xs text-gray-500">Success Rate</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Completed</span>
                            </div>
                            <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>65%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>In Progress</span>
                            </div>
                            <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>25%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Failed</span>
                            </div>
                            <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>10%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 sm:p-6`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                        <h2 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Past 10 Missions
                        </h2>
                        <div className="flex space-x-2">
                            <button className={`text-sm px-3 py-1 border rounded-lg ${isDark ? 'text-gray-300 border-slate-600 hover:bg-slate-700' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}>
                                Search
                            </button>
                            <button className={`text-sm px-3 py-1 border rounded-lg ${isDark ? 'text-gray-300 border-slate-600 hover:bg-slate-700' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}>
                                Filter
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="inline-block min-w-full align-middle">
                            <table className="min-w-full">
                                <thead>
                                    <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                        <th className={`text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            } whitespace-nowrap`}>ID</th>
                                        <th className={`text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            }`}>Name</th>
                                        <th className={`text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            } hidden md:table-cell`}>Date</th>
                                        <th className={`text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            }`}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {missions.map((mission, index) => (
                                        <tr key={index} className={`border-b ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-100 hover:bg-gray-50'
                                            }`}>
                                            <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-blue-600 whitespace-nowrap">
                                                {mission.id}
                                            </td>
                                            <td className={`py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                                                }`}>
                                                {mission.name}
                                            </td>
                                            <td className={`py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'
                                                } hidden md:table-cell`}>
                                                {mission.date}
                                            </td>
                                            <td className="py-3 sm:py-4 px-2 sm:px-4">
                                                <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium
                          ${mission.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                        mission.status === 'Waiting' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                    {mission.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 sm:p-6`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                        <h2 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Next 10 Missions
                        </h2>
                        <div className="flex space-x-2">
                            <button className={`text-sm px-3 py-1 border rounded-lg ${isDark ? 'text-gray-300 border-slate-600 hover:bg-slate-700' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}>
                                Search
                            </button>
                            <button className={`text-sm px-3 py-1 border rounded-lg ${isDark ? 'text-gray-300 border-slate-600 hover:bg-slate-700' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}>
                                Filter
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="inline-block min-w-full align-middle">
                            <table className="min-w-full">
                                <thead>
                                    <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                        <th className={`text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            } whitespace-nowrap`}>ID</th>
                                        <th className={`text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            }`}>Name</th>
                                        <th className={`text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            } hidden md:table-cell`}>Date</th>
                                        <th className={`text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            }`}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {nextMissions.map((mission, index) => (
                                        <tr key={index} className={`border-b ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-100 hover:bg-gray-50'
                                            }`}>
                                            <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-blue-600 whitespace-nowrap">
                                                {mission.id}
                                            </td>
                                            <td className={`py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                                                }`}>
                                                {mission.name}
                                            </td>
                                            <td className={`py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'
                                                } hidden md:table-cell`}>
                                                {mission.date}
                                            </td>
                                            <td className="py-3 sm:py-4 px-2 sm:px-4">
                                                <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium
                          ${mission.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                        mission.status === 'Waiting' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                    {mission.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}