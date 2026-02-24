import { Badge } from "@/components/ui/badge";
import { MissionPlanningLogbookItem } from "@/config/types/logbook";
import { ColumnDef } from "@tanstack/react-table";
import { FlaskConical } from "lucide-react";

export const getColumns = (isDark: boolean): ColumnDef<MissionPlanningLogbookItem>[] => [
    {
        accessorKey: "mission_planning_id",
        header: "#",
        cell: ({ getValue }) => (
            <span className={`font-mono text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {String(getValue())}
            </span>
        ),
        size: 60,
    },
    {
        accessorKey: "client_name",
        header: "Client",
        cell: ({ getValue }) => (
            <span className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {String(getValue())}
            </span>
        ),
    },
    {
        accessorKey: "evaluation_desc",
        header: "Evaluation",
        cell: ({ getValue }) => (
            <span className={`text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {String(getValue() || "—")}
            </span>
        ),
    },
    {
        accessorKey: "planning_desc",
        header: "Planning",
        cell: ({ getValue }) => (
            <span className={`text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {String(getValue() || "—")}
            </span>
        ),
    },
    {
        accessorKey: "mission_planning_desc",
        header: "Mission Desc",
        cell: ({ getValue }) => (
            <span className={`text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {String(getValue() || "—")}
            </span>
        ),
    },
    {
        accessorKey: "mission_planning_code",
        header: "Code",
        cell: ({ getValue }) => (
            <code className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
            }`}>
                {String(getValue() || "—")}
            </code>
        ),
        size: 100,
    },
    {
        accessorKey: "mission_planning_ver",
        header: "Version",
        cell: ({ getValue }) => (
            <Badge variant={isDark ? "outline" : "secondary"} className={`text-xs ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                v{String(getValue())}
            </Badge>
        ),
        size: 70,
    },
    {
        accessorKey: "tot_test",
        header: "Tests",
        cell: ({ getValue }) => {
            const count = Number(getValue()) || 0;
            return (
                <div className="flex items-center gap-1.5">
                    <FlaskConical className={`h-3.5 w-3.5 ${isDark ? "text-indigo-300" : "text-indigo-400"}`} />
                    <span className={`font-semibold tabular-nums ${
                        count > 0 
                            ? (isDark ? " text-white" : "text-indigo-600") 
                            : ""
                    }`}>
                        {count}
                    </span>
                </div>
            );
        },
        size: 80,
    },
];