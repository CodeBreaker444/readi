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
import { Notification, NotificationListFilters } from "@/config/types/notification";
import axios from "axios";


export default function NotificationsPage() {
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
    state: { sorting, columnFilters , pagination},
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
    <div className="container mx-auto py-6 px-4  space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs rounded-full px-2">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.length} total &bull; {unreadCount} unread
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={loading || unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(serverFilters)}
            disabled={loading}
          >
            <RefreshCcw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Reload
          </Button>
        </div>
      </div>

      <Card>
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
            <Button size="sm" onClick={handleSearch} disabled={loading}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
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
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
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