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
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Search by drone code, serial, assignee…"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition ${isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-indigo-500'
                            : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-400'
                        } outline-none focus:ring-2`}
                />
            </div>

            <div className="flex gap-2">
                {['ALL', 'OPEN', 'CLOSED'].map((s) => (
                    <button
                        key={s}
                        onClick={() => onStatusChange(s)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${statusFilter === s
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : isDark
                                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}