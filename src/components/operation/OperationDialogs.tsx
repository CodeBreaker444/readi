import { Operation } from "@/app/missions/table/page";
import { useTimezone } from "@/components/TimezoneProvider";
import { cn, formatDateInTz, formatDateTimeInTz } from "@/lib/utils";
import axios from "axios";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Download, FileText, Loader2, Paperclip, RefreshCw, Settings, Trash2, Upload, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Textarea } from "../ui/textarea";

interface OperationFormProps {
    open: boolean;
    onClose: () => void;
    initial?: Operation | null;
    onSaved: (op: Operation) => void;
}


interface MissionTypeOption {
    mission_type_id: number;
    type_name: string;
}

interface MissionCategoryOption {
    category_id: number;
    category_name: string;
}


type StatusName = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ABORTED';
type Step = 0 | 1 | 2 | 3 | 4;

const DAYS_OF_WEEK = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' },
]

const STATUS_TO_CALENDAR: Record<string, string> = {
    PLANNED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    ABORTED: 'Scheduled',
}

interface PilotOption { user_id: number; first_name: string; last_name: string }
interface ToolOption { tool_id: number; tool_name: string; tool_code: string; in_maintenance?: boolean; has_drone_component?: boolean }
interface MissionTypeOption { mission_type_id: number; type_name: string }
interface MissionCategoryOption { category_id: number; category_name: string }
interface PlanningOption { planning_id: number; planning_name: string; fk_client_id: number; client_name: string }
interface LucProcedureOption { procedure_id: number; procedure_name: string; procedure_code: string }

interface OperationForm {
    mission_name: string;
    mission_code: string;
    mission_description: string;
    location: string;
    notes: string;
    scheduled_start: string;
    scheduled_end: string;
    status_name: StatusName;
    fk_pilot_user_id: string;
    fk_tool_id: string;
    fk_client_id: number | null;
    fk_mission_type_id: string;
    fk_mission_category_id: string;
    is_recurring: boolean;
    days_of_week: number[];
    recur_until: string;
    mission_group_label: string;
    flight_duration: string;
    distance_flown: string;
    fk_planning_id: string;
    fk_luc_procedure_id: string;
}

interface OperationFormProps {
    open: boolean;
    onClose: () => void;
    onSaved: (op: Operation) => void;
    initial?: Operation | null;
    onSuccess?: () => void;
}


const EMPTY_FORM: OperationForm = {
    mission_name: '',
    mission_code: '',
    mission_description: '',
    location: '',
    notes: '',
    scheduled_start: '',
    scheduled_end: '',
    status_name: 'PLANNED',
    fk_pilot_user_id: '',
    fk_tool_id: '',
    fk_client_id: null,
    fk_mission_type_id: '',
    fk_mission_category_id: '',
    is_recurring: false,
    days_of_week: [],
    recur_until: '',
    mission_group_label: '',
    flight_duration: '',
    distance_flown: '',
    fk_planning_id: '',
    fk_luc_procedure_id: '',
};

