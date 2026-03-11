'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { CalendarDays, ClipboardPlus, FileText, FolderOpen, Loader2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface LucProcedure {
    luc_procedure_id: number;
    luc_procedure_code: string;
    luc_procedure_desc?: string;
}

interface PilotUser {
    user_id: number;
    fullname: string;
    user_profile_code?: string;
}

interface AddPlanningModalProps {
    open: boolean;
    evaluationId: number;
    clientId: number;
    onClose: () => void;
    onCreated?: (planningId: number) => void;
}


export function AddPlanningModal({
    open,
    evaluationId,
    clientId,
    onClose,
    onCreated,
}: AddPlanningModalProps) {
    const currentYear = new Date().getFullYear();

    const [lucProcedureId, setLucProcedureId] = useState('');
    const [pilotId, setPilotId] = useState('');
    const [planningFolder, setPlanningFolder] = useState('');
    const [planningStatus] = useState('NEW');
    const [requestDate, setRequestDate] = useState(() =>
        new Date().toISOString().split('T')[0]
    );
    const [planningYear, setPlanningYear] = useState(String(currentYear));
    const [planningDesc, setPlanningDesc] = useState('');
    const [planningType, setPlanningType] = useState('');

    const [procedures, setProcedures] = useState<LucProcedure[]>([]);
    const [pilots, setPilots] = useState<PilotUser[]>([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        async function loadDropdowns() {
            try {
                setLoadingDropdowns(true);
                const [procRes, pilotRes] = await Promise.all([
                    axios.get("/api/evaluation/luc-procedures?type=PLANNING"),
                    axios.get('/api/evaluation/planning/pilot'),
                ]);
                const formattedProcedures = (procRes.data.data ?? []).map((p: any) => ({
                    procedure_id: p.luc_procedure_id,
                    procedure_code: p.luc_procedure_code,
                    procedure_name: p.luc_procedure_desc
                }));

                setProcedures(formattedProcedures);
                setProcedures(procRes.data.data ?? []);
                setPilots(pilotRes.data.data ?? []);
            } catch {
                toast.error('Failed to load form data');
            } finally {
                setLoadingDropdowns(false);
            }
        }
        loadDropdowns();
    }, [open]);

    function handleClose() {
        setLucProcedureId('');
        setPilotId('');
        setPlanningFolder('');
        setRequestDate(new Date().toISOString().split('T')[0]);
        setPlanningYear(String(currentYear));
        setPlanningDesc('');
        setPlanningType('');
        onClose();
    }

    function validate(): string | null {
        if (!lucProcedureId || lucProcedureId === '0')
            return 'Please select a LUC Procedure.';
        if (!pilotId || pilotId === '0')
            return 'Please assign a Pilot in Command.';
        if (!planningDesc.trim()) return 'Description is required.';
        if (!requestDate) return 'Request date is required.';
        return null;
    }

    async function handleSubmit() {
        const error = validate();
        if (error) {
            toast.error(error);
            return;
        }

        const payload = {
            fk_evaluation_id: evaluationId,
            fk_client_id: clientId,
            fk_luc_procedure_id: Number(lucProcedureId),
            assigned_to_user_id: Number(pilotId),
            planning_desc: planningDesc.trim(),
            planning_status: planningStatus,
            planning_request_date: requestDate,
            planning_year: Number(planningYear),
            planning_type: planningType.trim(),
            planning_folder: planningFolder.trim(),
            planning_result: 'PROGRESS',
        };

        try {
            setSubmitting(true);
            const res = await axios.post('/api/evaluation/planning', payload);
            if (res.data.code === 1) {
                toast.success('Planning request created successfully!');
                onCreated?.(res.data.data.planning_id);
                handleClose();
            } else {
                toast.error(res.data.message ?? 'Failed to create planning');
            }
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ?? 'Failed to create planning';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    const yearOptions = [
        currentYear - 1,
        currentYear,
        currentYear + 1,
        currentYear + 2,
    ];

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="!max-w-[900px] w-[90vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100">
                            <ClipboardPlus className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold">
                                Add Planning Request
                            </DialogTitle>
                            <DialogDescription className="text-xs mt-0.5">
                                [GO.00.P01] — Fill the form to create a new planning from this evaluation.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {loadingDropdowns ? (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-28" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-3 w-12" />
                                    <Skeleton className="h-9 w-full" />
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-10" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                        </div>

                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                ) : (
                    <div className="space-y-5 py-2">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="luc_procedure" className="text-xs font-medium flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-slate-400" />
                                    LUC Procedure
                                    <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Select value={lucProcedureId} onValueChange={setLucProcedureId}>
                                    <SelectTrigger id="luc_procedure" className="h-9 text-sm">
                                        <SelectValue placeholder="Select LUC Procedure" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {procedures.length === 0 ? (
                                            <SelectItem value="__empty" disabled>
                                                No procedures available
                                            </SelectItem>
                                        ) : (
                                            procedures.map((p) => (
                                                <SelectItem
                                                    key={p.luc_procedure_id}
                                                    value={String(p.luc_procedure_id)}
                                                >
                                                    {p.luc_procedure_code}
                                                    {p.luc_procedure_desc ? ` — ${p.luc_procedure_desc}` : ''}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="pilot" className="text-xs font-medium flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    Assign PIC (Pilot in Command)
                                    <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Select value={pilotId} onValueChange={setPilotId}>
                                    <SelectTrigger id="pilot" className="h-9 text-sm">
                                        <SelectValue placeholder="Select PIC" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pilots.length === 0 ? (
                                            <SelectItem value="__empty" disabled>
                                                No pilots available
                                            </SelectItem>
                                        ) : (
                                            pilots.map((p) => (
                                                <SelectItem
                                                    key={p.user_id}
                                                    value={String(p.user_id)}
                                                >
                                                    {p.fullname}
                                                    {p.user_profile_code
                                                        ? ` [${p.user_profile_code}]`
                                                        : ''}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="folder" className="text-xs font-medium flex items-center gap-1">
                                    <FolderOpen className="w-3 h-3 text-slate-400" />
                                    Folder Docs
                                </Label>
                                <Input
                                    id="folder"
                                    className="h-9 text-sm"
                                    placeholder="e.g. /docs/2025"
                                    value={planningFolder}
                                    onChange={(e) => setPlanningFolder(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Status</Label>
                                <Input
                                    className="h-9 text-sm bg-slate-50"
                                    value="New Planning"
                                    readOnly
                                    disabled
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="req_date" className="text-xs font-medium flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3 text-slate-400" />
                                    Request Date
                                    <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input
                                    id="req_date"
                                    type="date"
                                    className="h-9 text-sm"
                                    value={requestDate}
                                    onChange={(e) => setRequestDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="year" className="text-xs font-medium">
                                    Year Reference
                                </Label>
                                <Select value={planningYear} onValueChange={setPlanningYear}>
                                    <SelectTrigger id="year" className="h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map((y) => (
                                            <SelectItem key={y} value={String(y)}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 col-span-1">
                                <Label htmlFor="desc" className="text-xs font-medium">
                                    Description
                                    <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input
                                    id="desc"
                                    className="h-9 text-sm"
                                    placeholder="Planning description…"
                                    value={planningDesc}
                                    onChange={(e) => setPlanningDesc(e.target.value)}
                                    maxLength={500}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="type" className="text-xs font-medium">
                                    Type
                                </Label>
                                <Input
                                    id="type"
                                    className="h-9 text-sm"
                                    placeholder="e.g. VLOS, BVLOS"
                                    value={planningType}
                                    onChange={(e) => setPlanningType(e.target.value)}
                                    maxLength={100}
                                />
                            </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 flex items-center gap-3">
                            <div className="text-xs text-slate-500">
                                <span className="font-medium text-slate-700">Evaluation:</span>{' '}
                                <span className="font-mono text-violet-600">EVAL_{evaluationId}</span>
                            </div>
                            <div className="h-3 w-px bg-slate-300" />
                            <div className="text-xs text-slate-500">
                                <span className="font-medium text-slate-700">Client ID:</span>{' '}
                                <span className="font-mono">{clientId}</span>
                            </div>
                            <div className="h-3 w-px bg-slate-300" />
                            <div className="text-xs text-slate-500">
                                <span className="font-medium text-slate-700">Result:</span>{' '}
                                <span className="font-mono text-emerald-600">PROGRESS</span>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                        onClick={handleSubmit}
                        disabled={submitting || loadingDropdowns}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Creating…
                            </>
                        ) : (
                            <>
                                <ClipboardPlus className="h-3.5 w-3.5" />
                                Add New Planning
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}