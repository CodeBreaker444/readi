'use client';

import { cn } from '@/lib/utils';
import { Clock, Navigation, Plane, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, Cell, Legend,
    Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { useTheme } from '../useTheme';
import DashboardSkeleton from './DashboardSkeleton';

interface DashboardClientProps {
    ownerId: number;
    userProfileCode: string;
    userId: number;
    initialData?: any;
}

interface MissionData {
    id: string;
    name: string;
    date: string;
    status: 'Left' | 'Waiting' | 'Completed';
}

const PIE_COLORS = ['#ef4444', '#10b981', '#f59e0b'];
const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b'];

const STATS = (data: any) => [
    {
        label: 'Total Missions',
        value: data?.readi_mission_total?.total_mission?.toString() || '0',
        trend: 'up' as const,
        pct: '+12%',
        icon: Plane,
        bar: 'bg-blue-500',
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-500',
        footer: 'from last month',
        footerColor: 'text-emerald-500',
    },
    {
        label: 'Logged Drones',
        value: data?.readi_mission_total?.total_drones_used?.toString() || '0',
        trend: 'up' as const,
        pct: '+8%',
        icon: Navigation,
        bar: 'bg-cyan-500',
        iconBg: 'bg-cyan-500/10',
        iconColor: 'text-cyan-500',
        footer: 'from last month',
        footerColor: 'text-emerald-500',
    },
    {
        label: 'Hours Flown',
        value: data?.pilot_total?.total_hours?.toString() || data?.readi_mission_total?.total_hours?.toString() || '0',
        trend: 'down' as const,
        pct: '-3%',
        icon: Clock,
        bar: 'bg-pink-500',
        iconBg: 'bg-pink-500/10',
        iconColor: 'text-pink-500',
        footer: 'from last month',
        footerColor: 'text-red-400',
    },
    {
        label: 'Km Flown',
        value: Math.round((data?.pilot_total?.total_distance || data?.readi_mission_total?.total_meter || 0) / 1000).toString(),
        trend: 'up' as const,
        pct: '+15%',
        icon: TrendingUp,
        bar: 'bg-yellow-500',
        iconBg: 'bg-yellow-500/10',
        iconColor: 'text-yellow-500',
        footer: 'from last month',
        footerColor: 'text-emerald-500',
    },
    {
        label: 'Customers Served',
        value: '48',
        trend: 'up' as const,
        pct: null,
        icon: Users,
        bar: 'bg-orange-500',
        iconBg: 'bg-orange-500/10',
        iconColor: 'text-orange-500',
        footer: '2026 year',
        footerColor: 'text-slate-400',
    },
];

const STATUS_STYLE: Record<string, string> = {
    Completed: 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/25',
    Waiting: 'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/25',
    Left: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/25',
};

export default function DashboardClient({ ownerId, userProfileCode, userId, initialData }: DashboardClientProps) {
    const { isDark } = useTheme();
    const [data, setData] = useState<any>(initialData || null);
    const [loading, setLoading] = useState(!initialData);

    useEffect(() => {
        if (initialData) return;
        async function fetchDashboard() {
            try {
                setLoading(true);
                const res = await fetch(`/api/dashboard/${ownerId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        user_profile_code: userProfileCode,
                    }),
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message);
                setData(result.data);
            } catch (err: any) {
                console.error(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboard();
    }, [ownerId, userProfileCode, initialData]);

    if (loading) return <DashboardSkeleton isDark={isDark} />;

    const missions: MissionData[] = (data?.readi_mission_scheduler_executed || []).map((m: any) => ({
        id: `#${m.mission_id}`,
        name: m.pilot_name?.trim() || 'Not Assigned',
        date: m.date,
        status: m.mission_result_desc === 'Completed' ? 'Completed' : 'Waiting',
    }));

    const nextMissions: MissionData[] = (data?.readi_mission_scheduler_planned || []).map((m: any) => ({
        id: `#${m.mission_id}`,
        name: m.pilot_name?.trim() || 'Not Assigned',
        date: m.date,
        status: 'Waiting',
    }));

    const barChartData = data?.readi_mission_chart?.labels?.map((month: string, i: number) => ({
        month,
        ...data.readi_mission_chart.series.reduce((acc: any, drone: any) => ({
            ...acc,
            [drone.name]: drone.data[i],
        }), {}),
    })) || [];

    const pieData = data?.readi_mission_result_chart?.labels?.map((label: string, i: number) => ({
        name: label,
        value: data.readi_mission_result_chart.series[i],
    })) || [];

    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const axisColor = isDark ? '#475569' : '#94a3b8';
    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBdr = isDark ? '#1e293b' : '#e2e8f0';

    const card = cn(
        'rounded-xl border',
        isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'
    );

    const cardHeader = cn(
        'flex items-center justify-between px-5 py-4 border-b',
        isDark ? 'border-slate-700/60' : 'border-gray-100'
    );

    const cardTitle = cn(
        'text-sm font-semibold tracking-wide',
        isDark ? 'text-white' : 'text-gray-800'
    );

    const selectCls = cn(
        'text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40',
        isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-700'
    );

    const thCls = cn(
        'text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider',
        isDark ? 'text-slate-500' : 'text-gray-400'
    );

    const tdCls = cn('py-3 px-3 text-xs', isDark ? 'text-slate-300' : 'text-gray-700');

    const trCls = cn(
        'border-b transition-colors',
        isDark ? 'border-slate-700/40 hover:bg-slate-700/30' : 'border-gray-50 hover:bg-gray-50/80'
    );

    const btnCls = cn(
        'text-xs px-2.5 py-1 rounded-lg border transition-colors',
        isDark
            ? 'text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
            : 'text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
    );

    const stats = STATS(data);

    return (
        <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${isDark ? 'text-white' : 'text-gray-900'}`}>

            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        Overview
                    </p>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Dashboard{' '}
                        <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>{new Date().getFullYear()}</span>
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {stats.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className={cn(card, 'relative overflow-hidden p-5 flex flex-col gap-3')}>
                            <div className={cn('absolute left-0 top-0 h-full w-0.5 rounded-l-xl', s.bar)} />

                            <div className="flex items-center justify-between">
                                <span className={cn('text-xs font-medium tracking-wide uppercase', isDark ? 'text-slate-400' : 'text-gray-500')}>
                                    {s.label}
                                </span>
                                <div className={cn('p-2 rounded-lg', s.iconBg)}>
                                    <Icon className={cn('h-4 w-4', s.iconColor)} />
                                </div>
                            </div>

                            <div className={cn('text-3xl font-bold tabular-nums tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
                                {s.value}
                            </div>

                            <div className="flex items-center gap-1.5">
                                {s.trend === 'up'
                                    ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    : <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                                <span className={cn('text-xs font-medium', s.footerColor)}>
                                    {s.pct ? `${s.pct} ${s.footer}` : s.footer}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">

                <div className={cn(card, 'lg:col-span-2 flex flex-col')}>
                    <div className={cardHeader}>
                        <h2 className={cardTitle}>Mission Overview</h2>
                        <select className={selectCls}>
                            <option>This Year</option>
                            <option>This Month</option>
                            <option>This Week</option>
                        </select>
                    </div>
                    <div className="p-5 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} barCategoryGap="30%">
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                <XAxis dataKey="month" stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: '10px', fontSize: 12 }}
                                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
                                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                                {data?.readi_mission_chart?.series?.map((drone: any, i: number) => (
                                    <Bar key={drone.name} dataKey={drone.name} fill={BAR_COLORS[i % BAR_COLORS.length]} radius={[5, 5, 0, 0]} maxBarSize={28} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={cn(card, 'flex flex-col')}>
                    <div className={cardHeader}>
                        <h2 className={cardTitle}>Mission Results</h2>
                        <select className={selectCls}><option>All</option></select>
                    </div>
                    <div className="p-5 flex flex-col gap-4">
                        <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={70}
                                        paddingAngle={4} dataKey="value" strokeWidth={0}>
                                        {pieData.map((_: any, i: number) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: '10px', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="space-y-2">
                            {(data?.readi_mission_result_chart?.labels ?? ['Completed', 'In Progress', 'Failed'])
                                .map((label: string, i: number) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>{label}</span>
                                        </div>
                                        <span className={cn('text-xs font-semibold tabular-nums', isDark ? 'text-slate-200' : 'text-gray-700')}>
                                            {data?.readi_mission_result_chart
                                                ? data.readi_mission_result_chart.series[i]
                                                : ['65%', '25%', '10%'][i]}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[
                    { title: 'Past 10 Missions', rows: missions, empty: 'No past missions' },
                    { title: 'Next 10 Missions', rows: nextMissions, empty: 'No upcoming missions' },
                ].map(({ title, rows, empty }) => (
                    <div key={title} className={cn(card, 'flex flex-col')}>
                        <div className={cardHeader}>
                            <h2 className={cardTitle}>{title}</h2>
                            <div className="flex gap-1.5">
                                <button className={btnCls}>Search</button>
                                <button className={btnCls}>Filter</button>
                            </div>
                        </div>
                        <div className="p-5 overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className={cn('border-b', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
                                        <th className={cn(thCls, 'w-16')}>ID</th>
                                        <th className={thCls}>Pilot</th>
                                        <th className={cn(thCls, 'hidden sm:table-cell')}>Date</th>
                                        <th className={thCls}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className={cn('py-8 text-center text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
                                                {empty}
                                            </td>
                                        </tr>
                                    )}
                                    {rows.map((m, i) => (
                                        <tr key={i} className={trCls}>
                                            <td className={cn(tdCls, 'font-mono text-blue-500 font-medium')}>{m.id}</td>
                                            <td className={tdCls}>{m.name}</td>
                                            <td className={cn(tdCls, 'hidden sm:table-cell', isDark ? 'text-slate-400' : 'text-gray-400')}>{m.date}</td>
                                            <td className="py-3 px-3">
                                                <span className={cn(
                                                    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium',
                                                    STATUS_STYLE[m.status] ?? 'bg-gray-100 text-gray-500'
                                                )}>
                                                    {m.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}