"use client";

import { useTimezone } from "@/components/TimezoneProvider";
import { Button } from "@/components/ui/button";
import { formatInTz } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
    onRefresh: () => void;
    isRefreshing: boolean;
    isDark: boolean;
}

export function BoardHeader({ onRefresh, isRefreshing, isDark }: Props) {
    const { t } = useTranslation();
    const { timezone } = useTimezone();
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className={`top-0 z-10 backdrop-blur-md transition-colors ${
            isDark ? "bg-slate-900/80 border-b border-slate-800 text-white"
                   : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        } px-6 py-4`}>
            <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 rounded-full bg-violet-600" />
                    <div>
                        <h1 className={`font-semibold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                            {t("operations.board.title")}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                    {t("planning.status.active")}
                                </p>
                            </div>
                            <span className={`text-[10px] ${isDark ? "text-slate-700" : "text-slate-300"}`}>|</span>
                            <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                {t("operations.board.subtitle")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {now && (
                        <div className="hidden md:flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-4">
                            <span className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                {formatInTz(now, timezone, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            <span className={`text-[11px] font-mono font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                {formatInTz(now, timezone, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                    )}
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-8 gap-1.5 text-xs transition-all">
                        {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        {t("operations.board.refresh")}
                    </Button>
                </div>
            </div>
        </div>
    );
}