export function OperationDialog({ open, onClose, initial, onSaved, onSuccess }: OperationFormProps) {
    const isEdit = !!initial;
    const { t } = useTranslation();
    const { timezone } = useTimezone();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState<Step>(0);

    const STEPS = [
        { id: 0, label: t('operations.dialog.steps.details'), icon: ClipboardCheck },
        { id: 1, label: t('operations.dialog.steps.schedule'), icon: Clock },
        { id: 2, label: t('operations.dialog.steps.assets'), icon: Settings },
        { id: 3, label: t('operations.dialog.steps.pilot'), icon: User },
        { id: 4, label: t('operations.dialog.steps.review'), icon: CheckCircle2 },
    ];

    const [pilots, setPilots] = useState<PilotOption[]>([]);
    const [tools, setTools] = useState<ToolOption[]>([]);
    const [missionTypes, setMissionTypes] = useState<MissionTypeOption[]>([]);
    const [missionCategories, setMissionCategories] = useState<MissionCategoryOption[]>([]);
    const [plannings, setPlannings] = useState<PlanningOption[]>([]);
    const [lucProcedures, setLucProcedures] = useState<LucProcedureOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [form, setForm] = useState<OperationForm>(EMPTY_FORM);

    useEffect(() => {
        if (!open) { setStep(0); return; }
        setLoadingOptions(true);
        axios.get('/api/operation/options')
            .then((res) => {
                setPilots(res.data.pilots ?? []);
                setTools(res.data.tools ?? []);
                setMissionTypes(res.data.types ?? []);
                setMissionCategories(res.data.categories ?? []);
                setPlannings(res.data.plannings ?? []);
                setLucProcedures(res.data.lucProcedures ?? []);
            })
            .catch(() => toast.error(t('operations.dialog.toast.loadOptionsError')))
            .finally(() => setLoadingOptions(false));
    }, [open]);

    useEffect(() => {
        if (initial) {
            setForm({
                mission_name: initial.mission_name ?? '',
                mission_code: initial.mission_code ?? '',
                mission_description: initial.mission_description ?? '',
                location: initial.location ?? '',
                notes: initial.notes ?? '',
                scheduled_start: initial.scheduled_start ?? '',
                scheduled_end: initial.actual_end ?? '',
                status_name: (initial.status_name as StatusName) ?? 'PLANNED',
                fk_client_id: initial.fk_client_id ?? null,
                fk_pilot_user_id: initial.fk_pilot_user_id?.toString() ?? '',
                fk_tool_id: initial.fk_tool_id?.toString() ?? '',
                fk_mission_type_id: initial.fk_mission_type_id?.toString() ?? '',
                fk_mission_category_id: initial.fk_mission_category_id?.toString() ?? '',
                is_recurring: false,
                days_of_week: [],
                recur_until: '',
                mission_group_label: '',
                flight_duration: initial.flight_duration?.toString() ?? '',
                distance_flown: initial.distance_flown?.toString() ?? '',
                fk_planning_id: (initial as any).fk_planning_id?.toString() ?? '',
                fk_luc_procedure_id: initial.fk_luc_procedure_id?.toString() ?? '',
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [initial, open]);

    function toIsoString(val: string): string | undefined {
        if (!val) return undefined;
        const normalized = val.length === 16 ? `${val}:00.000Z` : val;
        return isNaN(Date.parse(normalized)) ? undefined : normalized;
    }

    function handleSubmit() {
        startTransition(async () => {
            try {
                if (!isEdit && form.is_recurring) {
                    if (!form.fk_luc_procedure_id) {
                        toast.error(t('operations.dialog.validation.lucRequired'));
                        return;
                    }
                    const startDate = form.scheduled_start.slice(0, 10);
                    if (startDate > form.recur_until) {
                        toast.error(t('operations.dialog.validation.recurrenceEndDate'));
                        return;
                    }
                    const daysSet = new Set(form.days_of_week);
                    let cursor = new Date(startDate + 'T00:00:00Z');
                    const until = new Date(form.recur_until + 'T23:59:59Z');
                    let hasMatch = false;
                    for (let i = 0; i < 366 && cursor <= until; i++, cursor = new Date(cursor.getTime() + 86400000)) {
                        if (daysSet.has(cursor.getUTCDay())) { hasMatch = true; break; }
                    }
                    if (!hasMatch) {
                        toast.error(t('operations.dialog.validation.noMatchingDaysRange', { start: startDate, end: form.recur_until }));
                        return;
                    }

                    const res = await axios.post('/api/operation', {
                        mission_name: form.mission_name.trim(),
                        mission_code: form.mission_code?.trim() || undefined,
                        mission_description: form.mission_description || undefined,
                        scheduled_start: form.scheduled_start,
                        fk_pilot_user_id: form.fk_pilot_user_id ? parseInt(form.fk_pilot_user_id) : undefined,
                        fk_tool_id: form.fk_tool_id ? parseInt(form.fk_tool_id) : undefined,
                        fk_client_id: form.fk_client_id ? form.fk_client_id : undefined,
                        fk_mission_type_id: form.fk_mission_type_id ? parseInt(form.fk_mission_type_id) : undefined,
                        fk_mission_category_id: form.fk_mission_category_id ? parseInt(form.fk_mission_category_id) : undefined,
                        fk_planning_id: form.fk_planning_id ? parseInt(form.fk_planning_id) : undefined,
                        fk_luc_procedure_id: parseInt(form.fk_luc_procedure_id, 10),
                        location: form.location || undefined,
                        notes: form.notes || undefined,
                        is_recurring: true,
                        days_of_week: form.days_of_week,
                        recur_until: form.recur_until,
                        mission_group_label: form.mission_group_label || undefined,
                    });
                    if (!res.data.success) throw new Error(res.data.error ?? 'Failed to create recurring operations');
                    toast.success(t('operations.dialog.toast.recurringSuccess', { count: res.data.count }));
                    onSuccess?.();
                    onClose();
                    return;
                }

                if (!isEdit && !form.fk_luc_procedure_id) {
                    toast.error(t('operations.dialog.validation.lucRequired'));
                    return;
                }

                const payload = {
                    mission_name: form.mission_name.trim(),
                    mission_code: form.mission_code?.trim() || undefined,
                    mission_description: form.mission_description || undefined,
                    location: form.location || undefined,
                    notes: form.notes || undefined,
                    scheduled_start: toIsoString(form.scheduled_start),
                    actual_end: toIsoString(form.scheduled_end) ?? null,
                    fk_pilot_user_id: form.fk_pilot_user_id ? parseInt(form.fk_pilot_user_id) : undefined,
                    fk_tool_id: form.fk_tool_id ? parseInt(form.fk_tool_id) : undefined,
                    fk_client_id: form.fk_client_id ? form.fk_client_id : undefined,
                    fk_mission_type_id: form.fk_mission_type_id ? parseInt(form.fk_mission_type_id) : undefined,
                    fk_mission_category_id: form.fk_mission_category_id ? parseInt(form.fk_mission_category_id) : undefined,
                    status_name: form.status_name,
                    flight_duration: form.flight_duration ? parseInt(form.flight_duration) : undefined,
                    distance_flown: form.distance_flown ? parseFloat(form.distance_flown) : undefined,
                    fk_planning_id: form.fk_planning_id ? parseInt(form.fk_planning_id) : undefined,
                    ...(!isEdit ? { fk_luc_procedure_id: parseInt(form.fk_luc_procedure_id, 10) } : {}),
                };

                let saved: { data: Operation };
                if (isEdit && initial) {
                    saved = await axios.put(`/api/operation/${initial.pilot_mission_id}`, payload);
                } else {
                    saved = await axios.post('/api/operation', payload);
                }
                onSaved(saved.data);
                toast.success(isEdit ? t('operations.dialog.toast.operationUpdated') : t('operations.dialog.toast.operationCreated'));
                onClose();
            } catch (err: any) {
                const msg = err?.response?.data?.error ?? (err instanceof Error ? err.message : 'Something went wrong');
                toast.error(msg);
            }
        });
    }

    const selectedPilot = pilots.find((p) => p.user_id.toString() === form.fk_pilot_user_id);
    const selectedTool = tools.find((t) => t.tool_id.toString() === form.fk_tool_id);
    const selectedType = missionTypes.find((t) => t.mission_type_id.toString() === form.fk_mission_type_id);
    const selectedCategory = missionCategories.find((c) => c.category_id.toString() === form.fk_mission_category_id);
    const selectedLuc = lucProcedures.find((p) => p.procedure_id.toString() === form.fk_luc_procedure_id);

    const canGoNext = () => {
        if (step === 0) return !!form.mission_name.trim() && !!form.mission_code.trim();
        if (step === 1) {
            if (!form.scheduled_start) return false;
            if (form.is_recurring) {
                if (form.days_of_week.length === 0 || !form.recur_until) return false;
                const startDate = form.scheduled_start.slice(0, 10);
                if (startDate > form.recur_until) return false;
                const daysSet = new Set(form.days_of_week);
                let cursor = new Date(startDate + 'T00:00:00Z');
                const until = new Date(form.recur_until + 'T23:59:59Z');
                for (let i = 0; i < 366 && cursor <= until; i++, cursor = new Date(cursor.getTime() + 86400000)) {
                    if (daysSet.has(cursor.getUTCDay())) return true;
                }
                return false;
            }
            return true;
        }
        if (step === 2) return isEdit || !!form.fk_luc_procedure_id;
        if (step === 3) return !!form.fk_pilot_user_id;
        return true;
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="text-base font-semibold">
                        {isEdit ? t('operations.dialog.editTitle') : t('operations.dialog.newTitle')}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        {isEdit ? t('operations.dialog.editSubtitle') : t('operations.dialog.newSubtitle')}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pt-4 pb-2">
                    <div className="flex items-center gap-0">
                        {STEPS.map((s, i) => {
                            const Icon = s.icon;
                            const done = step > s.id;
                            const active = step === s.id;
                            return (
                                <div key={s.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center gap-1 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => { if (done || isEdit) setStep(s.id as Step); }}
                                            className={cn(
                                                'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                                                done
                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                                                    : active
                                                        ? 'bg-violet-600 text-white ring-4 ring-violet-100 dark:ring-violet-900 cursor-default'
                                                        : isEdit
                                                            ? 'bg-muted text-muted-foreground hover:bg-violet-100 hover:text-violet-700 cursor-pointer'
                                                            : 'bg-muted text-muted-foreground cursor-default'
                                            )}
                                        >
                                            {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                        </button>
                                        <span className={cn(
                                            'text-[10px] font-medium whitespace-nowrap',
                                            active ? 'text-violet-600' : done ? 'text-emerald-600' : isEdit ? 'text-muted-foreground hover:text-violet-600 cursor-pointer' : 'text-muted-foreground'
                                        )}>
                                            {s.label}
                                        </span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={cn(
                                            'h-0.5 flex-1 mt-[-14px] mx-1 transition-all',
                                            done ? 'bg-emerald-400' : 'bg-muted'
                                        )} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="px-6 py-5 h-90 overflow-y-auto">

                    {step === 0 && (
                        <div className="space-y-3">
                            <SectionTitle>{t('operations.dialog.sections.missionDetails')}</SectionTitle>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="mission_name">{t('operations.dialog.fields.missionName')} <span className="text-red-500">*</span></Label>
                                    <Input id="mission_name" placeholder={t('operations.dialog.placeholders.missionName')}
                                        value={form.mission_name}
                                        onChange={(e) => setForm((f) => ({ ...f, mission_name: e.target.value }))} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="mission_code">{t('operations.dialog.fields.missionCode')} <span className="text-red-500">*</span></Label>
                                    <Input id="mission_code" placeholder={t('operations.dialog.placeholders.missionCode')}
                                        value={form.mission_code}
                                        onChange={(e) => setForm((f) => ({ ...f, mission_code: e.target.value }))} />
                                </div>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="desc">{t('operations.dialog.fields.description')}</Label>
                                <Textarea id="desc" rows={2} placeholder={t('operations.dialog.placeholders.description')}
                                    value={form.mission_description}
                                    onChange={(e) => setForm((f) => ({ ...f, mission_description: e.target.value }))} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="location">{t('operations.dialog.fields.location')}</Label>
                                <Input id="location" placeholder={t('operations.dialog.placeholders.location')}
                                    value={form.location}
                                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="notes">{t('operations.dialog.fields.notes')}</Label>
                                <Textarea id="notes" rows={2} placeholder={t('operations.dialog.placeholders.notes')}
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-3">
                            <SectionTitle>{t('operations.dialog.sections.scheduleStatus')}</SectionTitle>
                            <div className="grid gap-1.5">
                                <Label htmlFor="scheduled_start">
                                    {t('operations.dialog.fields.scheduledStart')} {form.is_recurring && <span className="text-red-500">*</span>}
                                </Label>
                                <Input id="scheduled_start" type="datetime-local"
                                    value={form.scheduled_start}
                                    onChange={(e) => setForm((f) => ({ ...f, scheduled_start: e.target.value }))} />
                            </div>
                            {!form.is_recurring && (
                                <div className="grid gap-1.5">
                                    <Label htmlFor="scheduled_end">{t('operations.dialog.fields.scheduledEnd')}</Label>
                                    <Input id="scheduled_end" type="datetime-local"
                                        value={form.scheduled_end}
                                        onChange={(e) => setForm((f) => ({ ...f, scheduled_end: e.target.value }))} />
                                </div>
                            )}
                            <div className="grid gap-1.5">
                                <Label>{t('operations.dialog.fields.status')}</Label>
                                <Select value={form.status_name}
                                    onValueChange={(v) => setForm((f) => ({ ...f, status_name: v as StatusName }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PLANNED">{t('operations.dialog.status.planned')}</SelectItem>
                                        <SelectItem value="IN_PROGRESS">{t('operations.dialog.status.inProgress')}</SelectItem>
                                        <SelectItem value="COMPLETED">{t('operations.dialog.status.completed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {isEdit && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="flight_duration">{t('operations.dialog.fields.flightDuration')}</Label>
                                        <Input id="flight_duration" type="number" min="0" placeholder={t('operations.dialog.placeholders.flightDuration')}
                                            value={form.flight_duration}
                                            onChange={(e) => setForm((f) => ({ ...f, flight_duration: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="distance_flown">{t('operations.dialog.fields.distanceFlown')}</Label>
                                        <Input id="distance_flown" type="number" min="0" placeholder={t('operations.dialog.placeholders.distanceFlown')}
                                            value={form.distance_flown}
                                            onChange={(e) => setForm((f) => ({ ...f, distance_flown: e.target.value }))} />
                                    </div>
                                </div>
                            )}

                            {!isEdit && (
                                <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="is_recurring"
                                            checked={form.is_recurring}
                                            onCheckedChange={(v) => setForm((f) => ({
                                                ...f,
                                                is_recurring: !!v,
                                                days_of_week: [],
                                                recur_until: '',
                                            }))}
                                            className="border-sky-500 data-[state=checked]:bg-sky-600"
                                        />
                                        <label htmlFor="is_recurring" className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
                                            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                                            {t('operations.dialog.fields.recurrent')}
                                        </label>
                                    </div>

                                    {form.is_recurring && (
                                        <div className="space-y-3 pl-1">
                                            <div className="grid gap-1.5">
                                                <Label className="text-xs font-medium">{t('operations.dialog.fields.daysOfWeek')} <span className="text-red-500">*</span></Label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {DAYS_OF_WEEK.map((day) => {
                                                        const checked = form.days_of_week.includes(day.value)
                                                        return (
                                                            <button
                                                                key={day.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    const next = checked
                                                                        ? form.days_of_week.filter((d) => d !== day.value)
                                                                        : [...form.days_of_week, day.value]
                                                                    setForm((f) => ({ ...f, days_of_week: next }))
                                                                }}
                                                                className={cn(
                                                                    'px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors',
                                                                    checked
                                                                        ? 'bg-sky-600 border-sky-600 text-white'
                                                                        : 'bg-background border-border text-muted-foreground hover:bg-muted'
                                                                )}
                                                            >
                                                                {day.label}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                {form.days_of_week.length === 0 && (
                                                    <p className="text-xs text-destructive">{t('operations.dialog.validation.selectAtLeastOneDay')}</p>
                                                )}
                                                {form.days_of_week.length > 0 && form.scheduled_start && form.recur_until && (() => {
                                                    const startDate = form.scheduled_start.slice(0, 10);
                                                    if (startDate > form.recur_until) return null;
                                                    const daysSet = new Set(form.days_of_week);
                                                    let cursor = new Date(startDate + 'T00:00:00Z');
                                                    const until = new Date(form.recur_until + 'T23:59:59Z');
                                                    let found = false;
                                                    for (let i = 0; i < 366 && cursor <= until; i++, cursor = new Date(cursor.getTime() + 86400000)) {
                                                        if (daysSet.has(cursor.getUTCDay())) { found = true; break; }
                                                    }
                                                    return !found ? (
                                                        <p className="text-xs text-destructive">
                                                            {t('operations.dialog.validation.noMatchingDays', { start: startDate, end: form.recur_until })}
                                                        </p>
                                                    ) : null;
                                                })()}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="recur_until" className="text-xs font-medium">{t('operations.dialog.fields.repeatUntil')} <span className="text-red-500">*</span></Label>
                                                    <Input id="recur_until" type="date"
                                                        value={form.recur_until}
                                                        onChange={(e) => setForm((f) => ({ ...f, recur_until: e.target.value }))} />
                                                </div>
                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="group_label" className="text-xs font-medium">{t('operations.dialog.fields.groupLabel')}</Label>
                                                    <Input id="group_label" placeholder={t('operations.dialog.placeholders.groupLabel')}
                                                        value={form.mission_group_label}
                                                        onChange={(e) => setForm((f) => ({ ...f, mission_group_label: e.target.value }))} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-3">
                            <SectionTitle>{t('operations.dialog.sections.assets')}</SectionTitle>
                            <div className="grid gap-1.5">
                                <Label>{t('operations.dialog.fields.droneSystem')}</Label>
                                <Select key={`tool-${tools.length}`} value={form.fk_tool_id}
                                    onValueChange={(v) => setForm((f) => ({ ...f, fk_tool_id: v }))}
                                    disabled={loadingOptions}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingOptions ? t('operations.dialog.placeholders.loading') : t('operations.dialog.placeholders.selectTool')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tools.map((tool) => (
                                            <SelectItem
                                                key={tool.tool_id}
                                                value={tool.tool_id.toString()}
                                                disabled={tool.in_maintenance || tool.has_drone_component === false}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className={tool.has_drone_component === false ? 'opacity-40' : ''}>
                                                        {tool.tool_name} ({tool.tool_code})
                                                    </span>
                                                    {tool.in_maintenance && (
                                                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 leading-none">
                                                            {t('operations.dialog.badges.inMaintenance')}
                                                        </span>
                                                    )}
                                                    {tool.has_drone_component === false && (
                                                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 leading-none">
                                                            {t('operations.dialog.badges.droneNotAttached')}
                                                        </span>
                                                    )}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label>{t('operations.dialog.fields.missionCategory')}</Label>
                                <Select key={`cat-${missionCategories.length}`} value={form.fk_mission_category_id}
                                    onValueChange={(v) => setForm((f) => ({ ...f, fk_mission_category_id: v }))}
                                    disabled={loadingOptions}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingOptions ? t('operations.dialog.placeholders.loading') : t('operations.dialog.placeholders.selectCategory')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {missionCategories.map((c) => (
                                            <SelectItem key={c.category_id} value={c.category_id.toString()}>
                                                {c.category_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label>{t('operations.dialog.fields.missionType')}</Label>
                                <Select key={`type-${missionTypes.length}`} value={form.fk_mission_type_id}
                                    onValueChange={(v) => setForm((f) => ({ ...f, fk_mission_type_id: v }))}
                                    disabled={loadingOptions}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingOptions ? t('operations.dialog.placeholders.loading') : t('operations.dialog.placeholders.selectType')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {missionTypes.map((mType) => (
                                            <SelectItem key={mType.mission_type_id} value={mType.mission_type_id.toString()}>
                                                {mType.type_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label>{t('operations.dialog.fields.clientPlanning')}</Label>
                                <Select key={`planning-${plannings.length}`} value={form.fk_planning_id}
                                    onValueChange={(v) => {
                                        const selected = plannings.find(p => p.planning_id.toString() === v);
                                        setForm((f) => ({ ...f, fk_planning_id: v, fk_client_id: selected?.fk_client_id ?? f.fk_client_id }));
                                    }}
                                    disabled={loadingOptions}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingOptions ? t('operations.dialog.placeholders.loading') : t('operations.dialog.placeholders.selectClientPlanning')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plannings.map((p) => (
                                            <SelectItem key={p.planning_id} value={p.planning_id.toString()}>
                                                {p.client_name ? `${p.client_name} — ` : ''}{p.planning_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label>
                                    {t('operations.dialog.fields.lucProcedure')}
                                    {!isEdit && <span className="text-red-500"> *</span>}
                                </Label>
                                <Select
                                    key={`luc-${lucProcedures.length}`}
                                    value={form.fk_luc_procedure_id}
                                    onValueChange={(v) => setForm((f) => ({ ...f, fk_luc_procedure_id: v }))}
                                    disabled={loadingOptions}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingOptions ? t('operations.dialog.placeholders.loading') : lucProcedures.length === 0 ? t('operations.dialog.placeholders.noMissionProcedures') : t('operations.dialog.placeholders.selectLuc')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {lucProcedures.map((p) => (
                                            <SelectItem key={p.procedure_id} value={p.procedure_id.toString()}>
                                                {p.procedure_code} — {p.procedure_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!loadingOptions && lucProcedures.length === 0 && (
                                    <p className="text-xs text-destructive">
                                        {t('operations.dialog.validation.createLucHint')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-3">
                            <SectionTitle>{t('operations.dialog.sections.pilotInCommand')}</SectionTitle>
                            <div className="grid gap-1.5">
                                <Label>{t('operations.dialog.fields.pilotInCommand')} <span className="text-red-500">*</span></Label>
                                <Select key={`pilot-${pilots.length}`} value={form.fk_pilot_user_id}
                                    onValueChange={(v) => setForm((f) => ({ ...f, fk_pilot_user_id: v }))}
                                    disabled={loadingOptions}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingOptions ? t('operations.dialog.placeholders.loading') : t('operations.dialog.placeholders.selectPilot')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pilots.map((p) => (
                                            <SelectItem key={p.user_id} value={p.user_id.toString()}>
                                                {p.first_name} {p.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedPilot && (
                                <div className="rounded-md border bg-muted/30 px-4 py-3">
                                    <p className="text-xs text-muted-foreground mb-0.5">{t('operations.dialog.fields.selectedPilot')}</p>
                                    <p className="font-medium">{selectedPilot.first_name} {selectedPilot.last_name}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-3">
                            <SectionTitle>{t('operations.dialog.sections.missionSummary')}</SectionTitle>
                            <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                                    <ReviewRow label={t('operations.dialog.review.missionName')} value={form.mission_name} />
                                    <ReviewRow label={t('operations.dialog.review.missionCode')} value={form.mission_code} />
                                    <ReviewRow label={t('operations.dialog.review.location')} value={form.location} />
                                    <ReviewRow label={t('operations.dialog.review.status')} value={form.status_name} />
                                    <ReviewRow label={t('operations.dialog.review.scheduled')} value={form.scheduled_start ? formatDateTimeInTz(form.scheduled_start, timezone) : undefined} />
                                    <ReviewRow label={t('operations.dialog.review.pilot')} value={selectedPilot ? `${selectedPilot.first_name} ${selectedPilot.last_name}` : undefined} />
                                    <ReviewRow label={t('operations.dialog.review.tool')} value={selectedTool ? `${selectedTool.tool_name} (${selectedTool.tool_code})` : undefined} />
                                    <ReviewRow label={t('operations.dialog.review.type')} value={selectedType?.type_name} />
                                    <ReviewRow label={t('operations.dialog.review.category')} value={selectedCategory?.category_name} />
                                    <ReviewRow
                                        label={t('operations.dialog.review.lucProcedure')}
                                        value={selectedLuc ? `${selectedLuc.procedure_code} — ${selectedLuc.procedure_name}` : undefined}
                                    />
                                    {form.is_recurring && (
                                        <>
                                            <ReviewRow label={t('operations.dialog.review.recurrence')} value={t('operations.dialog.review.weekly')} />
                                            <ReviewRow label={t('operations.dialog.review.repeatUntil')} value={form.recur_until} />
                                            <ReviewRow
                                                label={t('operations.dialog.review.days')}
                                                value={DAYS_OF_WEEK.filter(d => form.days_of_week.includes(d.value)).map(d => d.label).join(', ')}
                                            />
                                            {form.mission_group_label && <ReviewRow label={t('operations.dialog.review.groupLabel')} value={form.mission_group_label} />}
                                        </>
                                    )}
                                </div>
                                {(form.mission_description || form.notes) && (
                                    <div className="border-t pt-2.5 space-y-2">
                                        {form.mission_description && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('operations.dialog.review.description')}</p>
                                                <p className="text-sm mt-0.5">{form.mission_description}</p>
                                            </div>
                                        )}
                                        {form.notes && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('operations.dialog.review.notes')}</p>
                                                <p className="text-sm mt-0.5">{form.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {!form.mission_name.trim() && (
                                <p className="text-xs text-destructive">{t('operations.dialog.validation.missionNameRequired')}</p>
                            )}
                            {!form.fk_pilot_user_id && (
                                <p className="text-xs text-destructive">{t('operations.dialog.validation.pilotRequired')}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-6 pb-6 pt-2 border-t bg-muted/20">
                    <Button variant="outline" size="sm"
                        onClick={() => step === 0 ? onClose() : setStep((s) => (s - 1) as Step)}
                        disabled={isPending}
                        className="gap-1">
                        {step === 0
                            ? t('operations.dialog.buttons.cancel')
                            : <><ChevronLeft className="h-4 w-4" /> {t('operations.dialog.buttons.previous')}</>}
                    </Button>

                    {step < 4 ? (
                        <Button size="sm"
                            onClick={() => setStep((s) => (s + 1) as Step)}
                            disabled={!canGoNext()}
                            className="gap-1 bg-violet-600 hover:bg-violet-700 text-white">
                            {t('operations.dialog.buttons.next')} <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button size="sm"
                            onClick={handleSubmit}
                            disabled={isPending || !form.mission_name.trim() || !form.fk_pilot_user_id || (!isEdit && !form.fk_luc_procedure_id)}
                            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white min-w-[140px]">
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isEdit ? t('operations.dialog.buttons.saveChanges') : form.is_recurring ? t('operations.dialog.buttons.createRecurring') : t('operations.dialog.buttons.createOperation')}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}


function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h4 className="text-sm font-semibold text-foreground border-b pb-2 mb-3">{children}</h4>;
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-sm">{value || '—'}</p>
        </div>
    );
}
export function formatBytes(bytes?: number) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso?: string, tz?: string) {
    return formatDateInTz(iso, tz);
}

interface Attachment {
    attachment_id: number;
    file_name: string;
    file_type?: string;
    file_size?: number;
    s3_url: string;
    uploaded_at?: string;
}

export function AttachmentsDialog({ open, onClose, operationId, operationName }: {
    open: boolean;
    onClose: () => void;
    operationId: number;
    operationName: string;
}) {
    const { t } = useTranslation();
    const { timezone } = useTimezone();
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const loadAttachments = useCallback(async () => {
        if (!operationId) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/operation/${operationId}/attachment`);
            setAttachments(data);
        } catch (error) {
            console.error("Failed to fetch attachments:", error);
        } finally {
            setLoading(false);
        }
    }, [operationId]);

    useEffect(() => {
        if (open) loadAttachments();
    }, [open, loadAttachments]);

    async function handleUpload(files: FileList | null) {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploaded: Attachment[] = [];
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append('file', file);
                const res = await fetch(`/api/operation/${operationId}/attachment`, {
                    method: 'POST',
                    body: fd,
                });
                if (!res.ok) {
                    const json = await res.json();
                    throw new Error(json.error ?? 'Upload failed');
                }
                const json = await res.json();
                uploaded.push(json.attachment);
            }
            setAttachments((prev) => [...uploaded, ...prev]);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    }

    async function handleDownload(attachment: Attachment) {
        try {
            const { data } = await axios.get(
                `/api/operation/${operationId}/attachment/${attachment.attachment_id}/download`
            );
            window.open(data.url, '_blank');
        } catch {
            toast.error('Failed to get download link');
        }
    }

    async function handleDeleteAttachment(attachmentId: number) {
        try {
            await axios.delete(`/api/operation/${operationId}/attachment/${attachmentId}`);
            setAttachments((prev) => prev.filter((a) => a.attachment_id !== attachmentId));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed');
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-150">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        {t('operations.dialog.attachments.title')}
                    </DialogTitle>
                    <DialogDescription className="truncate">{operationName}</DialogDescription>
                </DialogHeader>

                <div
                    className={cn(
                        'relative rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer',
                        dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/40',
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
                    onClick={() => fileRef.current?.click()}
                >
                    <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm">{t('operations.dialog.attachments.uploading')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="h-8 w-8" />
                            <p className="text-sm font-medium">{t('operations.dialog.attachments.dropFiles')}</p>
                            <p className="text-xs">{t('operations.dialog.attachments.fileLimit')}</p>
                        </div>
                    )}
                </div>

                <div className="h-60 overflow-y-auto scrollbar-thin space-y-1.5">
                    {loading && (
                        Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-md border px-3 py-2">
                                <Skeleton className="h-8 w-8 rounded" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-[60%]" />
                                    <Skeleton className="h-3 w-[40%]" />
                                </div>
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </div>
                        ))
                    )}
                    {!loading && attachments.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">{t('operations.dialog.attachments.noAttachments')}</p>
                    )}
                    {attachments.map((a) => (
                        <div key={a.attachment_id} className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
                            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <a href={a.s3_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">
                                    {a.file_name}
                                </a>
                                <p className="text-xs text-muted-foreground">{formatBytes(a.file_size)} · {formatDate(a.uploaded_at, timezone)}</p>
                            </div>
                            <button onClick={() => handleDeleteAttachment(a.attachment_id)} className="ml-auto shrink-0 text-sm hover:text-destructive transition-colors">
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => handleDownload(a)}
                                className="block truncate text-sm font-medium text-primary hover:underline"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('operations.dialog.attachments.close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function DeleteDialog({ open, onClose, operation, onDeleted }: {
    open: boolean;
    onClose: () => void;
    operation: Operation | null;
    onDeleted: (id: number) => void;
}) {
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();

    function handleDelete() {
        if (!operation) return;
        startTransition(async () => {
            try {
                await axios.delete(`/api/operation/${operation.pilot_mission_id}`);
                onDeleted(operation.pilot_mission_id);
                toast.success(t('operations.dialog.delete.success'));
                onClose();
            } catch (err) {
                toast.error(err instanceof Error ? err.message : t('operations.dialog.delete.error'));
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-105">
                <DialogHeader>
                    <DialogTitle>{t('operations.dialog.delete.title')}</DialogTitle>
                    <DialogDescription>
                        {t('operations.dialog.delete.description')}{' '}
                        <span className="font-medium text-foreground">{operation?.mission_name}</span>. {t('operations.dialog.delete.undone')}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>{t('operations.dialog.delete.cancel')}</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('operations.dialog.delete.delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}