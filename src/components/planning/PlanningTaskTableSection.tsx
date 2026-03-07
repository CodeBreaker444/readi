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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Filter,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaTasks } from "react-icons/fa";
import { toast } from "sonner";

import { ChecklistRenderer } from "../checklist/ChecklistRenderer";
import { TablePagination } from "../tables/Pagination";
import {
  ChecklistRow,
  type CommunicationItem,
  type ComponentType,
  createTaskTableColumns,
  type FilterMode,
  UnifiedRow
} from "../tables/TaskTableColumn";
import CommunicationSection from "./CommunicationSection";
 

function AddChecklistModal({
  open,
  onOpenChange,
  planningId,
  onAdded,
  isDark,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  planningId: number;
  onAdded: () => void;
  isDark: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonValid, setJsonValid] = useState(false);

  const [form, setForm] = useState({
    checklist_code: "",
    checklist_desc: "",
    checklist_ver: "1.0",
    checklist_active: "Y" as "Y" | "N",
    checklist_json: "",
  });

  const resetForm = () => {
    setForm({
      checklist_code: "",
      checklist_desc: "",
      checklist_ver: "1.0",
      checklist_active: "Y",
      checklist_json: "",
    });
    setJsonError(null);
    setJsonValid(false);
  };

  const validateJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        return { valid: false, error: "JSON must be an object" };
      }
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
  };

  const handleJsonCheck = () => {
    if (!form.checklist_json.trim()) {
      setJsonError("JSON is empty");
      setJsonValid(false);
      return;
    }
    const { valid, error } = validateJson(form.checklist_json);
    if (valid) {
      setJsonError("Valid JSON Schema");
      setJsonValid(true);
    } else {
      setJsonError(error ?? "Invalid JSON Format");
      setJsonValid(false);
    }
  };

  const handleSave = async () => {
    if (!form.checklist_code.trim()) {
      toast.error("Checklist code is required.");
      return;
    }
    if (!form.checklist_desc.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (!form.checklist_json.trim()) {
      toast.error("JSON schema is required.");
      return;
    }

    const { valid, error } = validateJson(form.checklist_json);
    if (!valid) {
      setJsonError(error ?? "Invalid JSON");
      setJsonValid(false);
      return;
    }

    setSaving(true);
    try {
      await axios.post("/api/evaluation/mission/checklist/add", {
        planning_id: planningId,
        checklist_code: form.checklist_code.trim(),
        checklist_desc: form.checklist_desc.trim(),
        checklist_json: form.checklist_json,
        checklist_ver: form.checklist_ver,
        checklist_active: form.checklist_active,
      });
      toast.success("Checklist added successfully.");
      resetForm();
      onOpenChange(false);
      onAdded();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to add checklist.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = `cursor-text ${isDark
    ? "bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-violet-500/30"
    : "bg-white border-slate-200 text-slate-900 focus-visible:ring-violet-500/20"
    }`;

  const labelClass = `text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent
        className={`max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border shadow-2xl ${isDark
          ? "bg-slate-900 border-slate-800 text-slate-100"
          : "bg-white border-slate-200 text-slate-900"
          }`}
      >
        <DialogHeader
          className={`px-6 py-4 border-b flex flex-row items-center justify-between space-y-0 ${isDark
            ? "border-slate-800 bg-slate-900"
            : "border-slate-100 bg-slate-50"
            }`}
        >
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-violet-500">
            <Plus className="h-5 w-5" />
            Add Checklist
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Code <span className="text-red-500">*</span></Label>
              <Input
                className={inputClass}
                value={form.checklist_code}
                onChange={(e) => setForm((p) => ({ ...p, checklist_code: e.target.value }))}
                placeholder="PRE-FLIGHT-01"
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Version</Label>
              <Input
                className={inputClass}
                value={form.checklist_ver}
                onChange={(e) => setForm((p) => ({ ...p, checklist_ver: e.target.value }))}
                placeholder="1.0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Status</Label>
              <Select
                value={form.checklist_active}
                onValueChange={(v) => setForm((p) => ({ ...p, checklist_active: v as "Y" | "N" }))}
              >
                <SelectTrigger className={`cursor-pointer ${inputClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-slate-200" : ""}>
                  <SelectItem value="Y">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </SelectItem>
                  <SelectItem value="N">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Inactive
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Description <span className="text-red-500">*</span></Label>
            <Input
              className={inputClass}
              value={form.checklist_desc}
              onChange={(e) => setForm((p) => ({ ...p, checklist_desc: e.target.value }))}
              placeholder="Enter checklist description..."
            />
          </div>

          <Separator className={isDark ? "bg-slate-800" : "bg-slate-100"} />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className={labelClass}>JSON Schema <span className="text-red-500">*</span></Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleJsonCheck}
                className={`cursor-pointer h-7 px-3 text-xs gap-1.5 ${isDark
                  ? "border-slate-800 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
              >
                <ShieldCheck size={12} />
                Validate JSON
              </Button>
            </div>

            <div className={`rounded-xl border overflow-hidden transition-colors ${jsonError
              ? jsonValid ? "border-emerald-500/50" : "border-red-500/40"
              : isDark ? "border-slate-800" : "border-slate-200"
              }`}>
              <div className={`flex items-center gap-2 px-4 py-2 border-b ${isDark ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <span className={`text-xs font-mono ml-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>schema.json</span>
              </div>

              <Textarea
                className={`cursor-text rounded-none border-0 font-mono text-sm leading-relaxed h-44 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 ${isDark
                  ? "bg-slate-900 text-slate-200 placeholder:text-slate-700"
                  : "bg-white text-slate-800 placeholder:text-slate-400"
                  }`}
                value={form.checklist_json}
                onChange={(e) => {
                  setForm((p) => ({ ...p, checklist_json: e.target.value }));
                  setJsonError(null);
                  setJsonValid(false);
                }}
                placeholder={'{\n  "pages": [\n    {\n      "elements": [...]\n    }\n  ]\n}'}
              />
            </div>

            {jsonError && (
              <p className={`text-xs flex items-center gap-1.5 mt-1 ${jsonValid ? "text-emerald-500" : "text-red-500"}`}>
                {jsonValid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {jsonError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className={isDark ? "border-slate-800 hover:bg-slate-800" : ""}
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saving ? "Adding..." : "Add Checklist"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function ChecklistRendererModal({
  open,
  onOpenChange,
  checklistJson,
  title,
  isDark,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  checklistJson: any;
  title: string;
  isDark: boolean;
}) {
  if (!checklistJson) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-3xl max-h-[85vh] overflow-hidden p-0 border shadow-2xl ${isDark ? "bg-slate-900 border-slate-800" : "bg-white"}`}>
        <DialogHeader className={`px-6 py-4 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            <ClipboardList className="h-5 w-5 text-violet-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-6">
          <ChecklistRenderer
            checklistJson={checklistJson}
            isDark={isDark}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


export function PlanningTaskTableSection(props: {
  isDark: boolean;
  planningId: number;
  clientId: number;
  evaluationId: number
  onMoveToTesting?: () => void;
}) {
  const { isDark, planningId, clientId, evaluationId, onMoveToTesting } = props;

  const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [communications, setCommunications] = useState<CommunicationItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [commLoading, setCommLoading] = useState(false);

  const [filterMode, setFilterMode] = useState<FilterMode>("combined");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const [rendererOpen, setRendererOpen] = useState(false);
  const [rendererJson, setRendererJson] = useState<any>(null);
  const [rendererTitle, setRendererTitle] = useState("");

  const [rawOpen, setRawOpen] = useState(false);
  const [selectedRowRaw, setSelectedRowRaw] = useState<any>(null);

  const [addChecklistOpen, setAddChecklistOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  const loadChecklists = useCallback(async () => {
    if (!planningId) return;
    setDataLoading(true);
    try {
      const res = await axios.post("/api/evaluation/mission/checklist/list", { planning_id: planningId });
      setChecklists(res.data.data ?? []);
    } catch (err) {
      console.error("Failed to load checklists:", err);
    } finally {
      setDataLoading(false);
    }
  }, [planningId]);

  const loadCommunications = useCallback(async () => {
    if (!planningId) return;
    setCommLoading(true);
    try {
      const res = await axios.post("/api/evaluation/mission/communication/list", { planning_id: planningId });
      setCommunications(res.data.data ?? []);
    } catch (err) {
      console.error("Failed to load communications:", err);
    } finally {
      setCommLoading(false);
    }
  }, [planningId]);

  useEffect(() => {
    loadChecklists();
    loadCommunications();
  }, [loadChecklists, loadCommunications]);

  const reloadAll = useCallback(() => {
    loadChecklists();
    loadCommunications();
  }, [loadChecklists, loadCommunications]);

  const checklistRows: UnifiedRow[] = useMemo(
    () => checklists.map((cl) => ({
      id: `cl-${cl.checklist_id}`,
      title: cl.checklist_code || "Checklist",
      description: cl.checklist_desc || "",
      component: "Checklist" as ComponentType,
      item_id: cl.checklist_id,
      code: cl.checklist_code,
      status: cl.checklist_active === "Y" ? "Active" : "Inactive",
      active: cl.checklist_active === "Y",
      raw: cl,
      checklist_json: cl.checklist_json,
    })), [checklists]
  );

  const communicationRows: UnifiedRow[] = useMemo(
    () => communications.map((c) => ({
      id: `comm-${c.communication_id}`,
      title: c.subject || "Communication",
      description: c.message?.substring(0, 120) ?? "",
      component: "Communication" as ComponentType,
      item_id: c.communication_id,
      code: `COMM_${c.communication_id}`,
      status: c.status ?? "sent",
      active: c.status === "sent" || c.status === "read",
      raw: c,
    })), [communications]
  );

  const allRows: UnifiedRow[] = useMemo(() => {
    switch (filterMode) {
      case "checklist": return checklistRows;
      case "communication": return communicationRows;
      default: return [...checklistRows, ...communicationRows];
    }
  }, [filterMode, checklistRows, communicationRows]);

  const handleChecklistPreview = useCallback((row: UnifiedRow) => {
    if (row.checklist_json) {
      const json = typeof row.checklist_json === "string" ? JSON.parse(row.checklist_json) : row.checklist_json;
      setRendererJson(json);
      setRendererTitle(row.code || row.title || "Checklist");
      setRendererOpen(true);
    } else {
      toast.info("No checklist JSON data available.");
    }
  }, []);

  const handleViewRawJson = useCallback((row: UnifiedRow) => {
    setSelectedRowRaw(row.raw);
    setRawOpen(true);
  }, []);

  const handleMoveToTesting = async () => {
    setMoving(true);
    try {
      await axios.post("/api/evaluation/mission/testing", { planning_id: planningId });
      toast.success("Planning moved to testing");
      setConfirmOpen(false);
      onMoveToTesting?.();
    } catch {
      toast.error("Failed to move to testing");
    } finally {
      setMoving(false);
    }
  };

  const columns = useMemo(
    () => createTaskTableColumns({
      onChecklistPreview: handleChecklistPreview,
      onViewRawJson: handleViewRawJson,
    }), [handleChecklistPreview, handleViewRawJson]
  );

  const table = useReactTable({
    data: allRows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  });

  const FilterBtn = ({ mode, icon, label, count }: { mode: FilterMode; icon: React.ReactNode; label: string; count: number; }) => {
    const active = filterMode === mode;
    return (
      <Button
        size="sm"
        variant={active ? "default" : "outline"}
        className={`gap-1.5 text-xs h-8 ${active ? "bg-violet-600 hover:bg-violet-700 text-white" : isDark ? "border-slate-800 text-slate-400 hover:bg-slate-800" : ""}`}
        onClick={() => setFilterMode(mode)}
      >
        {icon}
        {label}
        <Badge
          variant={active ? "secondary" : "outline"}
          className={`ml-0.5 text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center ${!active && isDark ? "border-slate-700 text-slate-500" : ""}`}
        >
          {count}
        </Badge>
      </Button>
    );
  };

  return (
    <Card className={isDark ? "bg-slate-900 border-slate-800" : "bg-white"}>
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-base ${isDark ? "text-slate-100" : "text-slate-900"}`}>Task Table</CardTitle>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Checklists &amp; Communications for this planning
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CommunicationSection
              clientId={clientId}
              planningId={planningId}
              evaluationId={evaluationId}
            />
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 h-8"
              onClick={() => setAddChecklistOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Checklist
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap pt-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <FilterBtn
              mode="combined"
              icon={<FaTasks className="h-3.5 w-3.5" />}
              label="Combined"
              count={checklistRows.length + communicationRows.length}
            />
            <FilterBtn
              mode="checklist"
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              label="Checklist"
              count={checklistRows.length}
            />
            <FilterBtn
              mode="communication"
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              label="Communication"
              count={communicationRows.length}
            />
          </div>

          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className={`pl-8 h-8 text-xs ${isDark ? "bg-slate-950 border-slate-800 text-slate-200" : ""}`}
              placeholder="Search rows..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {dataLoading && commLoading ? (
          <div className="space-y-3">
            <div className={`flex gap-4 px-4 py-3 border-b ${isDark ? "border-slate-800" : ""}`}>
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex gap-4 px-4 py-4 items-center border-b last:border-0 ${isDark ? "border-slate-800" : ""}`}>
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded opacity-70" />
                </div>
                <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : checklists.length === 0 && communications.length === 0 ? (
          <div className={`text-sm py-10 text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            No checklists or communications found for this planning.
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className={`text-sm py-10 text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {globalFilter ? "No rows match your search." : "No items for this filter."}
          </div>
        ) : (
          <div className={`rounded-md border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <Table>
              <TableHeader className={isDark ? "bg-slate-900/50" : "bg-slate-50/50"}>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className={isDark ? "border-slate-800 hover:bg-transparent" : ""}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={isDark ? "text-slate-400 font-medium" : ""}
                        style={header.getSize() ? { width: `${header.getSize()}px` } : undefined}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className={isDark ? "border-slate-800 hover:bg-slate-800/50" : "hover:bg-slate-50"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={isDark ? "text-slate-300" : ""}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {(dataLoading || commLoading) && !(dataLoading && commLoading) && (
          <div className="flex justify-center py-2">
            <div className={`h-1 w-full max-w-[200px] overflow-hidden rounded ${isDark ? "bg-slate-800" : "bg-violet-100"}`}>
              <div className="h-full bg-violet-600 animate-progress origin-left" />
            </div>
          </div>
        )}
        <TablePagination table={table} />
      </CardContent>

      <ChecklistRendererModal
        open={rendererOpen}
        onOpenChange={setRendererOpen}
        checklistJson={rendererJson}
        title={rendererTitle}
        isDark={isDark}
      />

      <Dialog open={rawOpen} onOpenChange={setRawOpen}>
        <DialogContent className={`max-w-3xl ${isDark ? "bg-slate-900 border-slate-800" : ""}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-slate-100" : ""}`}>
              <Eye className="h-5 w-5 text-violet-500" /> Raw Data
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className={`h-[60vh] rounded-md border ${isDark ? "border-slate-800" : ""}`}>
            <pre className={`p-4 text-xs font-mono whitespace-pre-wrap ${isDark ? "bg-slate-950 text-slate-400" : "bg-slate-50 text-slate-800"}`}>
              {selectedRowRaw ? JSON.stringify(selectedRowRaw, null, 2) : "// nothing selected"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AddChecklistModal
        open={addChecklistOpen}
        onOpenChange={setAddChecklistOpen}
        planningId={planningId}
        onAdded={reloadAll}
        isDark={isDark}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className={isDark ? "bg-slate-900 border-slate-800" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? "text-slate-100" : ""}>Move to Testing Missions?</AlertDialogTitle>
            <AlertDialogDescription className={isDark ? "text-slate-400" : ""}>
              This will change the planning status to TESTING. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={moving} className={isDark ? "bg-slate-800 border-slate-700 text-slate-300" : ""}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMoveToTesting}
              disabled={moving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {moving ? "Moving..." : "Move to Testing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}