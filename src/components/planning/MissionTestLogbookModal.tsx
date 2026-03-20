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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { MissionTestRow, PilotUser } from "@/config/types/evaluation-planning";
import axios from "axios";
import { Loader2, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";

interface MissionTestLogbookModalProps {
    isDark: boolean
    open: boolean;
    onOpenChange: (open: boolean) => void;
    missionPlanningId: number;
    planningId: number;
    evaluationId: number;
    missionPlanningActive: string;
    onStatusChanged?: () => void;
}

export default function MissionTestLogbookModal({
    isDark,
    open,
    onOpenChange,
    missionPlanningId,
    planningId,
    evaluationId,
    missionPlanningActive,
    onStatusChanged,
}: MissionTestLogbookModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [tests, setTests] = useState<MissionTestRow[]>([]);
    const [pilots, setPilots] = useState<PilotUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeStatus, setActiveStatus] = useState(missionPlanningActive);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [testIdToDelete, setTestIdToDelete] = useState<number | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

    const [form, setForm] = useState({
        fk_pic_id: "",
        fk_observer_id: "",
        mission_test_code: "",
        mission_test_date_start: "",
        mission_test_date_end: "",
        mission_test_result: "error",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const loadData = useCallback(async () => {
        if (!missionPlanningId) return;
        setLoading(true);
        try {
            const [testsRes, pilotsRes] = await Promise.all([
                axios.post("/api/evaluation/mission/list", {
                    mission_planning_id: missionPlanningId,
                }),
                axios.get("/api/evaluation/planning/pilot"),
            ]);
            setTests(testsRes.data.data ?? []);
            setPilots(pilotsRes.data.data ?? []);
        } catch (err) {
            console.error("Failed to load test logbook data:", err);
            toast.error("Failed to load test logbook data");
        } finally {
            setLoading(false);
        }
    }, [missionPlanningId]);

    useEffect(() => {
        if (open) {
            loadData();
            setActiveStatus(missionPlanningActive);
        }
    }, [open, loadData, missionPlanningActive]);

    const handleFieldChange = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!form.fk_pic_id || form.fk_pic_id === "0")
            newErrors.fk_pic_id = "Pilot in Command is required";
        if (!form.fk_observer_id || form.fk_observer_id === "0")
            newErrors.fk_observer_id = "Observer is required";
        if (form.fk_pic_id && form.fk_observer_id && form.fk_pic_id === form.fk_observer_id)
            newErrors.fk_observer_id = "Observer must differ from Pilot in Command";
        if (!form.mission_test_code.trim())
            newErrors.mission_test_code = "Test code is required";
        if (!form.mission_test_date_start)
            newErrors.mission_test_date_start = "Start date is required";
        if (!form.mission_test_date_end)
            newErrors.mission_test_date_end = "End date is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddTest = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("fk_mission_planning_id", String(missionPlanningId));
            formData.append("fk_planning_id", String(planningId));
            formData.append("fk_evaluation_id", String(evaluationId));
            formData.append("fk_pic_id", form.fk_pic_id);
            formData.append("fk_observer_id", form.fk_observer_id);
            formData.append("mission_test_code", form.mission_test_code);
            formData.append("mission_test_date_start", form.mission_test_date_start);
            formData.append("mission_test_date_end", form.mission_test_date_end);
            formData.append("mission_test_result", form.mission_test_result);

            if (fileInputRef.current?.files?.[0]) {
                formData.append("mission_planning_test_file", fileInputRef.current.files[0]);
            }

            const res = await axios.post("/api/evaluation/mission/mission-test", formData);

            if (res.data.success) {
                toast.success("Test added successfully");
                setForm({
                    fk_pic_id: "",
                    fk_observer_id: "",
                    mission_test_code: "",
                    mission_test_date_start: "",
                    mission_test_date_end: "",
                    mission_test_result: "error",
                });
                if (fileInputRef.current) fileInputRef.current.value = "";
                await loadData();
            }
        } catch (err: any) {
            const errMsg =
                err.response?.data?.details
                    ? Object.values(err.response.data.details).flat().join(", ")
                    : err.response?.data?.error || "Failed to add test";
            toast.error(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDeleteTest = (testId: number) => {
        setTestIdToDelete(testId);
        setDeleteDialogOpen(true);
    };

    const handleDeleteTest = async () => {
        if (testIdToDelete === null) return;
        try {
            await axios.post("/api/evaluation/mission/delete-test", {
                test_id: testIdToDelete,
            });
            toast.success("Test deleted successfully");
            setTests((prev) => prev.filter((t) => t.test_id !== testIdToDelete));
        } catch (err) {
            console.error("Delete test failed:", err);
            toast.error("Failed to delete test");
        } finally {
            setTestIdToDelete(null);
            setDeleteDialogOpen(false);
        }
    };

    const handleToggleActive = async () => {
        const newStatus = activeStatus === "Y" ? "N" : "Y";
        setUpdatingStatus(true);
        try {
            await axios.post("/api/evaluation/mission/update-status", {
                mission_planning_id: missionPlanningId,
                status: newStatus,
            });
            setActiveStatus(newStatus);
            toast.success(
                newStatus === "Y" ? "Mission set as Active" : "Mission set as Hold"
            );
            onStatusChanged?.();
        } catch (err) {
            console.error("Status toggle failed:", err);
            toast.error("Failed to update mission status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            onStatusChanged?.();
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className={`max-w-[95vw] lg:max-w-screen-xl h-[90vh] flex flex-col p-0 overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : ""}`}>

                    <DialogHeader className={`p-6 border-b ${isDark ? "bg-slate-950/50 border-slate-800" : "bg-muted/20"}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <DialogTitle className={`text-xl font-bold tracking-tight ${isDark ? "text-slate-100" : ""}`}>
                                    Mission Test Logbook
                                </DialogTitle>
                                <DialogDescription className={`text-sm ${isDark ? "text-slate-400" : ""}`}>
                                    [GO.00.P03] Mission Test — Manage tests for mission planning #{missionPlanningId}
                                </DialogDescription>
                            </div>
                            <Badge variant="outline" className={`px-4 py-1 rounded-sm text-xs font-semibold border-none ${activeStatus === 'N'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                }`}>
                                {activeStatus === 'N' ? 'On Hold' : 'Active'}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {loading ? (
                            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

                                <div className={`rounded-xl border p-6 space-y-6 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-card"}`}>
                                    <div className={`flex items-center gap-2 border-b pb-4 ${isDark ? "border-slate-800" : ""}`}>
                                        <Skeleton className="h-2 w-2 rounded-full" />
                                        <Skeleton className="h-6 w-48" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="space-y-2">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-11 w-full rounded-md" />
                                            </div>
                                        ))}
                                        <div className="space-y-2 lg:col-span-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-11 w-full rounded-md" />
                                        </div>
                                    </div>

                                    <div className={`mt-8 flex justify-end border-t pt-6 ${isDark ? "border-slate-800" : ""}`}>
                                        <Skeleton className="h-12 w-44 rounded-md" />
                                    </div>
                                </div>

                                <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-card"}`}>
                                    <div className={`px-6 py-4 border-b ${isDark ? "bg-slate-950/50 border-slate-800" : "bg-muted/30"}`}>
                                        <Skeleton className="h-5 w-40" />
                                    </div>

                                    <div className="p-0">
                                        <div className={`flex items-center justify-between px-6 py-3 border-b ${isDark ? "bg-slate-950/30 border-slate-800" : "bg-muted/10"}`}>
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-8" />
                                        </div>

                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className={`flex items-center justify-between px-6 py-5 border-b last:border-0 ${isDark ? "border-slate-800" : ""}`}>
                                                <Skeleton className="h-5 w-24" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="h-3 w-24" />
                                                </div>
                                                <Skeleton className="h-4 w-40" />
                                                <Skeleton className="h-6 w-20 rounded-full" />
                                                <Skeleton className="h-9 w-9 rounded-md" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-start pt-4">
                                    <Skeleton className="h-10 w-48 rounded-md" />
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-7xl mx-auto space-y-8">

                                <section className={`rounded-xl border shadow-sm p-6 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-card"}`}>
                                    <div className={`flex items-center gap-2 mb-6 border-b pb-4 ${isDark ? "border-slate-800" : ""}`}>
                                        <h4 className="text-md font-semibold uppercase tracking-tight text-muted-foreground">Add New Test Entry</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-white" : ""}>Pilot in Command <span className="text-red-500">*</span></Label>
                                            <Select value={form.fk_pic_id} onValueChange={(val) => handleFieldChange("fk_pic_id", val)}>
                                                <SelectTrigger className={`h-11 ${errors.fk_pic_id ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800" : ""}`}>
                                                    <SelectValue placeholder="Select PiC" />
                                                </SelectTrigger>
                                                <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-white" : ""}>
                                                    {pilots.map((p) => (
                                                        <SelectItem key={p.user_id} value={String(p.user_id)}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`h-2 w-2 rounded-full ${p.userActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                                                {p.fullname}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.fk_pic_id && <p className="text-xs text-red-500">{errors.fk_pic_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-white" : ""}>Observer <span className="text-red-500">*</span></Label>
                                            <Select value={form.fk_observer_id} onValueChange={(val) => handleFieldChange("fk_observer_id", val)}>
                                                <SelectTrigger className={`h-11 ${errors.fk_observer_id ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800" : ""}`}>
                                                    <SelectValue placeholder="Select Observer" />
                                                </SelectTrigger>
                                                <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-white" : ""}>
                                                    {pilots.map((p) => (
                                                        <SelectItem key={p.user_id} value={String(p.user_id)}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`h-2 w-2 rounded-full ${p.userActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                                                {p.fullname}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.fk_observer_id && <p className="text-xs text-red-500">{errors.fk_observer_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>Test Code <span className="text-red-500">*</span></Label>
                                            <Input
                                                className={`h-11 font-mono ${errors.mission_test_code ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800 text-white" : ""}`}
                                                value={form.mission_test_code}
                                                onChange={(e) => handleFieldChange("mission_test_code", e.target.value)}
                                                placeholder="TST-001"
                                            />
                                            {errors.mission_test_code && <p className="text-xs text-red-500">{errors.mission_test_code}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>Test Result</Label>
                                            <Select value={form.mission_test_result} onValueChange={(val) => handleFieldChange("mission_test_result", val)}>
                                                <SelectTrigger className={`h-11 ${isDark ? "bg-slate-950 border-slate-800 text-white" : ""}`}><SelectValue /></SelectTrigger>
                                                <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-white" : ""}>
                                                    <SelectItem value="success">Positive</SelectItem>
                                                    <SelectItem value="error">Negative</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>Start Date <span className="text-red-500">*</span></Label>
                                            <Input type="date" className={`h-11 ${errors.mission_test_date_start ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800 text-white" : ""}`} value={form.mission_test_date_start} onChange={(e) => handleFieldChange("mission_test_date_start", e.target.value)} />
                                            {errors.mission_test_date_start && <p className="text-xs text-red-500">{errors.mission_test_date_start}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>End Date <span className="text-red-500">*</span></Label>
                                            <Input type="date" className={`h-11 ${errors.mission_test_date_end ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800 text-white" : ""}`} value={form.mission_test_date_end} onChange={(e) => handleFieldChange("mission_test_date_end", e.target.value)} />
                                            {errors.mission_test_date_end && <p className="text-xs text-red-500">{errors.mission_test_date_end}</p>}
                                        </div>

                                        <div className="space-y-2 lg:col-span-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>Test Artifact (Log/File)</Label>
                                            <Input type="file" className={`h-11 cursor-pointer pt-2 ${isDark ? "bg-slate-950 border-slate-800 file:text-white" : ""}`} ref={fileInputRef} />
                                        </div>
                                    </div>

                                    <div className={`mt-8 flex justify-end border-t pt-6 ${isDark ? "border-slate-800" : ""}`}>
                                        <Button onClick={handleAddTest} disabled={submitting} size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-12 transition-all">
                                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add Test Entry
                                        </Button>
                                    </div>
                                </section>

                             <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-card"}`}>
                                    <div className={`bg-muted/30 px-6 py-4 border-b ${isDark ? "bg-slate-950/50 border-slate-800" : ""}`}>
                                        <h4 className="font-semibold text-muted-foreground">Historical Test Logs</h4>
                                    </div>
                                    <Table>
                                        <TableHeader className={isDark ? "bg-slate-950/30 text-white" : "bg-muted/10"}>
                                            <TableRow className={isDark ? "border-slate-800" : ""}>
                                                <TableHead className={`w-[15%] ${isDark ? "border-slate-800 text-white" : ""}`}>Test Code</TableHead>
                                                <TableHead className={`w-[25%] ${isDark ? "border-slate-800 text-white" : ""}`}>Staff (PiC / Obs)</TableHead>
                                                <TableHead className={`w-[30%] text-center ${isDark ? "border-slate-800 text-white" : ""}`}>Duration</TableHead>
                                                <TableHead className={`w-[15%] ${isDark ? "border-slate-800 text-white" : ""}`}>Result</TableHead>
                                                <TableHead className={`w-[15%] text-right ${isDark ? "border-slate-800 text-white" : ""}`}>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tests.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                        No mission tests have been logged.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                tests.map((test) => (
                                                    <TableRow key={test.test_id} className={`transition-colors ${isDark ? "border-slate-800 hover:bg-slate-800/40" : "hover:bg-muted/50"}`}>
                                                        <TableCell className="font-mono font-medium text-violet-500">{test.test_code}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm font-medium ${isDark ? "text-slate-200" : ""}`}>{test.pic_name}</span>
                                                                <span className="text-xs text-muted-foreground italic">Obs: {test.observer_name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs text-slate-500">
                                                            {test.mission_test_date_start} <span className="mx-1">→</span> {test.mission_test_date_end}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={test.mission_test_result === "success" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"} variant="outline">
                                                                {test.mission_test_result === "success" ? "Positive" : "Negative"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => confirmDeleteTest(test.test_id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-dashed">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={updatingStatus}
                                        className={`transition-all ${activeStatus === "N"
                                            ? "border-emerald-600/50 text-emerald-600 hover:bg-emerald-600/10"
                                            : "border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                                            }`}
                                        onClick={handleToggleActive}
                                    >
                                        {updatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : activeStatus === "N" ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                                        {activeStatus === "N" ? "Activate Mission" : "Put on Hold"}
                                    </Button>

                                    <Button variant="secondary" className="px-8 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => handleClose(false)}>
                                        Finish & Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className={isDark ? "bg-slate-900 border-slate-800" : ""}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className={isDark ? "text-slate-100" : ""}>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className={isDark ? "text-slate-400" : ""}>
                            This action cannot be undone. This will permanently delete the test entry and associated file artifacts.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={isDark ? "bg-slate-800 border-slate-700 text-slate-300" : ""}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTest} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}