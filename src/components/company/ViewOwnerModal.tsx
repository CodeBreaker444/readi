'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { OwnerData } from '../tables/OwnerColumn';

interface ViewOwnerModalProps {
  open: boolean;
  onClose: () => void;
  owner: OwnerData | null;
}

export default function ViewOwnerModal({ open, onClose, owner }: ViewOwnerModalProps) {
  if (!owner) return null;

  const companyFields = [
    { label: 'Code', value: owner.owner_code },
    { label: 'Name', value: owner.owner_name },
    { label: 'Legal Name', value: owner.owner_legal_name || '—' },
    { label: 'Type', value: owner.owner_type || '—' },
    { label: 'Email', value: owner.owner_email },
    { label: 'Phone', value: owner.owner_phone || '—' },
    { label: 'Address', value: owner.owner_address || '—' },
    { label: 'City', value: owner.owner_city || '—' },
    { label: 'State', value: owner.owner_state || '—' },
    { label: 'Postal Code', value: owner.owner_postal_code || '—' },
    { label: 'Website', value: owner.owner_website },
    { label: 'Tax ID', value: owner.tax_id || '—' },
    { label: 'Registration No.', value: owner.registration_number || '—' },
    { label: 'License No.', value: owner.license_number || '—' },
    { label: 'License Expiry', value: owner.license_expiry ? new Date(owner.license_expiry).toLocaleDateString() : '—' },
    {
      label: 'Status',
      value: owner.owner_active === 'Y' ? 'Active' : 'Disabled',
      badge: true,
      active: owner.owner_active === 'Y',
    },
    {
      label: 'Created',
      value: new Date(owner.created_at).toLocaleDateString(),
    },
  ];

  const admin = owner.admin_user;

  const adminFields = admin
    ? [
        { label: 'Username', value: admin.username },
        { label: 'Name', value: `${admin.first_name} ${admin.last_name}`.trim() || '—' },
        { label: 'Email', value: admin.email },
        { label: 'Phone', value: admin.phone || '—' },
        {
          label: 'Status',
          value: admin.user_active === 'Y' ? 'Active' : 'Inactive',
          badge: true,
          active: admin.user_active === 'Y',
        },
      ]
    : [];

  const renderField = (field: any) => (
    <div key={field.label} className="grid grid-cols-3 items-center gap-2">
      <Label className="text-right text-sm font-medium text-muted-foreground">
        {field.label}
      </Label>
      <div className="col-span-2">
        {field.badge ? (
          <span
            className={`rounded px-2 py-1 text-xs ${
              field.active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {field.value}
          </span>
        ) : (
          <p className="text-sm">{field.value}</p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Company Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Company Information</p>
          <div className="grid grid-cols-2 gap-3">
            {companyFields.map(renderField)}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Admin User</p>
          {admin ? (
            <div className="grid grid-cols-2 gap-3">
              {adminFields.map(renderField)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No admin user assigned
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}