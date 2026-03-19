'use client';

import { Search } from "lucide-react";

interface Props {
    search: string;
    statusFilter: string;
    onSearch: (v: string) => void;
    onStatusChange: (v: string) => void;
    isDark: boolean;
}

export function TicketFilters({ search, statusFilter, onSearch, onStatusChange, isDark }: Props) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center rounded-lg border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                {['ALL', 'OPEN', 'CLOSED'].map((s) => (
                    <button
                        key={s}
                        onClick={() => onStatusChange(s)}
                        className={`px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === s
                                ? 'bg-slate-900 text-white'
                                : isDark
                                    ? 'text-slate-400 hover:bg-slate-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="relative flex-1 min-w-50">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Search by drone code, serial, assignee…"
                    className={`w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                />
            </div>
        </div>
    );
}