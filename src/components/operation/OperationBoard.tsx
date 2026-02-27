"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from '../../components/ui/skeleton';
import { Mission, MissionBoardData } from '../../config/types/operation';
import { useTheme } from "../useTheme";
import { BoardHeader } from "./BoardHeader";
import { KanbanColumn } from "./KanbanColumn";
import { MissionDetailSheet } from "./MissionDetailSheet";

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
    const dragMeta = useRef<{
        missionId: number;
        sourceColumn: ColumnId;
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

        const sourceMissions = board[sourceColumn];
        const mission = sourceMissions.find((m) => m.mission_id === missionId);
        if (!mission) return;

        setBoard((prev) => ({
            ...prev,
            [sourceColumn]: prev[sourceColumn].filter((m) => m.mission_id !== missionId),
            [target]: [...prev[target], { ...mission, fk_status_id: COLUMN_STATUS_MAP[target] }],
        }));

        const workflow = target === "in_progress" ? "_START" : "_END";

        const result = await axios.post('/api/operation/board/status', {
            mission_id: missionId,
            vehicle_id: mission.fk_vehicle_id,
            status_id: COLUMN_STATUS_MAP[target],
            workflow_mission_status: workflow,
        });

        if (result.status === 422) {
            setBoard((prev) => ({
                ...prev,
                [target]: prev[target].filter((m) => m.mission_id !== missionId),
                [sourceColumn]: [...prev[sourceColumn], mission],
            }));

            if (result.data.check_daily_declaration === "N") {
                toast.warning("Daily declaration required", {
                    description: "Please complete your daily declaration before starting a mission.",
                });
            } else {
                toast.error("Status update failed", { description: result.data.message });
            }
        } else {
            toast.success(
                target === "in_progress" ? "Mission started" : "Mission completed",
                { description: `Mission #${missionId} moved to ${target.replace("_", " ")}` }
            );
        }
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
                            isDragOver={dragOverColumn === col.id}
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDragLeave={handleDragLeave}
                            isDark={isDark}
                        />
                    ))}
                </div>
            )}

            <MissionDetailSheet
                mission={selectedMission}
                open={!!selectedMission}
                onClose={() => setSelectedMission(null)}
                isDark={isDark}
            />
        </div>
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
                            ? "border-white/[0.06] bg-slate-950/50"
                            : "border-slate-200 bg-white shadow-sm"
                    }`}
                >
                    <div className={`mb-3 flex items-center justify-between border-b pb-3 ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                        <Skeleton className={`h-4 w-20 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
                        <Skeleton className={`h-5 w-5 rounded-full ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
                    </div>
                    <div className="space-y-3">
                        {[...Array(i === 1 ? 2 : 1)].map((_, j) => (
                            <Skeleton
                                key={j}
                                className={`h-44 w-full rounded-lg ${isDark ? "bg-white/[0.04]" : "bg-slate-100"}`}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}