import { Badge } from "@/components/ui/badge";
import { Notification } from "@/config/types/notification";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ArrowUpDown, CheckCircle, Trash2 } from "lucide-react";

function fmtDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const columnHelper = createColumnHelper<Notification>();

export const getColumns = (
    handleMarkRead: (id: number) => void,
    setDeleteTarget: (n: Notification) => void
): ColumnDef<Notification, any>[] => [
    columnHelper.accessor("notification_id", {
        header: ({ column }) => (
            <button
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                ID <ArrowUpDown className="h-3 w-3" />
            </button>
        ),
        cell: (info) => (
            <span className="font-mono text-xs font-semibold text-gray-700">
                #{info.getValue()}
            </span>
        ),
        size: 80,
    }),

    columnHelper.accessor("message", {
        header: ({ column }) => (
            <button
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Message <ArrowUpDown className="h-3 w-3" />
            </button>
        ),
        cell: (info) => {
            const row = info.row.original;
            return (
                <div className="min-w-[200px]">
                    <p className="font-medium text-gray-900 leading-snug">{info.getValue() || "—"}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {row.sender_fullname} • {row.sender_profile_code}
                        {row.communication_general_id ? ` • ID: ${row.communication_general_id}` : ""}
                    </p>
                </div>
            );
        },
    }),

    columnHelper.accessor("procedure_name", {
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Procedure</span>,
        cell: (info) => <span className="text-sm text-gray-700">{info.getValue() || "—"}</span>,
        size: 160,
    }),

    columnHelper.accessor("created_at", {
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date</span>,
        cell: (info) => {
            const row = info.row.original;
            return (
                <div className="text-xs">
                    <p className="text-gray-700">{fmtDate(info.getValue())}</p>
                    {row.read_at && <p className="text-gray-400">Read: {fmtDate(row.read_at)}</p>}
                </div>
            );
        },
        size: 150,
    }),

    columnHelper.accessor("is_read", {
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>,
        cell: (info) =>
            info.getValue() === "Y" ? (
                <Badge variant="secondary" className="text-[10px] font-bold uppercase">Read</Badge>
            ) : (
                <Badge className="text-[10px] font-bold uppercase bg-amber-500 hover:bg-amber-600">Unread</Badge>
            ),
        size: 100,
    }),

    columnHelper.display({
        id: "actions",
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</span>,
        cell: ({ row }) => {
            const n = row.original;
            return (
                <div className="flex items-center justify-end gap-1">
                    {n.is_read === "N" && (
                        <button
                            onClick={() => handleMarkRead(n.notification_id)}
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Mark as Read"
                        >
                            <CheckCircle className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setDeleteTarget(n)}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            );
        },
        size: 100,
    }),
];