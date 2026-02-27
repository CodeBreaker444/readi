import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";
import { Mission } from "@/config/types/operation";
import { cn } from "@/lib/utils";
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Crosshair,
    Gauge,
    MapPin,
    User,
    Zap
} from "lucide-react";
import { MissionLimitsPanel } from "./MissionLimitsPanel";

interface Props {
    mission: Mission | null;
    open: boolean;
    onClose: () => void;
    isDark: boolean;
}


interface Props {
    mission: Mission | null;
    open: boolean;
    onClose: () => void;
    isDark: boolean
}

export function MissionDetailSheet({ mission, open, onClose, isDark }: Props) {

    if (!mission) return null;

    const flags = [
        { label: "Incident", active: mission.incident_flag === 1 },
        { label: "RTH Unplanned", active: mission.rth_unplanned === 1 },
        { label: "Link Loss", active: mission.link_loss === 1 },
        { label: "Deviation", active: mission.deviation_flag === 1 },
    ].filter((f) => f.active);

    const statusMap: Record<string, { label: string; dark: string; light: string; dot: string }> = {
        "00": { label: "Scheduled", dark: "text-blue-400 bg-blue-500/10 border-blue-500/20", light: "text-blue-600 bg-blue-50 border-blue-200", dot: "bg-blue-400" },
        "05": { label: "In Progress", dark: "text-amber-400 bg-amber-500/10 border-amber-500/20", light: "text-amber-600 bg-amber-50 border-amber-200", dot: "bg-amber-400 animate-pulse" },
        "10": { label: "Completed", dark: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", light: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-400" },
        "99": { label: "Cancelled", dark: "text-red-400 bg-red-500/10 border-red-500/20", light: "text-red-600 bg-red-50 border-red-200", dot: "bg-red-400" },
        "101": { label: "Pending", dark: "text-slate-400 bg-slate-500/10 border-slate-500/20", light: "text-slate-500 bg-slate-100 border-slate-200", dot: "bg-slate-400" },
    };
    const status = statusMap[mission.mission_status_code] ?? statusMap["00"];

    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent
                side="right"
                className={cn(
                    "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[420px]",
                    isDark
                        ? "border-white/[0.06] bg-[#080c12]"
                        : "border-slate-200 bg-slate-50"
                )}
            >
                <div
                    className={cn(
                        "relative overflow-hidden px-6 pb-5 pt-6",
                        isDark
                            ? "bg-slate-900/80"
                            : "bg-white border-b border-slate-200"
                    )}
                >
                    {isDark && (
                        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-gradient-to-bl from-violet-500/10 to-transparent" />
                    )}

                    

                    <div className="mb-3 flex items-center gap-2">
                        <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium",
                            isDark
                                ? "border-white/10 bg-white/[0.04] text-slate-400"
                                : "border-slate-200 bg-slate-100 text-slate-500"
                        )}>
                            <Zap className="h-2.5 w-2.5" />
                            #{mission.mission_id}
                        </span>
                        <span className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            isDark ? status.dark : status.light
                        )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                            {status.label}
                        </span>
                    </div>

                    <h2 className={cn(
                        "text-xl font-bold leading-tight tracking-tight",
                        isDark ? "text-white" : "text-slate-900"
                    )}>
                        {mission.vehicle_code}
                    </h2>
                    {mission.vehicle_desc && (
                        <p className={cn("mt-0.5 text-[13px]", isDark ? "text-slate-400" : "text-slate-500")}>
                            {mission.vehicle_desc}
                        </p>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={cn(
                                "rounded-md px-2 py-0.5 text-[11px]",
                                isDark
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            )}
                        >
                            {mission.client_name || "—"}
                        </Badge>
                        {mission.mission_category_desc && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "rounded-md px-2 py-0.5 text-[11px]",
                                    isDark
                                        ? "border-sky-500/20 bg-sky-500/10 text-sky-400"
                                        : "border-sky-200 bg-sky-50 text-sky-600"
                                )}
                            >
                                <Crosshair className="mr-1 h-2.5 w-2.5" />
                                {mission.mission_category_desc}
                            </Badge>
                        )}
                        {mission.mission_type_desc && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "rounded-md px-2 py-0.5 text-[11px]",
                                    isDark
                                        ? "border-violet-500/20 bg-violet-500/10 text-violet-400"
                                        : "border-violet-200 bg-violet-50 text-violet-600"
                                )}
                            >
                                {mission.mission_type_desc}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">

                    {(mission.flown_time != null || mission.flown_meter != null) && (
                        <div className={cn(
                            "grid grid-cols-2 divide-x",
                            isDark ? "divide-white/[0.06] border-b border-white/[0.06]" : "divide-slate-200 border-b border-slate-200"
                        )}>
                            {mission.flown_time != null && (
                                <div className={cn("px-6 py-4", isDark ? "bg-slate-900/30" : "bg-white")}>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className={cn("h-3 w-3", isDark ? "text-slate-500" : "text-slate-400")} />
                                        <span className={cn("text-[10px] uppercase tracking-widest", isDark ? "text-slate-600" : "text-slate-400")}>
                                            Flight Time
                                        </span>
                                    </div>
                                    <p className={cn("mt-1 text-lg font-bold tabular-nums", isDark ? "text-slate-100" : "text-slate-800")}>
                                        {mission.flown_time}
                                        <span className={cn("ml-0.5 text-xs font-normal", isDark ? "text-slate-500" : "text-slate-400")}>min</span>
                                    </p>
                                </div>
                            )}
                            {mission.flown_meter != null && (
                                <div className={cn("px-6 py-4", isDark ? "bg-slate-900/30" : "bg-white")}>
                                    <div className="flex items-center gap-1.5">
                                        <Gauge className={cn("h-3 w-3", isDark ? "text-slate-500" : "text-slate-400")} />
                                        <span className={cn("text-[10px] uppercase tracking-widest", isDark ? "text-slate-600" : "text-slate-400")}>
                                            Distance
                                        </span>
                                    </div>
                                    <p className={cn("mt-1 text-lg font-bold tabular-nums", isDark ? "text-slate-100" : "text-slate-800")}>
                                        {(mission.flown_meter / 1000).toFixed(1)}
                                        <span className={cn("ml-0.5 text-xs font-normal", isDark ? "text-slate-500" : "text-slate-400")}>km</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-0.5 px-6 py-5">

                        <SectionLabel label="Crew" isDark={isDark} />
                        <DetailRow
                            icon={User}
                            label="Pilot in Command"
                            isDark={isDark}
                            value={
                                mission.fk_pic_id > 0
                                    ? mission.pic_fullname
                                    : <span className={isDark ? "text-red-400" : "text-red-600"}>Not Assigned</span>
                            }
                        />

                        <div className="pt-4">
                            <SectionLabel label="Schedule" isDark={isDark} />
                        </div>
                        <DetailRow
                            icon={Calendar}
                            label="Scheduled Start"
                            isDark={isDark}
                            value={`${mission.date_start}  ${mission.time_start}`}
                        />
                        {mission.date_end && (
                            <DetailRow
                                icon={CheckCircle2}
                                label="Completed At"
                                isDark={isDark}
                                value={`${mission.date_end}  ${mission.time_end}`}
                                accent="emerald"
                            />
                        )}

                        {mission.mission_planning_code && (
                            <>
                                <div className="pt-4">
                                    <SectionLabel label="Mission Plan" isDark={isDark} />
                                </div>
                                <DetailRow
                                    icon={MapPin}
                                    label="Plan"
                                    isDark={isDark}
                                    value={`${mission.mission_planning_code}${mission.mission_planning_desc ? ` — ${mission.mission_planning_desc}` : ""}`}
                                />
                            </>
                        )}

                        {mission.mission_result_desc && (
                            <DetailRow
                                icon={CheckCircle2}
                                label="Result"
                                isDark={isDark}
                                value={
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[11px]",
                                            isDark
                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        )}
                                    >
                                        {mission.mission_result_desc}
                                    </Badge>
                                }
                            />
                        )}

                        {mission.mission_notes && (
                            <div className="pt-4">
                                <SectionLabel label="Notes" isDark={isDark} />
                                <p className={cn(
                                    "mt-2 rounded-lg border p-3 text-[12px] leading-relaxed",
                                    isDark
                                        ? "border-white/[0.05] bg-white/[0.02] text-slate-400"
                                        : "border-slate-200 bg-slate-50 text-slate-500"
                                )}>
                                    {mission.mission_notes}
                                </p>
                            </div>
                        )}

                        {flags.length > 0 && (
                            <div className="pt-4">
                                <div className={cn(
                                    "rounded-lg border p-4",
                                    isDark
                                        ? "border-red-500/20 bg-red-500/5"
                                        : "border-red-200 bg-red-50"
                                )}>
                                    <div className="mb-3 flex items-center gap-2">
                                        <AlertTriangle className={cn("h-3.5 w-3.5", isDark ? "text-red-400" : "text-red-500")} />
                                        <span className={cn("text-[10px] font-semibold uppercase tracking-widest", isDark ? "text-red-400" : "text-red-500")}>
                                            Safety Flags
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {flags.map((f) => (
                                            <Badge
                                                key={f.label}
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px]",
                                                    isDark
                                                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                                                        : "border-red-200 bg-white text-red-600"
                                                )}
                                            >
                                                {f.label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4">
                            <SectionLabel label="Operation Limits" isDark={isDark} />
                            <div className="mt-2">
                                <MissionLimitsPanel limitJson={mission.mission_planning_limit_json} isDark={isDark} />
                            </div>
                        </div>

                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}


function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
    return (
        <p className={cn(
            "mb-2 text-[10px] font-semibold uppercase tracking-widest",
            isDark ? "text-slate-600" : "text-slate-400"
        )}>
            {label}
        </p>
    );
}

function DetailRow({
    icon: Icon,
    label,
    value,
    isDark,
    accent,
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    isDark: boolean;
    accent?: "emerald";
}) {
    const iconColor = accent === "emerald"
        ? "text-emerald-500"
        : isDark ? "text-slate-600" : "text-slate-400";

    return (
        <div className={cn(
            "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
            isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-100/60"
        )}>
            <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", iconColor)} />
            <div className="min-w-0 flex-1">
                <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-slate-600" : "text-slate-400")}>
                    {label}
                </p>
                <div className={cn("mt-0.5 text-[13px]", isDark ? "text-slate-200" : "text-slate-700")}>
                    {value}
                </div>
            </div>
        </div>
    );
}