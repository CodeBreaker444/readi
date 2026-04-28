'use client';

import { useTheme } from '@/components/useTheme';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Moon, Sun } from 'lucide-react';

export default function DocLoading() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
            {/* Top bar */}
            <div className={`sticky top-0 z-10 border-b backdrop-blur-xl ${isDark
                ? 'border-white/6 bg-slate-900/80'
                : 'border-gray-200/80 bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
            }`}>
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            <ArrowLeft size={18} />
                        </div>
                        <Skeleton className={`h-5 w-36 rounded-md ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-lg transition-colors ${isDark
                            ? 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        aria-label="Toggle theme"
                    >
                        {isDark ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
                {/* Header card skeleton */}
                <div className={`rounded-xl border p-8 space-y-4 ${isDark
                    ? 'border-white/6 bg-[#0f1320]'
                    : 'border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                }`}>
                    <Skeleton className={`h-5 w-24 rounded-md ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-8 w-3/4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-4 w-28 rounded ${isDark ? 'bg-slate-800/60' : 'bg-gray-100'}`} />
                </div>

                {/* Body skeleton */}
                <div className={`rounded-xl border px-8 py-7 space-y-3 ${isDark
                    ? 'border-white/6 bg-[#0f1320]'
                    : 'border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                }`}>
                    {[90, 75, 85, 60, 80, 70, 88, 65].map((w, i) => (
                        <Skeleton
                            key={i}
                            className={`h-4 rounded ${isDark ? 'bg-slate-800/70' : 'bg-gray-100'}`}
                            style={{ width: `${w}%` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
