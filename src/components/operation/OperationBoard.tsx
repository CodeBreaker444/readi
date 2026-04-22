"use client";

import { useAuthorization } from "@/components/authorization/AuthorizationProvider";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Mission, MissionBoardData } from "@/config/types/operation";
import { toastAfterDccAction } from "@/lib/dcc-toast";
import { cn } from "@/lib/utils";
import type { DccCallbackResult } from "@/types/dcc-callback";
import axios from "axios";
import { Activity, Calendar, CheckCircle2, Clock, Crosshair, FileText, MapPin, Navigation, Tag, User, Wrench } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "../useTheme";
import { BoardHeader } from "./BoardHeader";
import { DailyDeclarationModal } from "./DailyDeclarationModal";
import { KanbanColumn } from "./KanbanColumn";
import { MaintenanceCycleModal } from "./MaintenanceCycleModal";
import { MissionCompleteModal } from "./MissionCompleteModal";
import { MissionLucProcedureModal } from "./MissionLucProcedureModal";

type ColumnId = "scheduled" | "in_progress" | "done";

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
    const { t } = useTranslation();
    const { requireAuthorization } = useAuthorization();
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
    const [lucMission, setLucMission] = useState<Mission | null>(null);
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

    const COLUMNS: {
        id: ColumnId;
        title: string;
        accentClass: { dark: string; light: string };
    }[] = [
        {
            id: "scheduled",
            title: t("operations.board.columns.scheduled"),
            accentClass: { dark: "border-blue-500/20", light: "border-blue-400/30" },
        },
        {
            id: "in_progress",
            title: t("operations.board.columns.inProgress"),
            accentClass: { dark: "border-amber-500/20", light: "border-amber-400/30" },
        },
        {
            id: "done",
            title: t("operations.board.columns.done"),
            accentClass: { dark: "border-emerald-500/20", light: "border-emerald-400/30" },
        },
    ];

    const loadBoard = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await axios.get(`/api/operation/board`);
            setBoard(res.data.data);
        } catch (e) {
            toast.error(t("operations.board.toast.loadError"), {
                description: e instanceof Error ? e.message : "Unknown error",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [t]);

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
            const { data } = await axios.post<{
                code: number;
                message?: string;
                dcc?: DccCallbackResult;
            }>("/api/operation/board/status", {
                mission_id: missionId,
                vehicle_id: mission.fk_vehicle_id,
                status_id: COLUMN_STATUS_MAP[target],
                workflow_mission_status: workflow,
                pilot_id: mission.fk_pic_id,
            });

            pendingDragRef.current = null;

            const mainTitle =
                target === "in_progress" ? t("operations.board.toast.missionStarted") : t("operations.board.toast.missionCompleted");
            
            const targetLabel = target === "in_progress" ? t("operations.board.columns.inProgress") : t("operations.board.columns.done");
            const moveDesc = `Mission #${missionId} → ${targetLabel}`;

            if (data.dcc) {
                toastAfterDccAction(`${mainTitle} — ${moveDesc}`, data.dcc);
            } else {
                toast.success(mainTitle, { description: moveDesc });
            }

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
                toast.error(t("operations.board.toast.statusUpdateFailed"), {
                    description: responseData?.message ?? "Unknown error",
                });
            }
        }
    }, [t]);

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
            toast.warning(t("operations.board.toast.revertSuccess"), {
                description: t("operations.board.toast.revertDesc"),
            });
        } catch {
            setBoard((prev) => ({
                ...prev,
                in_progress: prev.in_progress.filter((m) => m.mission_id !== mission.mission_id),
                done: [...prev.done, mission],
            }));
            toast.error(t("operations.board.toast.revertError"));
        }
    }, [t]);

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
            toast.warning(t("operations.board.toast.invalidMove"), {
                description: `${sourceColumn} ⇸ ${target}`,
            });
            return;
        }

        const mission = board[sourceColumn].find((m) => m.mission_id === missionId);
        if (!mission) return;

        try {
            await requireAuthorization({
                actionType: target === "in_progress" ? "mission_start" : "mission_complete",
                entityType: "mission",
                entityId:   String(missionId),
                label:      `${target === "in_progress" ? t("operations.board.toast.missionStarted") : t("operations.board.toast.missionCompleted")}: ${mission.mission_name ?? `#${missionId}`}`,
                details: {
                    mission_id:   missionId,
                    mission_code: mission.mission_name ?? mission.mission_id,
                    from:         sourceColumn,
                    to:           target,
                },
            });
        } catch {
            return; // user cancelled or wrong PIN
        }

        await executeMissionStatusUpdate(missionId, sourceColumn, target, mission);
    };

    return (
        <div className={cn("min-h-screen transition-colors duration-300", isDark ? "bg-[#080c12]" : "bg-slate-50")}>
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
                            onUpdateMaintenance={col.id === "done" ? (m) => setMaintenanceMission(m) : undefined}
                            onOpenLuc={(m) => setLucMission(m)}
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
                    onSkip={async () => {
                        const mission = completedMission;
                        try {
                            await requireAuthorization({
                                actionType: "mission_revert",
                                entityType: "mission",
                                entityId:   String(mission.mission_id),
                                label:      `Revert to In Progress: ${mission.mission_id ?? `#${mission.mission_id}`}`,
                                details:    { mission_id: mission.mission_id, mission_code: mission.mission_name ?? mission.mission_id },
                            });
                        } catch {
                            return;
                        }
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

            {lucMission && (
                <MissionLucProcedureModal
                    mission={lucMission}
                    isDark={isDark}
                    onClose={() => setLucMission(null)}
                />
            )}
        </div>
    );
}

function MissionDetailSheet({ mission, isDark, onClose }: { mission: Mission | null; isDark: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const isDone = mission?.fk_status_id === 3;
    
    const STATUS_LABEL: Record<string, { label: string; cls: string; darkCls: string }> = {
        "00": { label: t("operations.board.status.scheduled"), cls: "bg-blue-50 text-blue-700 border-blue-200", darkCls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
        "05": { label: t("operations.board.status.inProgress"), cls: "bg-amber-50 text-amber-700 border-amber-200", darkCls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
        "10": { label: t("operations.board.status.completed"), cls: "bg-emerald-50 text-emerald-700 border-emerald-200", darkCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
        "99": { label: t("operations.board.status.cancelled"), cls: "bg-red-50 text-red-700 border-red-200", darkCls: "bg-red-500/10 text-red-400 border-red-500/30" },
        "101": { label: t("operations.board.card.status.pending"), cls: "bg-slate-50 text-slate-600 border-slate-200", darkCls: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
    };

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
                        </SheetHeader>

                        <div className="space-y-6">
                            <section className="space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("operations.board.detail.timeline")}</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={cn("rounded-lg border p-3 space-y-1", isDark ? "bg-slate-800 border-slate-700" : "bg-muted/30")}>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {mission.fk_status_id === 2 ? t("operations.board.detail.startedAt") : t("operations.board.detail.scheduled")}</p>
                                        <p className="text-sm font-medium">{(mission.date_start || mission.time_start) ? `${mission.date_start} ${mission.time_start}`.trim() : "—"}</p>
                                    </div>
                                    {mission.date_end && (
                                        <div className={cn("rounded-lg border p-3 space-y-1", isDark ? "bg-slate-800 border-slate-700" : "bg-muted/30")}>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {t("operations.board.detail.completed")}</p>
                                            <p className="text-sm font-medium">{mission.date_end}</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <div className="h-px bg-border" />

                            <section className="space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("operations.board.detail.personnelEquipment")}</h3>
                                <div className="space-y-2">
                                    <DetailItem icon={<User className="h-3.5 w-3.5" />} label={t("operations.board.detail.pilotInCommand")} value={mission.pic_fullname} />
                                    <DetailItem icon={<Crosshair className="h-3.5 w-3.5" />} label={t("operations.board.detail.missionType")} value={mission.mission_type_desc} />
                                    <DetailItem icon={<Tag className="h-3.5 w-3.5" />} label={t("operations.board.detail.category")} value={mission.mission_category_desc} />
                                    <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label={t("operations.board.detail.planning")} value={mission.mission_planning_code} />
                                </div>
                            </section>

                            {isDone && (mission.flown_time != null || mission.flown_meter != null) && (
                                <>
                                    <div className="h-px bg-border" />
                                    <section className="space-y-3">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("operations.board.detail.flightResults")}</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {mission.flown_time != null && (
                                                <div className={cn("rounded-lg border p-3 space-y-1", isDark ? "bg-emerald-950/20 border-emerald-800" : "bg-emerald-50 border-emerald-200")}>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {t("operations.board.detail.duration")}</p>
                                                    <p className={cn("text-lg font-bold tabular-nums", isDark ? "text-emerald-400" : "text-emerald-700")}>{mission.flown_time} min</p>
                                                </div>
                                            )}
                                            {mission.flown_meter != null && (
                                                <div className={cn("rounded-lg border p-3 space-y-1", isDark ? "bg-emerald-950/20 border-emerald-800" : "bg-emerald-50 border-emerald-200")}>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Navigation className="h-3 w-3" /> {t("operations.board.detail.distance")}</p>
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
                                            <FileText className="h-3.5 w-3.5" /> {t("operations.board.detail.notes")}
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
                                    <DetailItem icon={<Activity className="h-3.5 w-3.5" />} label={t("operations.board.detail.missionGroup")} value={mission.mission_group_label} />
                                </>
                            )}
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

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

function BoardSkeleton({ isDark }: { isDark: boolean }) {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 m-4">
            {[0, 1, 2].map((i) => (
                <div key={i} className={cn("rounded-xl border p-3", isDark ? "border-white/6 bg-slate-950/50" : "border-slate-200 bg-white shadow-sm")}>
                    <div className={cn("mb-3 flex items-center justify-between border-b pb-3", isDark ? "border-white/6" : "border-slate-200")}>
                        <Skeleton className={cn("h-4 w-20", isDark ? "bg-white/6" : "bg-slate-100")} />
                        <Skeleton className={cn("h-5 w-5 rounded-full", isDark ? "bg-white/6" : "bg-slate-100")} />
                    </div>
                    <div className="space-y-3">
                        {[...Array(i === 1 ? 2 : 1)].map((_, j) => (
                            <Skeleton key={j} className={cn("h-44 w-full rounded-lg", isDark ? "bg-white/4" : "bg-slate-100")} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}