'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
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
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { toast } from 'sonner';

interface AddOwnerModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

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
    tax_id: '',
    registration_number: '',
    license_number: '',
    license_expiry: '',
    admin_username: '',
    admin_fullname: '',
    admin_email: '',
    admin_phone: '',
    admin_timezone: 'IST',
};
export default function AddOwnerModal({ open, onClose, onSuccess }: AddOwnerModalProps) {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        setError('');

        if (!form.owner_code || !form.owner_name || !form.owner_email || !form.owner_website) {
            setError('Please fill all required company fields');
            return;
        }
        if (!form.admin_username || !form.admin_fullname || !form.admin_email) {
            setError('Please fill all required admin fields');
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
                setForm(initialForm);
                onSuccess();
                toast.success('Company and admin user created successfully');
                onClose();
            } else {
                setError(data.message || 'Something went wrong');
                toast.error(data.message || 'Failed to create company');
            }
        } catch {
            setError('Network error');
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setForm(initialForm);
            setError('');
            onClose();
        }
    };

    const companyFields = [
        { name: 'owner_code', label: 'Code', required: true },
        { name: 'owner_name', label: 'Name', required: true },
        { name: 'owner_legal_name', label: 'Legal Name' },
        { name: 'owner_type', label: 'Type' },
        { name: 'owner_address', label: 'Address' },
        { name: 'owner_city', label: 'City' },
        { name: 'owner_state', label: 'State' },
        { name: 'owner_postal_code', label: 'Postal Code' },
        { name: 'owner_phone', label: 'Phone' },
        { name: 'owner_email', label: 'Email', required: true },
        { name: 'owner_website', label: 'Website', required: true },
        { name: 'tax_id', label: 'Tax ID' },
        { name: 'registration_number', label: 'Registration No.' },
        { name: 'license_number', label: 'License No.' },
        { name: 'license_expiry', label: 'License Expiry', type: 'date' },
    ];

    const adminFields = [
        { name: 'admin_username', label: 'Username', required: true },
        { name: 'admin_fullname', label: 'Full Name', required: true },
        { name: 'admin_email', label: 'Email', required: true },
        { name: 'admin_phone', label: 'Phone' },
    ];

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Company</DialogTitle>
                </DialogHeader>

                {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

                <div className="space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">Company Details</p>
                    <div className="grid grid-cols-2 gap-4">
                        {companyFields.map((field) => (
                            <div key={field.name} className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor={field.name} className="text-right text-sm">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type={field.type || 'text'}
                                    value={form[field.name as keyof typeof form]}
                                    onChange={handleChange}
                                    className="col-span-2"
                                />
                            </div>
                        ))}
                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label className="text-right text-sm">
                                Status <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={form.owner_active}
                                onValueChange={(val) => setForm((prev) => ({ ...prev, owner_active: val }))}
                            >
                                <SelectTrigger className="col-span-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Y">Active</SelectItem>
                                    <SelectItem value="N">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">Admin User</p>
                    <div className="grid grid-cols-2 gap-4">
                        {adminFields.map((field) => (
                            <div key={field.name} className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor={field.name} className="text-right text-sm">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={form[field.name as keyof typeof form]}
                                    onChange={handleChange}
                                    className="col-span-2"
                                />
                            </div>
                        ))}
                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="admin_timezone" className="text-right text-sm">Timezone</Label>
                            <Select
                                value={form.admin_timezone}
                                onValueChange={(val) => setForm((prev) => ({ ...prev, admin_timezone: val }))}
                            >
                                <SelectTrigger className="col-span-2">
                                    <SelectValue placeholder="Select Timezone" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                                    <Separator className="my-1" />
                                    <SelectItem value="UTC">UTC</SelectItem>
                                    <SelectItem value="America/New_York">US Eastern</SelectItem>
                                    <SelectItem value="America/Chicago">US Central</SelectItem>
                                    <SelectItem value="America/Los_Angeles">US Pacific</SelectItem>
                                    <SelectItem value="Europe/London">UK</SelectItem>
                                    <SelectItem value="Europe/Rome">Central Europe</SelectItem>
                                    <SelectItem value="Asia/Dubai">Gulf</SelectItem>
                                    <SelectItem value="Asia/Tokyo">Japan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        className="bg-black text-white hover:bg-black/80"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Add Company'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}