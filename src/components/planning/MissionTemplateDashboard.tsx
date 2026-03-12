'use client';

import {
    getMissionTemplateColumns,
    type MissionTemplateRow,
} from '@/components/tables/MissionTemplateColumn';
import { TablePagination } from '@/components/tables/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { FileText, Loader2, Search } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface FilterOption {
    id: number;
    name: string;
}

interface Filters {
    clientId: number;
    pilotId: number;
    evaluationId: number;
    planningId: number;
    dateStart: string;
    dateEnd: string;
}

interface MissionTemplateDashboardProps {
    isDark?: boolean;
}

const MissionTemplateDashboard: React.FC<MissionTemplateDashboardProps> = ({
    isDark = false,
}) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MissionTemplateRow[]>([]);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    const [clients, setClients] = useState<FilterOption[]>([]);
    const [pilots, setPilots] = useState<FilterOption[]>([]);
    const [evaluations, setEvaluations] = useState<FilterOption[]>([]);
    const [plannings, setPlannings] = useState<FilterOption[]>([]);

    const [filters, setFilters] = useState<Filters>({
        clientId: 0,
        pilotId: 0,
        evaluationId: 0,
        planningId: 0,
        dateStart: '',
        dateEnd: '',
    });

    const fetchFilterOptions = useCallback(async () => {
        try {
            const res = await axios.get('/api/evaluation/mission-template/filter');
            if (res.data.code === 1) {
                const d = res.data.data;
                setClients(d.clients ?? []);
                setPilots(d.pilots ?? []);
                setEvaluations(d.evaluations ?? []);
                setPlannings(d.plannings ?? []);
            }
        } catch {
            console.error('Failed to load filter options');
        }
    }, []);

    const fetchLogbook = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.clientId > 0) params.set('client_id', String(filters.clientId));
            if (filters.pilotId > 0) params.set('pilot_id', String(filters.pilotId));
            if (filters.evaluationId > 0) params.set('evaluation_id', String(filters.evaluationId));
            if (filters.planningId > 0) params.set('planning_id', String(filters.planningId));
            if (filters.dateStart) params.set('date_start', filters.dateStart);
            if (filters.dateEnd) params.set('date_end', filters.dateEnd);

            const res = await axios.get(`/api/evaluation/mission-template/logbook?${params.toString()}`);
            if (res.data.code === 1) {
                setData(res.data.data ?? []);
            } else {
                toast.error(res.data.message || 'Failed to fetch logbook');
            }
        } catch {
            toast.error('Error fetching mission templates');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchFilterOptions();
        fetchLogbook();
    }, []);

    const handleSearch = () => {
        fetchLogbook();
    };

    const columns = useMemo(() => getMissionTemplateColumns({ isDark }), [isDark]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });



    return (
        <div className={`min-h-screen  ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
            <div
                className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
                    ? 'bg-slate-900/80 border-b border-slate-800 text-white'
                    : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                    } px-6 py-4`}
            >
                <div className="mx-auto max-w-[1800px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 rounded-full bg-violet-600" />
                        <div>
                            <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Mission Template Logbook
                            </h1>
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Planning logbook entries with download access
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Card className={`m-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                <CardContent className="pt-5 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label className={isDark ? 'text-slate-300' : ''}>Client</Label>
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                                        {clients.length}
                                    </span>
                                </div>
                                <Select
                                    value={String(filters.clientId)}
                                    onValueChange={(v) => setFilters(p => ({ ...p, clientId: Number(v) }))}
                                >
                                    <SelectTrigger className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
                                        <SelectValue placeholder="All Clients" />
                                    </SelectTrigger>
                                    <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : ''}>
                                        <SelectItem value="0" className={isDark ? 'text-slate-200 focus:bg-slate-700' : ''}>All Clients</SelectItem>
                                        {clients.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)} className={isDark ? 'text-slate-200 focus:bg-slate-700' : ''}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label className={isDark ? 'text-slate-300' : ''}>PIC</Label>
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                                        {pilots.length}
                                    </span>
                                </div>
                                <Select
                                    value={String(filters.pilotId)}
                                    onValueChange={(v) => setFilters(p => ({ ...p, pilotId: Number(v) }))}
                                >
                                    <SelectTrigger className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
                                        <SelectValue placeholder="All Pilots" />
                                    </SelectTrigger>
                                    <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : ''}>
                                        <SelectItem value="0" className={isDark ? 'text-slate-200 focus:bg-slate-700' : ''}>All Pilots</SelectItem>
                                        {pilots.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)} className={isDark ? 'text-slate-200 focus:bg-slate-700' : ''}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label className={isDark ? 'text-slate-300' : ''}>Evaluation</Label>
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                                        {evaluations.length}
                                    </span>
                                </div>
                                <Select
                                    value={String(filters.evaluationId)}
                                    onValueChange={(v) => setFilters(p => ({ ...p, evaluationId: Number(v) }))}
                                >
                                    <SelectTrigger className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
                                        <SelectValue placeholder="All Evaluations" />
                                    </SelectTrigger>
                                    <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : ''}>
                                        <SelectItem value="0" className={isDark ? 'text-slate-200 focus:bg-slate-700' : ''}>All Evaluations</SelectItem>
                                        {evaluations.map((ev) => (
                                            <SelectItem key={ev.id} value={String(ev.id)} className={isDark ? 'text-slate-200 focus:bg-slate-700' : ''}>{ev.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className={isDark ? 'text-slate-300' : ''}>Date Range</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={filters.dateStart}
                                        onChange={(e) => setFilters(p => ({ ...p, dateStart: e.target.value }))}
                                        className={`flex-1 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}`}
                                    />
                                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>to</span>
                                    <Input
                                        type="date"
                                        value={filters.dateEnd}
                                        onChange={(e) => setFilters(p => ({ ...p, dateEnd: e.target.value }))}
                                        className={`flex-1 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label className={isDark ? 'text-slate-300' : ''}>Planning</Label>
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                                        {plannings.length}
                                    </span>
                                </div>
                                <Select
                                    value={String(filters.planningId)}
                                    onValueChange={(v) => setFilters(p => ({ ...p, planningId: Number(v) }))}
                                >
                                    <SelectTrigger className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
                                        <SelectValue placeholder="All Plannings" />
                                    </SelectTrigger>
                                    <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : ''}>
                                        <SelectItem value="0" className={isDark ? 'text-slate-200 focus:bg-slate-700' : ''}>All Plannings</SelectItem>
                                        {plannings.map((pl) => (
                                            <SelectItem key={pl.id} value={String(pl.id)} className={isDark ? 'text-slate-200 focus:bg-slate-700' : ''}>{pl.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="opacity-0 hidden md:block select-none">Search</Label>
                                <Button
                                    onClick={handleSearch}
                                    disabled={loading}
                                    className="w-full h-10 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    Search Logbook
                                </Button>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>

            <Card className={`m-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FileText
                                className={`h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                            />
                            <span
                                className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'
                                    }`}
                            >
                                Logbook Entries
                            </span>
                        </div>
                        <div className="relative w-56">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                className={`pl-8 h-8 text-xs ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : ''
                                    }`}
                                placeholder="Filter table..."
                                value={globalFilter ?? ''}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    <div
                        className={`rounded-md border ${isDark ? 'border-slate-800' : 'border-slate-200'
                            } overflow-hidden`}
                    >
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((hg) => (
                                    <TableRow
                                        key={hg.id}
                                        className={
                                            isDark
                                                ? 'bg-slate-900/50 border-slate-800 hover:bg-transparent'
                                                : 'bg-slate-50 hover:bg-slate-50'
                                        }
                                    >
                                        {hg.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                className={`text-xs h-8 px-3 ${isDark ? 'text-slate-400 font-medium' : ''
                                                    }`}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow
                                            key={i}
                                            className={isDark ? 'border-slate-800' : ''}
                                        >
                                            {columns.map((_, j) => (
                                                <TableCell key={j} className="px-3 py-2">
                                                    <Skeleton className="h-4 w-full" />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : table.getRowModel().rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className={`text-center text-xs py-10 ${isDark ? 'text-slate-500' : 'text-slate-400'
                                                }`}
                                        >
                                            No logbook entries found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            className={
                                                isDark
                                                    ? 'border-slate-800 hover:bg-slate-800/50'
                                                    : 'hover:bg-slate-50/50'
                                            }
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className={`px-3 py-2 ${isDark ? 'text-slate-300' : ''}`}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <TablePagination table={table} />
                </CardContent>
            </Card>
        </div>
    );
};

export default MissionTemplateDashboard;