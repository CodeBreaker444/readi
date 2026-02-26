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
  type SortingState
} from "@tanstack/react-table";
import {
  CheckCheck,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  RefreshCcw
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getColumns } from "@/components/tables/NotificationColumn";
import { TablePagination } from "@/components/tables/Pagination";
import { useTheme } from "@/components/useTheme";
import { Notification, NotificationListFilters } from "@/config/types/notification";
import axios from "axios";


export default function NotificationsPage() {
  const { isDark } = useTheme()
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
    limit: 100,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const loadData = useCallback(
    async (filters: Omit<NotificationListFilters, "user_id">) => {
      setLoading(true);
      try {
        const items = await axios.post(
          "/api/notification/list",
          filters
        );
        if (!items.data) throw new Error("No data received");

        setData(items.data.data);
      } catch (err: any) {
        toast.error(err.message ?? "Failed to load notifications.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData(serverFilters);
  }, []);


  function handleSearch() {
    loadData(serverFilters);
  }

  const handleMarkRead = async (notification_id: number) => {
    try {
      await axios.post("/api/notification/mark-read", {
        notification_id,
      });
      setData((prev) =>
        prev.map((n) =>
          n.notification_id === notification_id
            ? { ...n, is_read: "Y", read_at: new Date().toISOString() }
            : n
        )
      );
      toast.success("Marked as read.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to mark as read.");
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
      toast.success("All notifications marked as read.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to mark all as read.");
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.post("/api/notification/delete", {
        notification_id: deleteTarget.notification_id,
      });
      setData((prev) => prev.filter((n) => n.notification_id !== deleteTarget.notification_id));
      toast.success("Notification deleted.");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };


  const columns = useMemo(
    () => getColumns(handleMarkRead, setDeleteTarget),
    []
  );

  const table = useReactTable({
    data,
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

  const unreadCount = data.filter((n) => n.is_read === "N").length;


  return (
    <div className="flex flex-col min-h-screen">
      <div className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
        ? "bg-slate-900/80 border-b border-slate-800 text-white"
        : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        } px-6 py-4 mb-8`}>
        <div className="mx-auto max-w-[1800px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <Badge className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] rounded-full px-1.5 h-4 min-w-[16px] flex items-center justify-center border-none">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {data.length} total &bull; {unreadCount} unread messages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={loading || unreadCount === 0}
              className={`h-8 gap-1.5 text-xs transition-all ${isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(serverFilters)}
              disabled={loading}
              className={`h-8 gap-1.5 text-xs transition-all ${isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
            >
              <RefreshCcw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Reload
            </Button>
          </div>
        </div>
      </div>
      <Card className="m-4">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Status
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
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="UNREAD">Unread</SelectItem>
                  <SelectItem value="READ">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Procedure
              </label>
              <Input
                className="h-9"
                placeholder="e.g. planning"
                value={serverFilters.procedure_name}
                onChange={(e) =>
                  setServerFilters((p) => ({
                    ...p,
                    procedure_name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                From
              </label>
              <Input
                type="date"
                className="h-9"
                value={serverFilters.date_from}
                onChange={(e) =>
                  setServerFilters((p) => ({
                    ...p,
                    date_from: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                To
              </label>
              <Input
                type="date"
                className="h-9"
                value={serverFilters.date_to}
                onChange={(e) =>
                  setServerFilters((p) => ({ ...p, date_to: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Search message
              </label>
              <Input
                className="h-9"
                placeholder="Search…"
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
                  limit: 100,
                };
                setServerFilters(reset);
                loadData(reset);
              }}
            >
              Reset
            </Button>
            <Button size="sm" onClick={handleSearch} disabled={loading} className="bg-violet-600 hover:bg-violet-500 cursor-pointer">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="m-4">
        <CardHeader className="">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Notification List
            </CardTitle>
            <Input
              className="h-8 w-48 text-xs"
              placeholder="Filter results…"
              value={
                (table.getColumn("message")?.getFilterValue() as string) ?? ""
              }
              onChange={(e) =>
                table.getColumn("message")?.setFilterValue(e.target.value)
              }
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="w-full">
              <div className={`flex items-center border-b ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} px-4 py-3`}>
                <Skeleton className="h-4 w-8 mr-12" />
                <Skeleton className="h-4 w-48 mr-24" />
                <Skeleton className="h-4 w-24 mr-20" />
                <Skeleton className="h-4 w-24 mr-16" />
                <Skeleton className="h-4 w-20" />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center px-4 py-4">
                    <div className="w-[70px] shrink-0">
                      <Skeleton className="h-3 w-10" />
                    </div>

                    <div className="w-[300px] shrink-0 mr-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>

                    <div className="w-[140px] shrink-0 mr-4">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>

                    <div className="w-[120px] shrink-0 mr-4">
                      <Skeleton className="h-3 w-16 mb-1.5" />
                      <Skeleton className="h-2 w-10" />
                    </div>

                    <div className="w-[100px] shrink-0">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>

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
                            className={
                              header.column.getCanSort()
                                ? "cursor-pointer select-none"
                                : ""
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
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
                          No notifications found.
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
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <TablePagination table={table} />
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove notification{" "}
              <strong>#{deleteTarget?.notification_id}</strong>. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}