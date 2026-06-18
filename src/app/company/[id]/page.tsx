'use client';

import DeleteOwnerDialog from '@/components/company/DeleteOwnerDialog';
import { OwnerData } from '@/components/tables/OwnerColumn';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import {
    ArrowLeft,
    BarChart3,
    Building2,
    Edit,
    Eye,
    EyeOff,
    HardDrive,
    House,
    Power,
    Save,
    Shield,
    Trash2,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface OwnerMetrics {
    total_users: number;
    active_users: number;
    inactive_users: number;
    users_by_role: Record<string, number>;
    storage_bytes: number;
    storage_file_count: number;
}

type GeneralForm = {
    owner_name: string;
    owner_legal_name: string;
    owner_type: string;
    owner_email: string;
    owner_phone: string;
    owner_website: string;
    owner_address: string;
    owner_city: string;
    owner_state: string;
    owner_postal_code: string;
    tax_id: string;
    registration_number: string;
    license_number: string;
    license_expiry: string;
};

type SecurityForm = { owner_active: string };

type FeaturesForm = {
    drone_atc_enabled: boolean;
    d_flight_enabled: boolean;
    email_notifications_enabled: boolean;
    easa_operator_code: string;
};

function toStr(v: string | null | undefined) { return v ?? ''; }

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function buildPayload(general: GeneralForm, security: SecurityForm, features: FeaturesForm) {
    return {
        owner_name: general.owner_name,
        owner_legal_name: general.owner_legal_name || null,
        owner_type: general.owner_type || null,
        owner_email: general.owner_email,
        owner_phone: general.owner_phone || null,
        owner_website: general.owner_website,
        owner_address: general.owner_address || null,
        owner_city: general.owner_city || null,
        owner_state: general.owner_state || null,
        owner_postal_code: general.owner_postal_code || null,
        tax_id: general.tax_id || null,
        registration_number: general.registration_number || null,
        license_number: general.license_number || null,
        license_expiry: general.license_expiry || null,
        owner_active: security.owner_active,
        drone_atc_enabled: features.drone_atc_enabled,
        d_flight_enabled: features.d_flight_enabled,
        email_notifications_enabled: features.email_notifications_enabled,
        easa_operator_code: features.easa_operator_code || null,
    };
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin', PIC: 'Pilot in Command', OPM: 'Operations Manager',
    SM: 'Safety Manager', AM: 'Asset Manager', CMM: 'Compliance Manager',
    RM: 'Risk Manager', TM: 'Training Manager', DC: 'Document Controller',
    SLA: 'SLA Manager', CLIENT: 'Client',
};

export default function CompanyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { isDark } = useTheme();

    const [owner, setOwner] = useState<OwnerData | null>(null);
    const [metrics, setMetrics] = useState<OwnerMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [generalEditing, setGeneralEditing] = useState(false);
    const [securityEditing, setSecurityEditing] = useState(false);
    const [featuresEditing, setFeaturesEditing] = useState(false);

    const [generalForm, setGeneralForm] = useState<GeneralForm>({
        owner_name: '', owner_legal_name: '', owner_type: '', owner_email: '',
        owner_phone: '', owner_website: '', owner_address: '', owner_city: '',
        owner_state: '', owner_postal_code: '', tax_id: '', registration_number: '',
        license_number: '', license_expiry: '',
    });
    const [securityForm, setSecurityForm] = useState<SecurityForm>({ owner_active: 'Y' });
    const [featuresForm, setFeaturesForm] = useState<FeaturesForm>({
        drone_atc_enabled: false, d_flight_enabled: false, email_notifications_enabled: false, easa_operator_code: '',
    });

    // Password reset state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);
    const [pwError, setPwError] = useState('');

    const populateForms = useCallback((o: OwnerData) => {
        setGeneralForm({
            owner_name: toStr(o.owner_name), owner_legal_name: toStr(o.owner_legal_name),
            owner_type: toStr(o.owner_type), owner_email: toStr(o.owner_email),
            owner_phone: toStr(o.owner_phone), owner_website: toStr(o.owner_website),
            owner_address: toStr(o.owner_address), owner_city: toStr(o.owner_city),
            owner_state: toStr(o.owner_state), owner_postal_code: toStr(o.owner_postal_code),
            tax_id: toStr(o.tax_id), registration_number: toStr(o.registration_number),
            license_number: toStr(o.license_number),
            license_expiry: o.license_expiry ? o.license_expiry.slice(0, 10) : '',
        });
        setSecurityForm({ owner_active: o.owner_active });
        setFeaturesForm({
            drone_atc_enabled: o.drone_atc_enabled ?? false,
            d_flight_enabled: o.d_flight_enabled ?? false,
            email_notifications_enabled: o.email_notifications_enabled ?? false,
            easa_operator_code: toStr(o.easa_operator_code),
        });
    }, []);

    const fetchOwner = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/owner/${id}`);
            if (res.data.code === 1) { setOwner(res.data.data); populateForms(res.data.data); }
        } catch { toast.error('Failed to load company'); }
        finally { setLoading(false); }
    }, [id, populateForms]);

    const fetchMetrics = useCallback(async () => {
        setMetricsLoading(true);
        try {
            const res = await axios.get(`/api/owner/${id}/metrics`);
            if (res.data.code === 1) setMetrics(res.data.data);
        } catch { /* non-critical */ }
        finally { setMetricsLoading(false); }
    }, [id]);

    useEffect(() => { fetchOwner(); fetchMetrics(); }, [fetchOwner, fetchMetrics]);

    const saveChanges = async () => {
        if (!owner) return;
        setSaving(true);
        try {
            const res = await axios.put(`/api/owner/${id}`, buildPayload(generalForm, securityForm, featuresForm));
            if (res.data.code === 1) {
                toast.success('Company updated');
                await fetchOwner();
                setGeneralEditing(false); setSecurityEditing(false); setFeaturesEditing(false);
            } else { toast.error(res.data.message || 'Update failed'); }
        } catch { toast.error('Network error'); }
        finally { setSaving(false); }
    };

    const handlePasswordReset = async () => {
        setPwError('');
        if (!newPassword || newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
        if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
        if (!owner?.admin_user) return;
        setPwSaving(true);
        try {
            const res = await axios.put(`/api/owner/${id}/admin-password`, {
                admin_user_id: owner.admin_user.user_id,
                new_password: newPassword,
            });
            if (res.data.code === 1) {
                toast.success('Admin password updated successfully');
                setNewPassword(''); setConfirmPassword('');
            } else { setPwError(res.data.message || 'Failed to update password'); }
        } catch { setPwError('Network error'); }
        finally { setPwSaving(false); }
    };

    const handleActivate = async () => {
        if (!owner) return;
        setSaving(true);
        try {
            const res = await axios.put(`/api/owner/${id}`, buildPayload(generalForm, { owner_active: 'Y' }, featuresForm));
            if (res.data.code === 1) {
                toast.success('Company activated');
                await fetchOwner();
            } else {
                toast.error(res.data.message || 'Failed to activate company');
            }
        } catch { toast.error('Network error'); }
        finally { setSaving(false); }
    };

    const cancelGeneral = () => { if (owner) populateForms(owner); setGeneralEditing(false); };
    const cancelSecurity = () => { if (owner) populateForms(owner); setSecurityEditing(false); };
    const cancelFeatures = () => { if (owner) populateForms(owner); setFeaturesEditing(false); };

    const fieldClass = `text-sm ${isDark ? 'text-white' : 'text-slate-900'}`;
    const labelClass = `text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
    const cardClass = `rounded-lg border ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`;

    // ── Skeleton ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-0">
                <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="mx-auto max-w-[1800px]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-9 h-9 rounded-lg" />
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-16 rounded" /><Skeleton className="h-4 w-14 rounded-full" />
                                    </div>
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-36 rounded-md" />
                        </div>
                    </div>
                </div>
                <div className={`px-6 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="mx-auto max-w-[1800px] flex items-center gap-2">
                        <Skeleton className="h-3 w-10" /><Skeleton className="h-3 w-3" /><Skeleton className="h-3 w-28" />
                    </div>
                </div>
                <div className="px-6 py-6 mx-auto max-w-[1800px] space-y-6">
                    <div className="flex gap-6 border-b pb-3">
                        {[80, 68, 88, 112].map((w) => <Skeleton key={w} className="h-4 rounded" style={{ width: w }} />)}
                    </div>
                    <div className={`${cardClass} p-6 space-y-6`}>
                        <div className="flex items-center justify-between">
                            <div className="space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-64" /></div>
                            <Skeleton className="h-8 w-16 rounded-md" />
                        </div>
                        <Skeleton className="h-px w-full" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-full" /></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!owner) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Company not found.</p>
                <Button variant="outline" size="sm" onClick={() => router.push('/company')}>
                    <ArrowLeft size={14} className="mr-1" /> Back to Companies
                </Button>
            </div>
        );
    }

    const EditActions = ({ onCancel }: { onCancel: () => void }) => (
        <div className="flex gap-2 self-start sm:self-auto">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={onCancel}><X size={13} /> Cancel</Button>
            <Button size="sm" className="gap-1.5 text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white" onClick={saveChanges} disabled={saving}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save'}
            </Button>
        </div>
    );

    return (
        <div className="space-y-0">
            {/* Header */}
            <div className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark ? 'bg-slate-900/80 border-b border-slate-800' : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'} px-6 py-4`}>
                <div className="mx-auto max-w-[1800px]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-violet-50'}`}>
                                <Building2 size={18} className={isDark ? 'text-slate-300' : 'text-violet-600'} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <h1 className={`font-semibold text-base tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{owner.owner_name}</h1>
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{owner.owner_code}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${owner.owner_active === 'Y' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                        {owner.owner_active === 'Y' ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Created {new Date(owner.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        {owner.owner_active === 'N' ? (
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs w-full sm:w-auto shrink-0 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                                onClick={handleActivate} disabled={saving}>
                                <Power size={13} /> Activate Company
                            </Button>
                        ) : (
                            <Button size="sm" variant="destructive" className="h-8 gap-1.5 text-xs w-full sm:w-auto shrink-0"
                                onClick={() => setDeleteOpen(true)} disabled={owner.owner_id === 1}
                                title={owner.owner_id === 1 ? 'This company cannot be deactivated' : undefined}>
                                <Trash2 size={13} /> Deactivate Company
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Breadcrumbs */}
            <div className={`px-6 py-2.5 border-b ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/60'}`}>
                <div className="mx-auto max-w-[1800px]">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/company" className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                                    <House size={12} /> Company
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{owner.owner_name}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 py-6 mx-auto max-w-[1800px]">
                <Tabs defaultValue="general">
                    <div className="-mx-6 px-6 overflow-x-auto mb-6">
                        <TabsList variant="line" className="w-max min-w-full justify-start border-b rounded-none h-auto pb-0">
                            <TabsTrigger value="general" className="gap-1.5 pb-3 whitespace-nowrap"><Building2 size={14} /> General Info</TabsTrigger>
                            <TabsTrigger value="security" className="gap-1.5 pb-3 whitespace-nowrap"><Shield size={14} /> Security</TabsTrigger>
                            <TabsTrigger value="features" className="gap-1.5 pb-3 whitespace-nowrap"><Zap size={14} /> Feature Flags</TabsTrigger>
                            <TabsTrigger value="usage" className="gap-1.5 pb-3 whitespace-nowrap"><BarChart3 size={14} /> Usage &amp; Metrics</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* ── GENERAL TAB ── */}
                    <TabsContent value="general">
                        <div className={`${cardClass} p-6 space-y-6`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Company Information</h2>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Core company details and registration info</p>
                                </div>
                                {!generalEditing
                                    ? <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 self-start sm:self-auto" onClick={() => setGeneralEditing(true)}><Edit size={13} /> Edit</Button>
                                    : <EditActions onCancel={cancelGeneral} />}
                            </div>
                            <Separator />
                            <div>
                                <p className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Basic Details</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[
                                        { key: 'owner_name', label: 'Company Name', required: true },
                                        { key: 'owner_legal_name', label: 'Legal Name' },
                                        { key: 'owner_type', label: 'Company Type' },
                                        { key: 'owner_email', label: 'Email', required: true },
                                        { key: 'owner_phone', label: 'Phone' },
                                        { key: 'owner_website', label: 'Website', required: true },
                                    ].map(({ key, label, required }) => (
                                        <div key={key} className="space-y-1.5">
                                            <Label className={labelClass}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
                                            {generalEditing
                                                ? <Input value={generalForm[key as keyof GeneralForm]} onChange={(e) => setGeneralForm(p => ({ ...p, [key]: e.target.value }))} className="h-8 text-sm" />
                                                : <p className={fieldClass}>{generalForm[key as keyof GeneralForm] || '—'}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <p className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Address</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[
                                        { key: 'owner_address', label: 'Address' }, { key: 'owner_city', label: 'City' },
                                        { key: 'owner_state', label: 'State / Region' }, { key: 'owner_postal_code', label: 'Postal Code' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="space-y-1.5">
                                            <Label className={labelClass}>{label}</Label>
                                            {generalEditing
                                                ? <Input value={generalForm[key as keyof GeneralForm]} onChange={(e) => setGeneralForm(p => ({ ...p, [key]: e.target.value }))} className="h-8 text-sm" />
                                                : <p className={fieldClass}>{generalForm[key as keyof GeneralForm] || '—'}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <p className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Legal &amp; Licensing</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[
                                        { key: 'tax_id', label: 'Tax ID' }, { key: 'registration_number', label: 'Registration Number' },
                                        { key: 'license_number', label: 'License Number' }, { key: 'license_expiry', label: 'License Expiry', type: 'date' },
                                    ].map(({ key, label, type }) => (
                                        <div key={key} className="space-y-1.5">
                                            <Label className={labelClass}>{label}</Label>
                                            {generalEditing
                                                ? <Input type={type || 'text'} value={generalForm[key as keyof GeneralForm]} onChange={(e) => setGeneralForm(p => ({ ...p, [key]: e.target.value }))} className="h-8 text-sm" />
                                                : <p className={fieldClass}>{key === 'license_expiry' && generalForm.license_expiry ? new Date(generalForm.license_expiry).toLocaleDateString('en-GB') : generalForm[key as keyof GeneralForm] || '—'}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── SECURITY TAB ── */}
                    <TabsContent value="security">
                        <div className="space-y-4">
                            {/* Account Status */}
                            <div className={`${cardClass} p-6 space-y-5`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Account Status</h2>
                                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Control whether this company can access the platform</p>
                                    </div>
                                    {!securityEditing
                                        ? <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 self-start sm:self-auto" onClick={() => setSecurityEditing(true)}><Edit size={13} /> Edit</Button>
                                        : <EditActions onCancel={cancelSecurity} />}
                                </div>
                                <Separator />
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Company Active</p>
                                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Disabling blocks all users in this company from logging in</p>
                                    </div>
                                    {securityEditing ? (
                                        <Select value={securityForm.owner_active} onValueChange={(v) => setSecurityForm({ owner_active: v })}>
                                            <SelectTrigger className="w-full sm:w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Y">Active</SelectItem>
                                                <SelectItem value="N">Disabled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <span className={`self-start text-xs px-2 py-1 rounded-full font-medium ${securityForm.owner_active === 'Y' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                            {securityForm.owner_active === 'Y' ? 'Active' : 'Disabled'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Admin User Info */}
                            <div className={`${cardClass} p-6 space-y-5`}>
                                <div>
                                    <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Primary Admin User</h2>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>The admin user linked to this company</p>
                                </div>
                                <Separator />
                                {owner.admin_user ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {[
                                            { label: 'Full Name', value: [owner.admin_user.first_name, owner.admin_user.last_name].filter(Boolean).join(' ') || '—' },
                                            { label: 'Username', value: owner.admin_user.username },
                                            { label: 'Email', value: owner.admin_user.email },
                                            { label: 'Phone', value: owner.admin_user.phone || '—' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="space-y-1.5">
                                                <Label className={labelClass}>{label}</Label>
                                                <p className={fieldClass}>{value}</p>
                                            </div>
                                        ))}
                                        <div className="space-y-1.5">
                                            <Label className={labelClass}>Status</Label>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${owner.admin_user.user_active === 'Y' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {owner.admin_user.user_active === 'Y' ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No admin user assigned to this company.</p>
                                )}
                            </div>

                            {/* Reset Admin Password */}
                            {owner.admin_user && (
                                <div className={`${cardClass} p-6 space-y-5`}>
                                    <div>
                                        <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Reset Admin Password</h2>
                                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Set a new password for <span className="font-medium">{owner.admin_user.username}</span>. It will be stored as a bcrypt hash.
                                        </p>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                                        <div className="space-y-1.5">
                                            <Label className={labelClass}>New Password <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <Input
                                                    type={showNewPw ? 'text' : 'password'}
                                                    value={newPassword}
                                                    onChange={(e) => { setNewPassword(e.target.value); setPwError(''); }}
                                                    placeholder="Min. 8 characters"
                                                    className="h-9 text-sm pr-9"
                                                />
                                                <button type="button" onClick={() => setShowNewPw(v => !v)}
                                                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                                                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className={labelClass}>Confirm Password <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPw ? 'text' : 'password'}
                                                    value={confirmPassword}
                                                    onChange={(e) => { setConfirmPassword(e.target.value); setPwError(''); }}
                                                    placeholder="Repeat new password"
                                                    className="h-9 text-sm pr-9"
                                                />
                                                <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                                                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                                                    {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {pwError && <p className="text-xs text-red-500">{pwError}</p>}
                                    <Button size="sm" className="h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                                        onClick={handlePasswordReset} disabled={pwSaving || !newPassword || !confirmPassword}>
                                        <Save size={13} /> {pwSaving ? 'Updating…' : 'Update Password'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* ── FEATURES TAB ── */}
                    <TabsContent value="features">
                        <div className={`${cardClass} p-6 space-y-5`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Feature Flags</h2>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Enable or disable platform features for this company</p>
                                </div>
                                {!featuresEditing
                                    ? <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 self-start sm:self-auto" onClick={() => setFeaturesEditing(true)}><Edit size={13} /> Edit</Button>
                                    : <EditActions onCancel={cancelFeatures} />}
                            </div>
                            <Separator />
                            <div className="space-y-6">
                                {[
                                    { key: 'drone_atc_enabled' as const, label: 'Drone ATC', desc: 'Enables Air Traffic Control integration for drone operations' },
                                    { key: 'd_flight_enabled' as const, label: 'D-Flight', desc: 'Enables D-Flight USSP integration for drone registration and fleet management' },
                                    { key: 'email_notifications_enabled' as const, label: 'Email Notifications', desc: 'Send email alerts to users for important events' },
                                ].map(({ key, label, desc }) => (
                                    <div key={key}>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div>
                                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{label}</p>
                                                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</p>
                                            </div>
                                            <Switch checked={featuresForm[key]} onCheckedChange={(v) => setFeaturesForm(p => ({ ...p, [key]: v }))}
                                                disabled={!featuresEditing} className="data-[state=checked]:bg-green-500" />
                                        </div>
                                        <Separator className="mt-6" />
                                    </div>
                                ))}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div>
                                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>EASA Operator Code</p>
                                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>European Union Aviation Safety Agency operator registration code</p>
                                    </div>
                                    {featuresEditing
                                        ? <Input value={featuresForm.easa_operator_code} onChange={(e) => setFeaturesForm(p => ({ ...p, easa_operator_code: e.target.value }))} placeholder="e.g. ITA-OP-12345" className="h-8 text-sm w-full sm:w-56" />
                                        : <p className={`text-sm ${featuresForm.easa_operator_code ? fieldClass : isDark ? 'text-slate-600' : 'text-slate-400'}`}>{featuresForm.easa_operator_code || 'Not set'}</p>}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── USAGE TAB ── */}
                    <TabsContent value="usage">
                        <div className="space-y-4">
                            {/* Stat cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Users', value: metricsLoading ? '—' : String(metrics?.total_users ?? 0), icon: Users, color: isDark ? 'text-violet-400' : 'text-violet-600', bg: isDark ? 'bg-violet-900/20' : 'bg-violet-50' },
                                    { label: 'Active Users', value: metricsLoading ? '—' : String(metrics?.active_users ?? 0), icon: Users, color: 'text-green-600', bg: isDark ? 'bg-green-900/20' : 'bg-green-50' },
                                    { label: 'Inactive Users', value: metricsLoading ? '—' : String(metrics?.inactive_users ?? 0), icon: Users, color: isDark ? 'text-slate-400' : 'text-slate-500', bg: isDark ? 'bg-slate-800' : 'bg-slate-50' },
                                    { label: 'Tracked Storage', value: metricsLoading ? '—' : formatBytes(metrics?.storage_bytes ?? 0), icon: HardDrive, color: isDark ? 'text-blue-400' : 'text-blue-600', bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50' },
                                ].map(({ label, value, icon: Icon, color, bg }) => (
                                    <div key={label} className={`${cardClass} p-5 flex items-center gap-4`}>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
                                            <Icon size={18} className={color} />
                                        </div>
                                        <div>
                                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
                                            <p className={`text-2xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* S3 storage detail */}
                            <div className={`${cardClass} p-6`}>
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <HardDrive size={15} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                        <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tracked File Storage</h2>
                                    </div>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} max-w-xs text-right`}>
                                        Covers documents, evaluation files, maintenance attachments, and repository files.
                                    </p>
                                </div>
                                {metricsLoading ? (
                                    <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-4 w-48" />)}</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <p className={labelClass}>Total File Size</p>
                                            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {formatBytes(metrics?.storage_bytes ?? 0)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className={labelClass}>Total File Revisions</p>
                                            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {metrics?.storage_file_count ?? 0} file{(metrics?.storage_file_count ?? 0) !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Users by role */}
                            <div className={`${cardClass} p-6`}>
                                <h2 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Users by Role</h2>
                                {metricsLoading ? <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Loading…</p>
                                    : metrics && Object.keys(metrics.users_by_role).length > 0 ? (
                                        <div className="space-y-2">
                                            {Object.entries(metrics.users_by_role).sort(([, a], [, b]) => b - a).map(([role, count]) => (
                                                <div key={role} className="flex items-center gap-3">
                                                    <div className="w-36 shrink-0">
                                                        <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{ROLE_LABELS[role] ?? role}</span>
                                                    </div>
                                                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round((count / (metrics.total_users || 1)) * 100)}%` }} />
                                                    </div>
                                                    <span className={`text-xs w-6 text-right tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No users found for this company.</p>}
                            </div>

                            {/* Account overview */}
                            <div className={`${cardClass} p-6`}>
                                <h2 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Account Overview</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[
                                        { label: 'Company Code', value: owner.owner_code },
                                        { label: 'Created', value: new Date(owner.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                                        { label: 'Drone ATC', value: owner.drone_atc_enabled ? 'Enabled' : 'Disabled' },
                                        { label: 'D-Flight', value: owner.d_flight_enabled ? 'Enabled' : 'Disabled' },
                                        { label: 'Email Notifications', value: owner.email_notifications_enabled ? 'Enabled' : 'Disabled' },
                                        { label: 'EASA Code', value: owner.easa_operator_code || 'Not set' },
                                        { label: 'Status', value: owner.owner_active === 'Y' ? 'Active' : 'Disabled' },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="space-y-1">
                                            <p className={labelClass}>{label}</p>
                                            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <DeleteOwnerDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onSuccess={() => router.push('/company')} owner={owner} />
        </div>
    );
}
