"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import {
  CheckCheck,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  RefreshCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

import ExportButtons from "@/components/system/ExportButtons";
import { getColumns } from "@/components/tables/NotificationColumn";
import { TablePagination } from "@/components/tables/Pagination";
import { useTheme } from "@/components/useTheme";
import { Notification, NotificationListFilters } from "@/config/types/notification";
import axios from "axios";
import {
  HiOutlineBell,
  HiOutlinePaperAirplane,
  HiOutlineUsers,
  HiOutlineAdjustments,
  HiOutlineInformationCircle,
} from "react-icons/hi";

// ─── Tab definitions ──────────────────────────────────────────────────────────

interface TabDef {
  key: string;        // URL ?tab= value
  label: string;
  icon: React.ElementType;
  match: (procedureName: string | undefined) => boolean;
}

const TABS: TabDef[] = [
  {
    key: "all",
    label: "All",
    icon: HiOutlineBell,
    match: () => true,
  },
  {
    key: "maintenance",
    label: "Maintenance",
    icon: HiOutlineAdjustments,
    match: (p) => !!p && p.toUpperCase().includes("MAINTENANCE"),
  },
  {
    key: "mission",
    label: "Mission",
    icon: HiOutlinePaperAirplane,
    match: (p) => !!p && p.toUpperCase().includes("MISSION"),
  },
  {
    key: "general",
    label: "General",
    icon: HiOutlineBell,
    match: (p) => !p || p.toUpperCase().includes("GENERAL"),
  },
  {
    key: "assignment",
    label: "Assignment",
    icon: HiOutlineUsers,
    match: (p) =>
      !!p && (p.toUpperCase().includes("ASSIGNMENT") || p.toUpperCase().includes("ASSIGN")),
  },
  {
    key: "other",
    label: "Other",
    icon: HiOutlineInformationCircle,
    match: (p) => {
      if (!p) return false;
      const u = p.toUpperCase();
      return (
        !u.includes("MAINTENANCE") &&
        !u.includes("MISSION") &&
        !u.includes("GENERAL") &&
        !u.includes("ASSIGNMENT") &&
        !u.includes("ASSIGN")
      );
    },
  },
];

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function NotificationsInner() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") ?? "all";
  const [activeTab, setActiveTab] = useState(
    TABS.find((t) => t.key === initialTab)?.key ?? "all"
  );

  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const [serverFilters, setServerFilters] = useState<
    Omit<NotificationListFilters, "user_id">
  >({
    status: "",
    procedure_name: "",
    search: "",
    date_from: "",
    date_to: "",
    limit: 200,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const loadData = useCallback(
    async (filters: Omit<NotificationListFilters, "user_id">) => {
      setLoading(true);
      try {
        const res = await axios.post("/api/notification/list", filters);
        if (!res.data) throw new Error(t("notifications.errors.noData"));
        setData(res.data.data);
      } catch (err: any) {
        toast.error(err.message ?? t("notifications.errors.load"));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData(serverFilters);
  }, []);

  // Reset to page 0 when tab changes
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [activeTab]);

  function handleSearch() {
    loadData(serverFilters);
  }

  const handleMarkRead = async (notification_id: number) => {
    try {
      await axios.post("/api/notification/mark-read", { notification_id });
      setData((prev) =>
        prev.map((n) =>
          n.notification_id === notification_id
            ? { ...n, is_read: "Y", read_at: new Date().toISOString() }
            : n
        )
      );
      toast.success(t("notifications.success.markedRead"));
    } catch (err: any) {
      toast.error(err.message ?? t("notifications.errors.markRead"));
    }
  };

  async function handleMarkAllRead() {
    try {
      await axios.post("/api/notification/mark-all-read");
      setData((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: "Y" as const,
          read_at: n.read_at ?? new Date().toISOString(),
        }))
      );
      toast.success(t("notifications.success.markedAllRead"));
    } catch (err: any) {
      toast.error(err.message ?? t("notifications.errors.markAllRead"));
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.post("/api/notification/delete", {
        notification_id: deleteTarget.notification_id,
      });
      setData((prev) =>
        prev.filter((n) => n.notification_id !== deleteTarget.notification_id)
      );
      toast.success(t("notifications.success.deleted"));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message ?? t("notifications.errors.delete"));
    } finally {
      setDeleting(false);
    }
  };

  // ── Tab-filtered data ──
  const activeTabDef = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const filteredData = useMemo(
    () => data.filter((n) => activeTabDef.match(n.procedure_name)),
    [data, activeTab]
  );

  // ── Per-tab counts ──
  const tabCounts = useMemo(() => {
    const counts: Record<string, { total: number; unread: number }> = {};
    for (const tab of TABS) {
      const matching = data.filter((n) => tab.match(n.procedure_name));
      counts[tab.key] = {
        total: matching.length,
        unread: matching.filter((n) => n.is_read === "N").length,
      };
    }
    return counts;
  }, [data]);

  const unreadCount = filteredData.filter((n) => n.is_read === "N").length;
  const totalUnread = data.filter((n) => n.is_read === "N").length;

  const columns = useMemo(() => getColumns(handleMarkRead, setDeleteTarget), []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  });

  const DM = "'DM Sans', system-ui, sans-serif";

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: DM }}>
      {/* ── Header ── */}
      <div
        className={`top-0 z-10 backdrop-blur-md transition-colors ${
          isDark
            ? "bg-slate-900/80 border-b border-slate-800 text-white"
            : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        } px-6 py-4 mb-4`}
      >
        <div className="mx-auto max-w-450 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`font-semibold text-base tracking-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {t("notifications.title")}
                </h1>
                {totalUnread > 0 && (
                  <Badge className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] rounded-full px-1.5 h-4 min-w-4 flex items-center justify-center border-none">
                    {totalUnread}
                  </Badge>
                )}
              </div>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {t("notifications.summary", {
                  total: data.length,
                  unread: totalUnread,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={loading || totalUnread === 0}
              className={`h-8 gap-1.5 text-xs cursor-pointer transition-all ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {t("notifications.markAllRead")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(serverFilters)}
              disabled={loading}
              className={`h-8 gap-1.5 text-xs cursor-pointer transition-all ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("notifications.reload")}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className="px-4 mb-2">
        <div
          className={`flex items-center gap-1 border-b overflow-x-auto ${
            isDark ? "border-slate-800" : "border-slate-200"
          }`}
          style={{ scrollbarWidth: "none" }}
        >
          {TABS.map((tab) => {
            const counts = tabCounts[tab.key] ?? { total: 0, unread: 0 };
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            // Hide tabs with no data (except "All")
            if (tab.key !== "all" && counts.total === 0 && !loading) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] font-medium border-b-2 whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 ${
                  isActive
                    ? isDark
                      ? "border-violet-500 text-violet-400"
                      : "border-violet-600 text-violet-700"
                    : isDark
                      ? "border-transparent text-slate-500 hover:text-slate-300"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <TabIcon size={13} />
                {tab.label}
                {counts.total > 0 && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      counts.unread > 0
                        ? "bg-red-500 text-white"
                        : isDark
                          ? "bg-slate-700 text-slate-400"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {counts.unread > 0 ? counts.unread : counts.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filters ── */}
      <Card className="mx-4 mb-2">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("notifications.filters.status")}
              </label>
              <Select
                value={serverFilters.status || "all"}
                onValueChange={(v) =>
                  setServerFilters((p) => ({
                    ...p,
                    status: v === "all" ? "" : (v as "READ" | "UNREAD"),
                  }))
                }
              >
                <SelectTrigger className="h-9 cursor-pointer">
                  <SelectValue placeholder={t("notifications.filters.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("notifications.filters.all")}</SelectItem>
                  <SelectItem value="UNREAD">{t("notifications.filters.unread")}</SelectItem>
                  <SelectItem value="READ">{t("notifications.filters.read")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("notifications.filters.from")}
              </label>
              <Input
                type="date"
                className="h-9 cursor-pointer"
                value={serverFilters.date_from}
                onChange={(e) =>
                  setServerFilters((p) => ({ ...p, date_from: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("notifications.filters.to")}
              </label>
              <Input
                type="date"
                className="h-9 cursor-pointer"
                value={serverFilters.date_to}
                onChange={(e) =>
                  setServerFilters((p) => ({ ...p, date_to: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("notifications.filters.searchMessage")}
              </label>
              <Input
                className="h-9"
                placeholder={t("common.search")}
                value={serverFilters.search}
                onChange={(e) =>
                  setServerFilters((p) => ({ ...p, search: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>

          <div className="flex justify-end mt-3 gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                const reset = {
                  status: "" as const,
                  procedure_name: "",
                  search: "",
                  date_from: "",
                  date_to: "",
                  limit: 200,
                };
                setServerFilters(reset);
                loadData(reset);
              }}
            >
              {t("notifications.filters.reset")}
            </Button>
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 cursor-pointer"
            >
              {t("common.search")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card className="mx-4 mb-4">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold">
              {activeTabDef.label} notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-[10px] font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </CardTitle>
            <Input
              className="h-8 w-48 text-xs"
              placeholder={t("notifications.filters.filterResults")}
              value={(table.getColumn("message")?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn("message")?.setFilterValue(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="w-full">
              <div
                className={`flex items-center border-b ${
                  isDark
                    ? "bg-slate-800/50 border-slate-700"
                    : "bg-slate-50 border-slate-200"
                } px-4 py-3`}
              >
                <Skeleton className="h-4 w-8 mr-12" />
                <Skeleton className="h-4 w-48 mr-24" />
                <Skeleton className="h-4 w-24 mr-20" />
                <Skeleton className="h-4 w-24 mr-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center px-4 py-4">
                    <div className="w-17.5 shrink-0"><Skeleton className="h-3 w-10" /></div>
                    <div className="w-75 shrink-0 mr-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <div className="w-35 shrink-0 mr-4"><Skeleton className="h-5 w-20 rounded-full" /></div>
                    <div className="w-30 shrink-0 mr-4">
                      <Skeleton className="h-3 w-16 mb-1.5" />
                      <Skeleton className="h-2 w-10" />
                    </div>
                    <div className="w-25 shrink-0"><Skeleton className="h-5 w-16 rounded-full" /></div>
                    <div className="flex-1 flex justify-end gap-2">
                      <Skeleton className="h-7 w-7 rounded" />
                      <Skeleton className="h-7 w-7 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                        {hg.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            style={{ width: header.getSize() }}
                            className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <span className="text-muted-foreground">
                                  {header.column.getIsSorted() === "asc" ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : header.column.getIsSorted() === "desc" ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                  )}
                                </span>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="text-center text-muted-foreground py-12"
                        >
                          {t("notifications.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className={
                            row.original.is_read === "N"
                              ? "bg-amber-50/60 hover:bg-amber-50"
                              : "hover:bg-muted/20"
                          }
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between px-2">
                <ExportButtons
                  filename={t("notifications.title")}
                  headers={["ID", "Message", "Procedure", "Read", "Sender", "Role", "Created At", "Read At"]}
                  rows={table
                    .getFilteredRowModel()
                    .rows.map((r) => {
                      const n = r.original as Notification;
                      return [
                        n.notification_id, n.message, n.procedure_name,
                        n.is_read, n.sender_fullname ?? "", n.sender_profile_code ?? "",
                        n.created_at, n.read_at ?? "",
                      ];
                    })}
                />
                <TablePagination table={table} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Delete dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notifications.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("notifications.deleteDescriptionPrefix")}{" "}
              <strong>#{deleteTarget?.notification_id}</strong>.{" "}
              {t("notifications.deleteDescriptionSuffix")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? t("knowledge.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Page export (Suspense boundary for useSearchParams) ─────────────────────

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsInner />
    </Suspense>
  );
}
