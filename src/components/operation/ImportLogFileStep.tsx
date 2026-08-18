'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    FileUp,
    Loader2,
    RefreshCw,
    Search,
} from 'lucide-react';

interface FlytbaseOrganization { organization_id: number; org_name: string }
interface FlytbaseFlight {
    flight_id: string;
    flight_name?: string;
    start_time?: number;
    end_time?: number;
    duration?: number;
    distance?: number;
    drone_name?: string;
    drone_id?: string;
}

const PLATFORMS = [{ value: 'FLYTBASE', label: 'Control Center' }];
const FLIGHTS_PAGE_SIZE = 20;

function formatDuration(secs?: number): string {
    if (secs == null) return '—';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return h + 'h ' + m + 'm';
    return m > 0 ? m + 'm ' + s + 's' : `${s}s`;
}

function formatDistance(meters?: number): string {
    if (meters == null) return '—';
    if (meters >= 1000) return (meters / 1000).toFixed(2) + ' km';
    return Math.round(meters) + ' m';
}

function formatFlightTime(timestamp?: number): string {
    if (timestamp == null) return '—';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface ImportLogFileStepProps {
    t: (key: string, opts?: any) => string;
    ns: string;
    platform: string;
    setPlatform: (v: string) => void;
    organizations: FlytbaseOrganization[];
    organizationId: string;
    setOrganizationId: (v: string) => void;
    loadingOrgs: boolean;
    fbWindow: string;
    setFbWindow: (v: string) => void;
    loadingFlights: boolean;
    fetchFlytbaseFlights: (page?: number) => void;
    flightsFetched: boolean;
    flightSearchQuery: string;
    setFlightSearchQuery: (v: string) => void;
    filteredFlights: FlytbaseFlight[];
    selectedFlightId: string;
    setSelectedFlightId: (v: string) => void;
    flightTotal: number;
    flightPage: number;
    flightsError: string;
    logFile: File | null;
    setLogFile: (f: File | null) => void;
}

export function ImportLogFileStep({
    t, ns,
    platform, setPlatform,
    organizations, organizationId, setOrganizationId, loadingOrgs,
    fbWindow, setFbWindow,
    loadingFlights, fetchFlytbaseFlights,
    flightsFetched, flightSearchQuery, setFlightSearchQuery,
    filteredFlights, selectedFlightId, setSelectedFlightId,
    flightTotal, flightPage, flightsError,
    logFile, setLogFile,
}: ImportLogFileStepProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div>
                        <Label className="mb-1.5 block">{t(ns + '.fields.platform')}</Label>
                        <Select value={platform} onValueChange={setPlatform}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PLATFORMS.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {platform === 'FLYTBASE' && (
                        <>
                            <div>
                                <Label className="mb-1.5 block">{t(ns + '.fields.organization')} <span className="text-red-500">*</span></Label>
                                <Select value={organizationId} onValueChange={setOrganizationId} disabled={loadingOrgs}>
                                    <SelectTrigger>
                                        {loadingOrgs ? <Loader2 className="h-4 w-4 animate-spin" /> : organizationId ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectOrganization')} />}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {organizations.map((org) => (
                                            <SelectItem key={org.organization_id} value={String(org.organization_id)}>{org.org_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1.5 block">{t(ns + '.fields.timeWindow')}</Label>
                                <Select value={fbWindow} onValueChange={setFbWindow}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="60">Last 1 hour</SelectItem>
                                        <SelectItem value="360">Last 6 hours</SelectItem>
                                        <SelectItem value="720">Last 12 hours</SelectItem>
                                        <SelectItem value="1440">Last 24 hours</SelectItem>
                                        <SelectItem value="4320">Last 3 days</SelectItem>
                                        <SelectItem value="10080">Last 7 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <Label>{t(ns + '.fields.selectFlight')} <span className="text-red-500">*</span></Label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => fetchFlytbaseFlights(1)}
                                        disabled={!organizationId || loadingFlights}
                                        className="h-7 px-2 cursor-pointer"
                                    >
                                        {loadingFlights ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                        <span className="ml-1">{t(ns + '.buttons.refreshFlights')}</span>
                                    </Button>
                                </div>
                                {loadingFlights ? (
                                    <div className="space-y-3">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 border-b">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-3 w-16" />
                                                <Skeleton className="h-3 w-12" />
                                            </div>
                                        ))}
                                    </div>
                                ) : !flightsFetched ? (
                                    <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg h-96 flex flex-col items-center justify-center gap-2 text-center px-6">
                                        <FileUp className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {t(ns + '.info.clickToFetchFlights')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            value={flightSearchQuery}
                                            onChange={(e) => setFlightSearchQuery(e.target.value)}
                                            placeholder={t(ns + '.placeholders.searchFlights')}
                                            className="h-8 pl-8 text-xs"
                                        />
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-96 flex flex-col">
                                        <div className="flex-1 overflow-y-auto">
                                            {filteredFlights.map((f) => {
                                                const isSelected = selectedFlightId === f.flight_id;
                                                return (
                                                    <div
                                                        key={f.flight_id}
                                                        onClick={() => setSelectedFlightId(f.flight_id)}
                                                        className={cn(
                                                            'flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-l-4 border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors',
                                                            isSelected
                                                                ? 'bg-violet-50 dark:bg-violet-950/20 border-l-violet-600'
                                                                : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-900'
                                                        )}
                                                    >
                                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                            <div className="font-medium text-xs truncate">
                                                                {f.flight_name || f.flight_id}
                                                                {f.drone_name ? ` · ${f.drone_name}` : ''}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                                <span>{formatFlightTime(f.start_time)}</span>
                                                                <span>{formatDuration(f.duration)}</span>
                                                                <span>{formatDistance(f.distance)}</span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0" />}
                                                    </div>
                                                );
                                            })}
                                            {filteredFlights.length === 0 && !loadingFlights && (
                                                <div className="p-4 text-center text-sm text-muted-foreground">
                                                    {flightSearchQuery.trim()
                                                        ? t(ns + '.info.noFlightsMatchSearch')
                                                        : t(ns + '.toast.noFlightsFound')}
                                                </div>
                                            )}
                                    </div>
                                    {flightTotal > FLIGHTS_PAGE_SIZE && (
                                        <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                                            <span className="text-xs text-muted-foreground">
                                                Page {flightPage} of {Math.ceil(flightTotal / FLIGHTS_PAGE_SIZE)}
                                            </span>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => fetchFlytbaseFlights(flightPage - 1)}
                                                    disabled={flightPage === 1 || loadingFlights}
                                                    className="h-7 px-2 cursor-pointer"
                                                >
                                                    Prev
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => fetchFlytbaseFlights(flightPage + 1)}
                                                    disabled={flightPage >= Math.ceil(flightTotal / FLIGHTS_PAGE_SIZE) || loadingFlights}
                                                    className="h-7 px-2 cursor-pointer"
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                    </div>
                            )}
                            {flightsError && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{flightsError}</p>
                            )}
                        </div>
                    </>
                    )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/20">
                    <Label className="mb-3 block">{t(ns + '.fields.logFile')} <span className="text-red-500">*</span></Label>
                    <div className="space-y-3">
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-violet-400 dark:hover:border-violet-600 transition-colors">
                            <Input
                                id="log-file-input"
                                type="file"
                                accept=".gutma,.zip,.json,.xml"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    console.log('File selected:', file?.name, file?.size, file?.type);
                                    setLogFile(file);
                                    if (file) {
                                        setSelectedFlightId('');
                                    }
                                }}
                                className="hidden"
                            />
                            <label
                                htmlFor="log-file-input"
                                className="cursor-pointer flex flex-col items-center gap-2"
                            >
                                <FileUp className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {logFile ? logFile.name : t(ns + '.placeholders.selectFlightLog')}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-500">
                                    .gutma, .zip, .json, .xml
                                </span>
                            </label>
                        </div>
                        {logFile && (
                            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm text-emerald-700 dark:text-emerald-400">{logFile.name}</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setLogFile(null);
                                        const fileInput = document.getElementById('log-file-input') as HTMLInputElement;
                                        if (fileInput) fileInput.value = '';
                                    }}
                                    className="h-6 px-2 cursor-pointer text-red-600 hover:text-red-700"
                                >
                                    Clear
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
