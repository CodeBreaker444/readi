import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Mission } from "@/config/types/operation";
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Crosshair,
    Gauge,
    MapPin,
    User
} from "lucide-react";
import { MissionLimitsPanel } from "./MissionLimitsPanel";

interface Props {
    mission: Mission | null;
    open: boolean;
    onClose: () => void;
    isDark: boolean;
}

function InfoRow({
    icon: Icon,
    label,
    value,
    isDark = true,
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    isDark?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <div className="min-w-0">
                <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                    {label}
                </p>
                <div className={`text-[13px] ${isDark ? "text-slate-200" : "text-slate-800"}`}>{value}</div>
            </div>
        </div>
    );
}

export function MissionDetailSheet({ mission, open, onClose, isDark }: Props) {
    if (!mission) return null;

    const flags = [
        { label: "Incident", active: mission.incident_flag === 1 },
        { label: "RTH Unplanned", active: mission.rth_unplanned === 1 },
        { label: "Link Loss", active: mission.link_loss === 1 },
        { label: "Deviation", active: mission.deviation_flag === 1 },
    ].filter((f) => f.active);

    return (
        <Sheet open={open} onOpenChange={(o: boolean) => !o && onClose()}>
            <SheetContent
                side="right"
                className={`w-full overflow-y-auto sm:max-w-md ${
                    isDark
                        ? "border-white/[0.06] bg-slate-950"
                        : "border-slate-200 bg-white"
                }`}
            >
                <SheetHeader className="pb-4">
                    <SheetTitle className={`text-left text-base ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        Mission #{mission.mission_id}
                    </SheetTitle>
                    <SheetDescription className={`text-left text-[12px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {mission.vehicle_code} — {mission.client_name}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 text-sm">
                    <div className="space-y-3">
                        <InfoRow
                            icon={User}
                            label="Pilot in Command"
                            isDark={isDark}
                            value={
                                mission.fk_pic_id > 0 ? (
                                    mission.pic_fullname
                                ) : (
                                    <span className={isDark ? "text-red-400" : "text-red-600"}>Not Assigned</span>
                                )
                            }
                        />
                        <InfoRow
                            icon={Crosshair}
                            label="Category / Type"
                            isDark={isDark}
                            value={`${mission.mission_category_desc} · ${mission.mission_type_desc}`}
                        />
                        <InfoRow
                            icon={Calendar}
                            label="Scheduled Start"
                            isDark={isDark}
                            value={`${mission.date_start} ${mission.time_start}`}
                        />
                        {mission.date_end && (
                            <InfoRow
                                icon={CheckCircle2}
                                label="Completed"
                                isDark={isDark}
                                value={`${mission.date_end} ${mission.time_end}`}
                            />
                        )}
                        {(mission.flown_time != null || mission.flown_meter != null) && (
                            <InfoRow
                                icon={Gauge}
                                label="Flight Stats"
                                isDark={isDark}
                                value={
                                    <span>
                                        {mission.flown_time != null && `${mission.flown_time} min`}
                                        {mission.flown_time != null && mission.flown_meter != null && " · "}
                                        {mission.flown_meter != null &&
                                            `${(mission.flown_meter / 1000).toFixed(1)} km`}
                                    </span>
                                }
                            />
                        )}
                        {mission.mission_planning_code && (
                            <InfoRow
                                icon={MapPin}
                                label="Mission Plan"
                                isDark={isDark}
                                value={`${mission.mission_planning_code} — ${mission.mission_planning_desc}`}
                            />
                        )}
                        {mission.mission_result_desc && (
                            <InfoRow
                                icon={CheckCircle2}
                                label="Result"
                                isDark={isDark}
                                value={
                                    <Badge
                                        variant="outline"
                                        className={isDark
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-400"
                                            : "border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700"
                                        }
                                    >
                                        {mission.mission_result_desc}
                                    </Badge>
                                }
                            />
                        )}
                    </div>

                    {mission.mission_notes && (
                        <>
                            <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />
                            <div>
                                <p className={`mb-1 text-[10px] uppercase tracking-wider ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                    Notes
                                </p>
                                <p className={`text-[12px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    {mission.mission_notes}
                                </p>
                            </div>
                        </>
                    )}

                    {flags.length > 0 && (
                        <>
                            <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />
                            <div>
                                <div className="mb-2 flex items-center gap-1.5">
                                    <AlertTriangle className={`h-3.5 w-3.5 ${isDark ? "text-red-400" : "text-red-500"}`} />
                                    <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-red-400" : "text-red-500"}`}>
                                        Safety Flags
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {flags.map((f) => (
                                        <Badge
                                            key={f.label}
                                            variant="outline"
                                            className={isDark
                                                ? "border-red-500/30 bg-red-500/10 text-[10px] text-red-400"
                                                : "border-red-200 bg-red-50 text-[10px] text-red-600"
                                            }
                                        >
                                            {f.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />
                    <MissionLimitsPanel limitJson={mission.mission_planning_limit_json} isDark={isDark} />
                </div>
            </SheetContent>
        </Sheet>
    );
}