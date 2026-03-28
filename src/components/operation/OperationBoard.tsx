"use client";

import axios from "axios";
import { Activity, Calendar, CheckCircle2, Clock, Crosshair, FileText, MapPin, Navigation, Tag, User, Wrench } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Mission, MissionBoardData } from "@/config/types/operation";
import { cn } from "@/lib/utils";
import { useTheme } from "../useTheme";
import { BoardHeader } from "./BoardHeader";
import { DailyDeclarationModal } from "./DailyDeclarationModal";
import { KanbanColumn } from "./KanbanColumn";
import { MaintenanceCycleModal } from "./MaintenanceCycleModal";
import { MissionCompleteModal } from "./MissionCompleteModal";

type ColumnId = "scheduled" | "in_progress" | "done";

const COLUMNS: {
    id: ColumnId;
    title: string;
    accentClass: { dark: string; light: string };
}[] = [
    {
        id: "scheduled",
        title: "Scheduled",
        accentClass: { dark: "border-blue-500/20", light: "border-blue-400/30" },
    },
    {
        id: "in_progress",
        title: "In Progress",
        accentClass: { dark: "border-amber-500/20", light: "border-amber-400/30" },
    },
    {
        id: "done",
        title: "Done",
        accentClass: { dark: "border-emerald-500/20", light: "border-emerald-400/30" },
    },
];

const COLUMN_STATUS_MAP: Record<ColumnId, number> = {
    scheduled: 1,
    in_progress: 2,
    done: 3,
};

const VALID_TRANSITIONS: Record<string, ColumnId[]> = {
    scheduled: ["in_progress"],
    in_progress: ["done"],
    done: [],
};

