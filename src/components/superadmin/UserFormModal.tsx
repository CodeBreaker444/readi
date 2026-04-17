'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
  { value: 8, label: 'Pilot in Command (PIC)' },
  { value: 9, label: 'Operation Manager (OPM)' },
  { value: 10, label: 'Safety Manager (SM)' },
  { value: 11, label: 'Accountable Manager (AM)' },
  { value: 12, label: 'Compliance Monitoring Manager (CMM)' },
  { value: 13, label: 'Responsabile Manutenzione (RM)' },
  { value: 14, label: 'Training Manager (TM)' },
  { value: 15, label: 'Data Controller (DC)' },
  { value: 16, label: 'SLA Manager (SLA)' },
  { value: 17, label: 'Administrator (ADMIN)' },
];


interface UserFormModalProps {
  isOpen: boolean;
  clients: { client_id: number; client_name: string }[];
  owners?: { owner_id: number; owner_name: string }[];
  isSuperAdmin?: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  userData?: any;
  onSubmit: (data: any) => void;
  isDark: boolean;
  canEditEmail?: boolean;
}

export function UserFormModal({
  isOpen,
  clients,
  owners = [],
  isSuperAdmin = false,
  onClose,
  mode,
  userData,
  onSubmit,
  isDark,
  canEditEmail = true,
}: UserFormModalProps) {
  const [formData, setFormData] = useState(() => {
    const defaults = {
      username: '',
      fullname: '',
      email: '',
      phone: '',
      fk_user_profile_id: 0,
      fk_client_id: 0,
      owner_id: 0,
      user_type: 'EMPLOYEE',
      is_viewer: 'N',
      is_manager: 'N',
      active: 1,
    };
    if (!userData) return defaults;
    return {
      ...defaults,
      ...userData,
      phone: userData.phone ?? userData.user_phone ?? '',
      fk_user_profile_id: userData.fk_user_profile_id ?? userData.profile_id ?? 0,
      fk_client_id: userData.fk_client_id ?? 0,
      user_type: userData.user_type || 'EMPLOYEE',
      is_viewer: userData.is_viewer || 'N',
      is_manager: userData.is_manager || 'N',
      active: userData.active ?? 1,
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isSuperAdmin && mode === 'add' && (!formData.owner_id || formData.owner_id === 0)) {
      toast.error('Please assign a company to the user');
      return;
    }
    if (!formData.fk_user_profile_id || formData.fk_user_profile_id === 0) {
      toast.error('Please select a role for the user');
      return;
    }
    setIsSubmitting(true);
    Promise.resolve(onSubmit(formData)).finally(() => {
      setIsSubmitting(false);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-3xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 text-white' : ''}`}>
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New User' : 'Edit User'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username" className="pb-2">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                required
                disabled={mode === 'edit'}
              />
            </div>
            <div>
              <Label htmlFor="fullname" className="pb-2">Full Name *</Label>
              <Input
                id="fullname"
                value={formData.fullname}
                onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="pb-2">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!canEditEmail && mode === 'edit'}
                readOnly={!canEditEmail && mode === 'edit'}
                className={!canEditEmail && mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}
              />
            </div>
            <div>
              <Label htmlFor="phone" className="pb-2">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {isSuperAdmin && mode === 'add' && (
            <div>
              <Label htmlFor="owner_id" className="pb-2">
                Company <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.owner_id?.toString()}
                onValueChange={(value) => setFormData({ ...formData, owner_id: parseInt(value) })}
              >
                <SelectTrigger className={isDark ? 'bg-slate-900 border-slate-700' : ''}>
                  <SelectValue placeholder="Select a Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Select a Company</SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner.owner_id} value={owner.owner_id.toString()}>
                      {owner.owner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Assign Client</Label>
              <Select
                value={formData.fk_client_id?.toString()}
                onValueChange={(value) => setFormData({ ...formData, fk_client_id: parseInt(value) })}
              >
                <SelectTrigger className={isDark ? 'bg-slate-900 border-slate-700' : ''}>
                  <SelectValue placeholder="Select a Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Select a Client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.client_id} value={client.client_id.toString()}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-36">
            <div>
              <Label htmlFor="role" className="pb-2">Role *</Label>
              <Select
                value={formData.fk_user_profile_id?.toString()}
                onValueChange={(value) => setFormData({ ...formData, fk_user_profile_id: parseInt(value) })}
                disabled={mode === 'edit'}
              >
                <SelectTrigger className={mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Select a Role</SelectItem>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value.toString()}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="user_type" className="pb-2">User Type *</Label>
              <Select
                value={formData.user_type}
                onValueChange={(value) => setFormData({ ...formData, user_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="EXTERNAL">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-36">
            <div>
              <Label htmlFor="is_viewer" className="pb-2">Access Level</Label>
              <Select
                value={formData.is_viewer}
                onValueChange={(value) => setFormData({ ...formData, is_viewer: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">Full Access</SelectItem>
                  <SelectItem value="Y">Viewer Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="is_manager" className="pb-2">Manager Role</Label>
              <Select
                value={formData.is_manager}
                onValueChange={(value) => setFormData({ ...formData, is_manager: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">Not Manager</SelectItem>
                  <SelectItem value="Y">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === 'edit' && (
            <div>
              <Label htmlFor="active" className="pb-2">Status</Label>
              <Select
                value={formData.active?.toString()}
                onValueChange={(value) => setFormData({ ...formData, active: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'add' ? 'Add User' : 'Update User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
