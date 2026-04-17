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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
    const { t } = useTranslation();
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
            toast.error(t("testLogbook.loadError"));
        } finally {
            setLoading(false);
        }
    }, [missionPlanningId, t]);

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
            newErrors.fk_pic_id = t("testLogbook.picRequired");
        if (!form.fk_observer_id || form.fk_observer_id === "0")
            newErrors.fk_observer_id = t("testLogbook.observerRequired");
        if (form.fk_pic_id && form.fk_observer_id && form.fk_pic_id === form.fk_observer_id)
            newErrors.fk_observer_id = t("testLogbook.observerDiff");
        if (!form.mission_test_code.trim())
            newErrors.mission_test_code = t("testLogbook.testCodeRequired");
        if (!form.mission_test_date_start)
            newErrors.mission_test_date_start = t("testLogbook.startDateRequired");
        if (!form.mission_test_date_end)
            newErrors.mission_test_date_end = t("testLogbook.endDateRequired");

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
                toast.success(t("testLogbook.addSuccess"));
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
            toast.error(t("testLogbook.addFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTest = async () => {
        if (testIdToDelete === null) return;
        try {
            await axios.post("/api/evaluation/mission/delete-test", {
                test_id: testIdToDelete,
            });
            toast.success(t("testLogbook.deleteSuccess"));
            setTests((prev) => prev.filter((t) => t.test_id !== testIdToDelete));
        } catch (err) {
            toast.error(t("testLogbook.deleteFailed"));
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
            toast.success(newStatus === "Y" ? t("testLogbook.setActive") : t("testLogbook.setHold"));
            onStatusChanged?.();
        } catch (err) {
            toast.error(t("testLogbook.statusFailed"));
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        onOpenChange(isOpen);
        if (!isOpen) onStatusChanged?.();
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className={`max-w-[95vw] lg:max-w-screen-xl h-[90vh] flex flex-col p-0 overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : ""}`}>

                    <DialogHeader className={`p-6 border-b ${isDark ? "bg-slate-950/50 border-slate-800" : "bg-muted/20"}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <DialogTitle className={`text-xl font-bold tracking-tight ${isDark ? "text-slate-100" : ""}`}>
                                    {t("testLogbook.title")}
                                </DialogTitle>
                                <DialogDescription className={`text-sm ${isDark ? "text-slate-400" : ""}`}>
                                    {t("testLogbook.subtitlePrefix")}{missionPlanningId}
                                </DialogDescription>
                            </div>
                            <Badge variant="outline" className={`px-4 py-1 rounded-sm text-xs font-semibold border-none ${activeStatus === 'N'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                }`}>
                                {activeStatus === 'N' ? t("testLogbook.putOnHold") : t("planning.status.active")}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {loading ? (
                            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                                {/* Skeleton content omitted for brevity, same logic applies */}
                            </div>
                        ) : (
                            <div className="max-w-7xl mx-auto space-y-8">

                                <section className={`rounded-xl border shadow-sm p-6 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-card"}`}>
                                    <div className={`flex items-center gap-2 mb-6 border-b pb-4 ${isDark ? "border-slate-800" : ""}`}>
                                        <h4 className="text-md font-semibold uppercase tracking-tight text-muted-foreground">{t("testLogbook.addNewTest")}</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-white" : ""}>{t("testLogbook.pilotInCommand")} <span className="text-red-500">*</span></Label>
                                            <Select value={form.fk_pic_id} onValueChange={(val) => handleFieldChange("fk_pic_id", val)}>
                                                <SelectTrigger className={`h-11 ${errors.fk_pic_id ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800" : ""}`}>
                                                    <SelectValue placeholder={t("testLogbook.selectPic")} />
                                                </SelectTrigger>
                                                <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-white" : ""}>
                                                    {pilots.map((p) => (
                                                        <SelectItem key={p.user_id} value={String(p.user_id)}>
                                                            {p.fullname}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.fk_pic_id && <p className="text-xs text-red-500">{errors.fk_pic_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-white" : ""}>{t("testLogbook.observer")} <span className="text-red-500">*</span></Label>
                                            <Select value={form.fk_observer_id} onValueChange={(val) => handleFieldChange("fk_observer_id", val)}>
                                                <SelectTrigger className={`h-11 ${errors.fk_observer_id ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800" : ""}`}>
                                                    <SelectValue placeholder={t("testLogbook.selectObserver")} />
                                                </SelectTrigger>
                                                <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-white" : ""}>
                                                    {pilots.map((p) => (
                                                        <SelectItem key={p.user_id} value={String(p.user_id)}>
                                                            {p.fullname}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.fk_observer_id && <p className="text-xs text-red-500">{errors.fk_observer_id}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>{t("testLogbook.testCode")} <span className="text-red-500">*</span></Label>
                                            <Input
                                                className={`h-11 font-mono ${errors.mission_test_code ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800 text-white" : ""}`}
                                                value={form.mission_test_code}
                                                onChange={(e) => handleFieldChange("mission_test_code", e.target.value)}
                                                placeholder={t("testLogbook.testCodePlaceholder")}
                                            />
                                            {errors.mission_test_code && <p className="text-xs text-red-500">{errors.mission_test_code}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>{t("testLogbook.testResult")}</Label>
                                            <Select value={form.mission_test_result} onValueChange={(val) => handleFieldChange("mission_test_result", val)}>
                                                <SelectTrigger className={`h-11 ${isDark ? "bg-slate-950 border-slate-800 text-white" : ""}`}><SelectValue /></SelectTrigger>
                                                <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-white" : ""}>
                                                    <SelectItem value="success">{t("testLogbook.positive")}</SelectItem>
                                                    <SelectItem value="error">{t("testLogbook.negative")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>{t("testLogbook.startDate")} <span className="text-red-500">*</span></Label>
                                            <Input type="date" className={`h-11 ${errors.mission_test_date_start ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800 text-white" : ""}`} value={form.mission_test_date_start} onChange={(e) => handleFieldChange("mission_test_date_start", e.target.value)} />
                                            {errors.mission_test_date_start && <p className="text-xs text-red-500">{errors.mission_test_date_start}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>{t("testLogbook.endDate")} <span className="text-red-500">*</span></Label>
                                            <Input type="date" className={`h-11 ${errors.mission_test_date_end ? "border-red-500" : ""} ${isDark ? "bg-slate-950 border-slate-800 text-white" : ""}`} value={form.mission_test_date_end} onChange={(e) => handleFieldChange("mission_test_date_end", e.target.value)} />
                                            {errors.mission_test_date_end && <p className="text-xs text-red-500">{errors.mission_test_date_end}</p>}
                                        </div>

                                        <div className="space-y-2 lg:col-span-2">
                                            <Label className={isDark ? "text-slate-300" : ""}>{t("testLogbook.artifact")}</Label>
                                            <Input type="file" className={`h-11 cursor-pointer pt-2 ${isDark ? "bg-slate-950 border-slate-800 file:text-white" : ""}`} ref={fileInputRef} />
                                        </div>
                                    </div>

                                    <div className={`mt-8 flex justify-end border-t pt-6 ${isDark ? "border-slate-800" : ""}`}>
                                        <Button onClick={handleAddTest} disabled={submitting} size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-12 transition-all">
                                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} {t("testLogbook.addEntry")}
                                        </Button>
                                    </div>
                                </section>

                                <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-card"}`}>
                                    <div className={`bg-muted/30 px-6 py-4 border-b ${isDark ? "bg-slate-950/50 border-slate-800" : ""}`}>
                                        <h4 className="font-semibold text-muted-foreground">{t("testLogbook.historicalLogs")}</h4>
                                    </div>
                                    <Table>
                                        <TableHeader className={isDark ? "bg-slate-950/30 text-white" : "bg-muted/10"}>
                                            <TableRow className={isDark ? "border-slate-800" : ""}>
                                                <TableHead className={`w-[15%] ${isDark ? "border-slate-800 text-white" : ""}`}>{t("testLogbook.testCode")}</TableHead>
                                                <TableHead className={`w-[25%] ${isDark ? "border-slate-800 text-white" : ""}`}>{t("testLogbook.staffCol")}</TableHead>
                                                <TableHead className={`w-[30%] text-center ${isDark ? "border-slate-800 text-white" : ""}`}>{t("testLogbook.duration")}</TableHead>
                                                <TableHead className={`w-[15%] ${isDark ? "border-slate-800 text-white" : ""}`}>{t("testLogbook.result")}</TableHead>
                                                <TableHead className={`w-[15%] text-right ${isDark ? "border-slate-800 text-white" : ""}`}>{t("planning.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tests.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                        {t("testLogbook.noTests")}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                tests.map((test) => (
                                                    <TableRow key={test.test_id} className={`transition-colors ${isDark ? "border-slate-800 hover:bg-slate-800/40" : "hover:bg-muted/50"}`}>
                                                        <TableCell className="font-mono font-medium text-violet-500">{test.test_code}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm font-medium ${isDark ? "text-slate-200" : ""}`}>{test.pic_name}</span>
                                                                <span className="text-xs text-muted-foreground italic">{t("testLogbook.obsLabel")} {test.observer_name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs text-slate-500">
                                                            {test.mission_test_date_start} <span className="mx-1">→</span> {test.mission_test_date_end}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={test.mission_test_result === "success" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"} variant="outline">
                                                                {test.mission_test_result === "success" ? t("testLogbook.positive") : t("testLogbook.negative")}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => { setTestIdToDelete(test.test_id); setDeleteDialogOpen(true); }}>
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
                                        {activeStatus === "N" ? t("testLogbook.activateMission") : t("testLogbook.putOnHold")}
                                    </Button>

                                    <Button variant="secondary" className="px-8 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => handleClose(false)}>
                                        {t("testLogbook.finishClose")}
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
                        <AlertDialogTitle className={isDark ? "text-slate-100" : ""}>{t("testLogbook.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription className={isDark ? "text-slate-400" : ""}>
                            {t("testLogbook.confirmDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className={isDark ? "bg-slate-800 border-slate-700 text-slate-300" : ""}>{t("planning.form.no")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTest} className="bg-red-600 hover:bg-red-700 text-white">
                            {t("planning.actions.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}