export function OperationBoard() {
    const { isDark } = useTheme();
    const [board, setBoard] = useState<MissionBoardData>({
        scheduled: [],
        in_progress: [],
        done: [],
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [completedMission, setCompletedMission] = useState<Mission | null>(null);
    const [maintenanceMission, setMaintenanceMission] = useState<Mission | null>(null);
    const [showDeclarationModal, setShowDeclarationModal] = useState(false);
    const dragMeta = useRef<{
        missionId: number;
        sourceColumn: ColumnId;
    } | null>(null);
    const pendingDragRef = useRef<{
        missionId: number;
        sourceColumn: ColumnId;
        target: ColumnId;
        mission: Mission;
    } | null>(null);

    const loadBoard = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await axios.get(`/api/operation/board`);
            setBoard(res.data.data);
        } catch (e) {
            toast.error("Failed to load board", {
                description: e instanceof Error ? e.message : "Unknown error",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadBoard();
    }, [loadBoard]);

    const handleDragStart = (e: React.DragEvent, missionId: number, sourceColumn: string) => {
        dragMeta.current = { missionId, sourceColumn: sourceColumn as ColumnId };
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
        e.preventDefault();
        setDragOverColumn(columnId);
    };

    const handleDragLeave = () => setDragOverColumn(null);

    const executeMissionStatusUpdate = useCallback(async (
        missionId: number,
        sourceColumn: ColumnId,
        target: ColumnId,
        mission: Mission,
    ) => {
        const workflow = target === "in_progress" ? "_START" : "_END";

        setBoard((prev) => ({
            ...prev,
            [sourceColumn]: prev[sourceColumn].filter((m) => m.mission_id !== missionId),
            [target]: [...prev[target], { ...mission, fk_status_id: COLUMN_STATUS_MAP[target] }],
        }));

        try {
            await axios.post('/api/operation/board/status', {
                mission_id: missionId,
                vehicle_id: mission.fk_vehicle_id,
                status_id: COLUMN_STATUS_MAP[target],
                workflow_mission_status: workflow,
                pilot_id: mission.fk_pic_id,
            });

            pendingDragRef.current = null;

            toast.success(
                target === "in_progress" ? "Mission started" : "Mission completed",
                { description: `Mission #${missionId} moved to ${target.replace("_", " ")}` }
            );

            if (target === "done") {
                setCompletedMission({ ...mission, fk_status_id: COLUMN_STATUS_MAP[target] });
            }
        } catch (err: any) {
            setBoard((prev) => ({
                ...prev,
                [target]: prev[target].filter((m) => m.mission_id !== missionId),
                [sourceColumn]: [...prev[sourceColumn], mission],
            }));

            const responseData = err?.response?.data;

            if (responseData?.check_daily_declaration === "N") {
                pendingDragRef.current = { missionId, sourceColumn, target, mission };
                setShowDeclarationModal(true);
            } else {
                toast.error("Status update failed", {
                    description: responseData?.message ?? "Unknown error",
                });
            }
        }
    }, []);

    const handleRevertMission = useCallback(async (mission: Mission) => {
        setBoard((prev) => ({
            ...prev,
            done: prev.done.filter((m) => m.mission_id !== mission.mission_id),
            in_progress: [...prev.in_progress, { ...mission, fk_status_id: COLUMN_STATUS_MAP.in_progress }],
        }));
        setCompletedMission(null);
        try {
            await axios.post('/api/operation/board/status', {
                mission_id: mission.mission_id,
                vehicle_id: mission.fk_vehicle_id,
                status_id: COLUMN_STATUS_MAP.in_progress,
                workflow_mission_status: "_REVERT",
                pilot_id: mission.fk_pic_id,
            });
            toast.warning("Mission moved back to In Progress", {
                description: "Please update the maintenance cycle to complete the mission.",
            });
        } catch {
            setBoard((prev) => ({
                ...prev,
                in_progress: prev.in_progress.filter((m) => m.mission_id !== mission.mission_id),
                done: [...prev.done, mission],
            }));
            toast.error("Failed to revert mission status");
        }
    }, []);

    const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
        e.preventDefault();
        setDragOverColumn(null);

        const meta = dragMeta.current;
        if (!meta) return;
        const { missionId, sourceColumn } = meta;
        dragMeta.current = null;

        const target = targetColumn as ColumnId;
        if (sourceColumn === target) return;

        const allowed = VALID_TRANSITIONS[sourceColumn] ?? [];
        if (!allowed.includes(target)) {
            toast.warning("Invalid move", {
                description: `Cannot move from ${sourceColumn.replace("_", " ")} to ${target.replace("_", " ")}`,
            });
            return;
        }

        const mission = board[sourceColumn].find((m) => m.mission_id === missionId);
        if (!mission) return;

        await executeMissionStatusUpdate(missionId, sourceColumn, target, mission);
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-[#080c12]" : "bg-slate-50"} `}>
            <BoardHeader onRefresh={() => loadBoard(true)} isRefreshing={refreshing} isDark={isDark} />

            {loading ? (
                <BoardSkeleton isDark={isDark} />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 m-4">
                    {COLUMNS.map((col) => (
                        <KanbanColumn
                            key={col.id}
                            title={col.title}
                            count={board[col.id].length}
                            missions={board[col.id]}
                            accentClass={isDark ? col.accentClass.dark : col.accentClass.light}
                            columnId={col.id}
                            onDragStart={handleDragStart}
                            onDrop={handleDrop}
                            onViewDetails={(m) => setSelectedMission(m)}
                            onUpdateMaintenance={(m) => setMaintenanceMission(m)}
                            isDragOver={dragOverColumn === col.id}
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDragLeave={handleDragLeave}
                            isDark={isDark}
                        />
                    ))}
                </div>
            )}

            <DailyDeclarationModal
                open={showDeclarationModal}
                onClose={() => {
                    setShowDeclarationModal(false);
                    pendingDragRef.current = null;
                }}
                onSuccess={() => {
                    setShowDeclarationModal(false);
                    const pending = pendingDragRef.current;
                    if (pending) {
                        executeMissionStatusUpdate(
                            pending.missionId,
                            pending.sourceColumn,
                            pending.target,
                            pending.mission,
                        );
                    }
                }}
                isDark={isDark}
            />

            {completedMission && (
                <MissionCompleteModal
                    open={!!completedMission}
                    onClose={() => {
                        setCompletedMission(null);
                        loadBoard(true);
                    }}
                    onSkip={() => {
                        const mission = completedMission;
                        setCompletedMission(null);
                        handleRevertMission(mission);
                    }}
                    toolId={completedMission.fk_vehicle_id}
                    missionId={completedMission.mission_id}
                    isDark={isDark}
                />
            )}

            {maintenanceMission && (
                <MaintenanceCycleModal
                    open={!!maintenanceMission}
                    onClose={() => {
                        setMaintenanceMission(null);
                        loadBoard(true);
                    }}
                    toolId={maintenanceMission.fk_vehicle_id}
                    missionId={maintenanceMission.mission_id}
                    isDark={isDark}
                />
            )}

            <MissionDetailSheet
                mission={selectedMission}
                isDark={isDark}
                onClose={() => setSelectedMission(null)}
            />
        </div>
    );
}

const STATUS_LABEL: Record<string, { label: string; cls: string; darkCls: string }> = {
    "00": { label: "Scheduled", cls: "bg-blue-50 text-blue-700 border-blue-200", darkCls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    "05": { label: "In Progress", cls: "bg-amber-50 text-amber-700 border-amber-200", darkCls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    "10": { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", darkCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    "99": { label: "Cancelled", cls: "bg-red-50 text-red-700 border-red-200", darkCls: "bg-red-500/10 text-red-400 border-red-500/30" },
};

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value || "—"}</p>
            </div>
        </div>
    );
}

function MissionDetailSheet({ mission, isDark, onClose }: { mission: Mission | null; isDark: boolean; onClose: () => void }) {
    const isDone = mission?.fk_status_id === 3;
    const statusCfg = mission ? (STATUS_LABEL[mission.mission_status_code] ?? STATUS_LABEL["00"]) : null;

    return (
        <Sheet open={!!mission} onOpenChange={(o) => { if (!o) onClose(); }}>
            <SheetContent
                className={cn("w-full sm:max-w-md overflow-y-auto p-6", isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white")}
                side="right"
            >
                {mission && statusCfg && (
                    <>
                        <SheetHeader className="mb-6 pb-4 border-b">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    #{mission.mission_id}
                                </span>
                                <Badge variant="outline" className={cn("text-xs", isDark ? statusCfg.darkCls : statusCfg.cls)}>
                                    {statusCfg.label}
                                </Badge>
                                {mission.maintenance_status && mission.maintenance_status !== "OK" && (
                                    <Badge variant="outline" className={cn("text-xs", isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")}>
                                        <Wrench className="h-3 w-3 mr-1" />
                                        {mission.maintenance_status.replace("_", " ")}
                                    </Badge>
                                )}
                            </div>
                            <SheetTitle className={cn("text-left text-base mt-1", isDark ? "text-white" : "")}>
                                {mission.vehicle_code}{mission.vehicle_desc ? ` — ${mission.vehicle_desc}` : ""}
                            </SheetTitle>
                            {mission.client_name && (
                                <p className="text-sm text-muted-foreground text-left">{mission.client_name}</p>
                            )}
                        </SheetHeader>

                        <div className="space-y-6">
                            <section className="space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={cn("rounded-lg border p-3 space-y-1", isDark ? "bg-slate-800 border-slate-700" : "bg-muted/30")}>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Scheduled</p>
                                        <p className="text-sm font-medium">{mission.date_start || "—"}</p>
                                        {mission.time_start && <p className="text-xs text-muted-foreground">{mission.time_start}</p>}
                                    </div>
                                    {mission.date_end && (
                                        <div className={cn("rounded-lg border p-3 space-y-1", isDark ? "bg-slate-800 border-slate-700" : "bg-muted/30")}>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Completed</p>
                                            <p className="text-sm font-medium">{mission.date_end}</p>
                                            {mission.time_end && <p className="text-xs text-muted-foreground">{mission.time_end}</p>}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <div className="h-px bg-border" />

                            <section className="space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personnel &amp; Equipment</h3>
                                <div className="space-y-2">
                                    <DetailItem icon={<User className="h-3.5 w-3.5" />} label="Pilot in Command" value={mission.pic_fullname} />
                                    {mission.mission_type_desc && (
                                        <DetailItem icon={<Crosshair className="h-3.5 w-3.5" />} label="Mission Type" value={mission.mission_type_desc} />
                                    )}
                                    {mission.mission_category_desc && (
                                        <DetailItem icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={mission.mission_category_desc} />
                                    )}
                                    {mission.mission_planning_code && (
                                        <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Planning" value={`${mission.mission_planning_code}${mission.mission_planning_desc ? ` · ${mission.mission_planning_desc}` : ""}`} />
                                    )}
                                </div>
                            </section>

                            {isDone && (mission.flown_time != null || mission.flown_meter != null) && (
                                <>
                                    <div className="h-px bg-border" />
                                    <section className="space-y-3">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flight Results</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {mission.flown_time != null && (
                                                <div className={cn("rounded-lg border p-3 space-y-1", isDark ? "bg-emerald-950/20 border-emerald-800" : "bg-emerald-50 border-emerald-200")}>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Duration</p>
                                                    <p className={cn("text-lg font-bold tabular-nums", isDark ? "text-emerald-400" : "text-emerald-700")}>{mission.flown_time} min</p>
                                                </div>
                                            )}
                                            {mission.flown_meter != null && (
                                                <div className={cn("rounded-lg border p-3 space-y-1", isDark ? "bg-emerald-950/20 border-emerald-800" : "bg-emerald-50 border-emerald-200")}>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Navigation className="h-3 w-3" /> Distance</p>
                                                    <p className={cn("text-lg font-bold tabular-nums", isDark ? "text-emerald-400" : "text-emerald-700")}>{(mission.flown_meter / 1000).toFixed(1)} km</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </>
                            )}

                            {mission.mission_notes && (
                                <>
                                    <div className="h-px bg-border" />
                                    <section className="space-y-3">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5" /> Notes
                                        </h3>
                                        <div className={cn("rounded-lg border p-3", isDark ? "bg-slate-800 border-slate-700" : "bg-muted/30")}>
                                            <p className="text-sm whitespace-pre-wrap">{mission.mission_notes}</p>
                                        </div>
                                    </section>
                                </>
                            )}

                            {mission.mission_group_label && (
                                <>
                                    <div className="h-px bg-border" />
                                    <DetailItem icon={<Activity className="h-3.5 w-3.5" />} label="Mission Group" value={mission.mission_group_label} />
                                </>
                            )}
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

function BoardSkeleton({ isDark }: { isDark: boolean }) {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 m-4">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className={`rounded-xl border p-3 ${
                        isDark
                            ? "border-white/6 bg-slate-950/50"
                            : "border-slate-200 bg-white shadow-sm"
                    }`}
                >
                    <div className={`mb-3 flex items-center justify-between border-b pb-3 ${isDark ? "border-white/6" : "border-slate-200"}`}>
                        <Skeleton className={`h-4 w-20 ${isDark ? "bg-white/6" : "bg-slate-100"}`} />
                        <Skeleton className={`h-5 w-5 rounded-full ${isDark ? "bg-white/6" : "bg-slate-100"}`} />
                    </div>
                    <div className="space-y-3">
                        {[...Array(i === 1 ? 2 : 1)].map((_, j) => (
                            <Skeleton
                                key={j}
                                className={`h-44 w-full rounded-lg ${isDark ? "bg-white/4" : "bg-slate-100"}`}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}