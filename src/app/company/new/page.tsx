'use client';

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
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/useTheme';
import { ArrowLeft, Building2, House, Loader2, UserCog, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const initialForm = {
    owner_code: '',
    owner_name: '',
    owner_legal_name: '',
    owner_type: '',
    owner_address: '',
    owner_city: '',
    owner_state: '',
    owner_postal_code: '',
    owner_phone: '',
    owner_email: '',
    owner_website: '',
    owner_active: 'Y',
    drone_atc_enabled: false,
    d_flight_enabled: false,
    flytrelay_enabled: false,
    email_notifications_enabled: false,
    easa_operator_code: '',
    tax_id: '',
    registration_number: '',
    license_number: '',
    license_expiry: '',
    admin_username: '',
    admin_fullname: '',
    admin_email: '',
    admin_phone: '',
    admin_timezone: 'Europe/Berlin',
};

type Form = typeof initialForm;

function Field({
    label,
    name,
    value,
    onChange,
    required,
    type = 'text',
    placeholder,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    type?: string;
    placeholder?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={name} className="text-xs font-medium text-muted-foreground">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="h-9 text-sm"
            />
        </div>
    );
}

function SectionCard({
    title,
    description,
    icon: Icon,
    children,
    isDark,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    children: React.ReactNode;
    isDark: boolean;
}) {
    return (
        <div className={`rounded-lg border ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'} overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-100 bg-slate-50/60'} flex items-center gap-3`}>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-violet-50'}`}>
                    <Icon size={14} className={isDark ? 'text-slate-300' : 'text-violet-600'} />
                </div>
                <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{description}</p>
                </div>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

export default function NewCompanyPage() {
    const router = useRouter();
    const { isDark } = useTheme();

    const [form, setForm] = useState<Form>(initialForm);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
    const [uniqueErrors, setUniqueErrors] = useState<Partial<Record<keyof Form, string>>>({});
    const [checking, setChecking] = useState<Partial<Record<keyof Form, boolean>>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.name === 'admin_username' ? e.target.value.toLowerCase() : e.target.value;
        const key = e.target.name as keyof Form;
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: undefined }));
        setUniqueErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const setField = (key: keyof Form, value: string | boolean) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: undefined }));
        setUniqueErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const checkUnique = async (
        key: keyof Form,
        table: 'owner' | 'users',
        field: string,
        value: string,
    ) => {
        if (!value.trim()) return;
        setChecking(prev => ({ ...prev, [key]: true }));
        try {
            const res = await fetch(
                `/api/owner/check-unique?table=${table}&field=${field}&value=${encodeURIComponent(value.trim())}`,
            );
            const data = await res.json();
            if (data.code === 1 && data.exists) {
                setUniqueErrors(prev => ({ ...prev, [key]: data.message }));
            }
        } catch {
            // non-critical — server will revalidate on submit
        } finally {
            setChecking(prev => ({ ...prev, [key]: false }));
        }
    };

    const validate = (): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const urlRegex = /^https?:\/\/.+\..+/;
        const next: Partial<Record<keyof Form, string>> = {};

        if (!form.owner_code.trim()) next.owner_code = 'Required';
        if (!form.owner_name.trim()) next.owner_name = 'Required';
        if (!form.owner_email.trim()) next.owner_email = 'Required';
        else if (!emailRegex.test(form.owner_email)) next.owner_email = 'Invalid email';
        if (!form.owner_website.trim()) next.owner_website = 'Required';
        else if (!urlRegex.test(form.owner_website)) next.owner_website = 'Must start with https://';
        if (!form.admin_username.trim()) next.admin_username = 'Required';
        if (!form.admin_fullname.trim()) next.admin_fullname = 'Required';
        if (!form.admin_email.trim()) next.admin_email = 'Required';
        else if (!emailRegex.test(form.admin_email)) next.admin_email = 'Invalid email';

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            toast.error('Please fix the highlighted fields');
            return;
        }
        if (Object.values(uniqueErrors).some(Boolean)) {
            toast.error('Please resolve the duplicate field errors before submitting');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (data.code === 1) {
                toast.success('Company and admin user created successfully');
                router.push(`/company/${data.data.owner_id}`);
            } else {
                toast.error(data.message || 'Failed to create company');
            }
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputErr = (key: keyof Form) => {
        if (errors[key]) return <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors[key]}</p>;
        if (checking[key]) return <p className="text-xs text-slate-400 mt-1">Checking…</p>;
        if (uniqueErrors[key]) return <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{uniqueErrors[key]}</p>;
        return null;
    };

    return (
        <div className="min-h-screen flex flex-col">
            <div className={`top-0 z-10 backdrop-blur-md transition-colors ${
                isDark
                    ? 'bg-slate-900/80 border-b border-slate-800'
                    : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
            } px-4 sm:px-6 py-4`}>
                <div className="mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-violet-50'}`}>
                            <Building2 size={18} className={isDark ? 'text-slate-300' : 'text-violet-600'} />
                        </div>
                        <div className="min-w-0">
                            <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Create Company
                            </h1>
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Set up a new company and its primary admin account
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 flex-1 sm:flex-none"
                            onClick={() => router.push('/company')}
                            disabled={loading}
                        >
                            <ArrowLeft size={13} /> Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700 text-white"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <><Loader2 size={13} className="animate-spin" /> Creating…</>
                            ) : (
                                'Create Company'
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div className={`px-4 sm:px-6 py-2.5 border-b ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/60'}`}>
                <div className="mx-auto">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink
                                    href="/company"
                                    className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <House size={12} /> Company
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                    Create New
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </div>

            <div className="flex-1 px-4 sm:px-6 py-6">
                <div className="mx-auto space-y-5">

                    <SectionCard
                        title="Company Details"
                        description="Core identity and contact information"
                        icon={Building2}
                        isDark={isDark}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="owner_code" className="text-xs font-medium text-muted-foreground">
                                    Code<span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input id="owner_code" name="owner_code" value={form.owner_code} onChange={handleChange} onBlur={() => checkUnique('owner_code', 'owner', 'owner_code', form.owner_code)} placeholder="e.g. ACME" className="h-9 text-sm" />
                                {inputErr('owner_code')}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="owner_name" className="text-xs font-medium text-muted-foreground">
                                    Company Name<span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input id="owner_name" name="owner_name" value={form.owner_name} onChange={handleChange} placeholder="Acme Corp" className="h-9 text-sm" />
                                {inputErr('owner_name')}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="owner_legal_name" className="text-xs font-medium text-muted-foreground">Legal Name</Label>
                                <Input id="owner_legal_name" name="owner_legal_name" value={form.owner_legal_name} onChange={handleChange} placeholder="Acme Corporation Ltd." className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="owner_type" className="text-xs font-medium text-muted-foreground">Company Type</Label>
                                <Input id="owner_type" name="owner_type" value={form.owner_type} onChange={handleChange} placeholder="e.g. Private, NGO" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="owner_email" className="text-xs font-medium text-muted-foreground">
                                    Email<span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input id="owner_email" name="owner_email" type="email" value={form.owner_email} onChange={handleChange} placeholder="contact@acme.com" className="h-9 text-sm" />
                                {inputErr('owner_email')}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="owner_phone" className="text-xs font-medium text-muted-foreground">Phone</Label>
                                <Input id="owner_phone" name="owner_phone" value={form.owner_phone} onChange={handleChange} onBlur={() => form.owner_phone && checkUnique('owner_phone', 'owner', 'owner_phone', form.owner_phone)} placeholder="+1 555 000 0000" className="h-9 text-sm" />
                                {inputErr('owner_phone')}
                            </div>
                            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                                <Label htmlFor="owner_website" className="text-xs font-medium text-muted-foreground">
                                    Website<span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input id="owner_website" name="owner_website" value={form.owner_website} onChange={handleChange} placeholder="https://acme.com" className="h-9 text-sm" />
                                {inputErr('owner_website')}
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Address"
                        description="Physical location of the company"
                        icon={Building2}
                        isDark={isDark}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                                <Label htmlFor="owner_address" className="text-xs font-medium text-muted-foreground">Street Address</Label>
                                <Input id="owner_address" name="owner_address" value={form.owner_address} onChange={handleChange} placeholder="123 Main Street" className="h-9 text-sm" />
                            </div>
                            <Field label="City" name="owner_city" value={form.owner_city} onChange={handleChange} placeholder="Berlin" />
                            <Field label="State / Region" name="owner_state" value={form.owner_state} onChange={handleChange} placeholder="Bavaria" />
                            <Field label="Postal Code" name="owner_postal_code" value={form.owner_postal_code} onChange={handleChange} placeholder="10115" />
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Legal & Licensing"
                        description="Registration, tax, and license information"
                        icon={Building2}
                        isDark={isDark}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Field label="Tax ID" name="tax_id" value={form.tax_id} onChange={handleChange} placeholder="DE123456789" />
                            <Field label="Registration Number" name="registration_number" value={form.registration_number} onChange={handleChange} />
                            <Field label="License Number" name="license_number" value={form.license_number} onChange={handleChange} />
                            <Field label="License Expiry" name="license_expiry" value={form.license_expiry} onChange={handleChange} type="date" />
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Platform Settings"
                        description="Account status and feature flags"
                        icon={Building2}
                        isDark={isDark}
                    >
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Status */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Status<span className="text-red-500 ml-0.5">*</span>
                                    </Label>
                                    <Select value={form.owner_active} onValueChange={(v) => setField('owner_active', v)}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Y">Active</SelectItem>
                                            <SelectItem value="N">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Field label="EASA Operator Code" name="easa_operator_code" value={form.easa_operator_code} onChange={handleChange} placeholder="e.g. ITA-OP-12345" />
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="flex items-center justify-between gap-4 py-1">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Drone ATC</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">Air Traffic Control integration</p>
                                    </div>
                                    <Switch
                                        checked={form.drone_atc_enabled}
                                        onCheckedChange={(v) => setField('drone_atc_enabled', v)}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4 py-1">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Email Notifications</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">Send alerts to user emails</p>
                                    </div>
                                    <Switch
                                        checked={form.email_notifications_enabled}
                                        onCheckedChange={(v) => setField('email_notifications_enabled', v)}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4 py-1">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>D-Flight</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">D-Flight USSP integration for drone registration and fleet management</p>
                                    </div>
                                    <Switch
                                        checked={form.d_flight_enabled}
                                        onCheckedChange={(v) => setField('d_flight_enabled', v)}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4 py-1">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>FlytRelay</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">FlytRelay drone flight logs and telemetry integration</p>
                                    </div>
                                    <Switch
                                        checked={form.flytrelay_enabled}
                                        onCheckedChange={(v) => setField('flytrelay_enabled', v)}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Primary Admin User"
                        description="This account will manage the company on the platform"
                        icon={UserCog}
                        isDark={isDark}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="admin_username" className="text-xs font-medium text-muted-foreground">
                                    Username<span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input id="admin_username" name="admin_username" value={form.admin_username} onChange={handleChange} onBlur={() => checkUnique('admin_username', 'users', 'username', form.admin_username)} placeholder="john.doe" className="h-9 text-sm" />
                                {inputErr('admin_username')}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="admin_fullname" className="text-xs font-medium text-muted-foreground">
                                    Full Name<span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input id="admin_fullname" name="admin_fullname" value={form.admin_fullname} onChange={handleChange} placeholder="John Doe" className="h-9 text-sm" />
                                {inputErr('admin_fullname')}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="admin_email" className="text-xs font-medium text-muted-foreground">
                                    Email<span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input id="admin_email" name="admin_email" type="email" value={form.admin_email} onChange={handleChange} onBlur={() => checkUnique('admin_email', 'users', 'email', form.admin_email)} placeholder="john@acme.com" className="h-9 text-sm" />
                                {inputErr('admin_email')}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="admin_phone" className="text-xs font-medium text-muted-foreground">Phone</Label>
                                <Input id="admin_phone" name="admin_phone" value={form.admin_phone} onChange={handleChange} onBlur={() => form.admin_phone && checkUnique('admin_phone', 'users', 'phone', form.admin_phone)} placeholder="+1 555 000 0000" className="h-9 text-sm" />
                                {inputErr('admin_phone')}
                            </div>
                            <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                                <Label className="text-xs font-medium text-muted-foreground">Timezone</Label>
                                <Select value={form.admin_timezone} onValueChange={(v) => setField('admin_timezone', v)}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Europe/Berlin">Central Europe (CET/CEST)</SelectItem>
                                        <SelectItem value="Europe/London">UK / Ireland (GMT/BST)</SelectItem>
                                        <SelectItem value="Europe/Paris">France / Belgium (CET/CEST)</SelectItem>
                                        <SelectItem value="Europe/Rome">Italy / Spain (CET/CEST)</SelectItem>
                                        <SelectItem value="UTC">UTC</SelectItem>
                                        <SelectItem value="America/New_York">US Eastern (EST/EDT)</SelectItem>
                                        <SelectItem value="America/Chicago">US Central (CST/CDT)</SelectItem>
                                        <SelectItem value="America/Los_Angeles">US Pacific (PST/PDT)</SelectItem>
                                        <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                                        <SelectItem value="Asia/Dubai">Gulf (GST)</SelectItem>
                                        <SelectItem value="Asia/Tokyo">Japan (JST)</SelectItem>
                                        <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                                        <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Bottom action bar */}
                    <div className={`rounded-lg border ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'} px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3`}>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            An activation email will be sent to the admin user after creation.
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-9 text-xs flex-1 sm:flex-none" onClick={() => router.push('/company')} disabled={loading}>
                                Cancel
                            </Button>
                            <Button size="sm" className="h-9 text-xs flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSubmit} disabled={loading}>
                                {loading ? (
                                    <><Loader2 size={13} className="animate-spin mr-1" /> Creating…</>
                                ) : (
                                    'Create Company'
                                )}
                            </Button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
