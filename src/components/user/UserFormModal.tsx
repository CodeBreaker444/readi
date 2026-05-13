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
import axios from 'axios';
import { CheckCircle, ChevronDown, ChevronRight, Eye, EyeOff, Link2, Link2Off, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

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

type CcStep = 'idle' | 'verifying' | 'confirmed' | 'saving';

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

  const [ccExpanded, setCcExpanded] = useState(false);
  const [ccHasToken, setCcHasToken] = useState<boolean | null>(null);
  const [ccTokenName, setCcTokenName] = useState<string | null>(null);
  const [ccTokenInput, setCcTokenInput] = useState('');
  const [ccOrgIdInput, setCcOrgIdInput] = useState('');
  const [ccNameInput, setCcNameInput] = useState('');
  const [ccShowToken, setCcShowToken] = useState(false);
  const [ccStep, setCcStep] = useState<CcStep>('idle');
  const [ccVerifiedUser, setCcVerifiedUser] = useState<any>(null);
  const [ccRemoving, setCcRemoving] = useState(false);
  const [ccShowForm, setCcShowForm] = useState(false);

  const fetchCcStatus = useCallback(async () => {
    if (mode !== 'edit' || !userData?.user_id) return;
    try {
      const res = await axios.get(`/api/team/user/control-center-token?user_id=${userData.user_id}`);
      setCcHasToken(res.data.hasToken ?? false);
      setCcTokenName(res.data.tokenName ?? null);
    } catch {
      setCcHasToken(false);
    }
  }, [mode, userData?.user_id]);

  useEffect(() => {
    if (ccExpanded) fetchCcStatus();
  }, [ccExpanded, fetchCcStatus]);

  const handleCcVerify = async () => {
    if (!ccTokenInput.trim()) { toast.error('Please enter the API token'); return; }
    if (!ccOrgIdInput.trim()) { toast.error('Please enter the Organization ID'); return; }
    setCcStep('verifying');
    setCcVerifiedUser(null);
    try {
      const res = await axios.post('/api/flytbase/verify', { token: ccTokenInput.trim(), orgId: ccOrgIdInput.trim() });
      setCcVerifiedUser(res.data.flytbaseUser);
      setCcStep('confirmed');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Token verification failed');
      setCcStep('idle');
    }
  };

  const handleCcSave = async () => {
    if (!ccVerifiedUser || !userData?.user_id) return;
    setCcStep('saving');
    try {
      await axios.post('/api/team/user/control-center-token', {
        user_id: userData.user_id,
        token: ccTokenInput.trim(),
        orgId: ccOrgIdInput.trim(),
        tokenName: ccNameInput.trim() || undefined,
      });
      toast.success('Control Center token saved');
      setCcHasToken(true);
      setCcTokenName(ccNameInput.trim() || null);
      setCcTokenInput(''); setCcOrgIdInput(''); setCcNameInput('');
      setCcVerifiedUser(null); setCcStep('idle'); setCcShowForm(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save token');
      setCcStep('confirmed');
    }
  };

  const handleCcRemove = async () => {
    if (!userData?.user_id) return;
    setCcRemoving(true);
    try {
      await axios.delete('/api/team/user/control-center-token', { data: { user_id: userData.user_id } });
      toast.success('Control Center token removed');
      setCcHasToken(false); setCcTokenName(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to remove token');
    } finally {
      setCcRemoving(false);
    }
  };

  const handleCcCancel = () => {
    setCcTokenInput(''); setCcOrgIdInput(''); setCcNameInput('');
    setCcVerifiedUser(null); setCcStep('idle'); setCcShowForm(false);
  };

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

    const payload: any = { ...formData };
    if (mode === 'add' && ccStep === 'confirmed' && ccVerifiedUser) {
      payload.ccToken = ccTokenInput.trim();
      payload.ccOrgId = ccOrgIdInput.trim();
      payload.ccTokenName = ccNameInput.trim() || undefined;
    }

    setIsSubmitting(true);
    Promise.resolve(onSubmit(payload)).finally(() => {
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

          {/* Control Center section — add mode */}
          {mode === 'add' && (
            <div className={`rounded-lg border ${isDark ? 'border-slate-600 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
              <button
                type="button"
                onClick={() => setCcExpanded((v) => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
              >
                <span className="flex items-center gap-2">
                  {ccStep === 'confirmed'
                    ? <Link2 size={15} className="text-emerald-500" />
                    : <Link2Off size={15} className={isDark ? 'text-slate-500' : 'text-slate-400'} />}
                  Control Center
                  {ccStep === 'confirmed'
                    ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-normal">Verified</span>
                    : <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>Optional</span>
                  }
                </span>
                {ccExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>

              {ccExpanded && (
                <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  {ccStep !== 'confirmed' && (
                    <div className="pt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Token Name <span className={`font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span></Label>
                        <Input
                          value={ccNameInput}
                          onChange={(e) => setCcNameInput(e.target.value)}
                          placeholder="e.g. Production"
                          disabled={ccStep === 'verifying'}
                          className={`h-8 text-sm ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">API Token</Label>
                        <div className="relative">
                          <Input
                            type={ccShowToken ? 'text' : 'password'}
                            value={ccTokenInput}
                            onChange={(e) => setCcTokenInput(e.target.value.trim())}
                            placeholder="Paste Control Center long-lived API key"
                            disabled={ccStep === 'verifying'}
                            className={`h-8 text-sm pr-9 font-mono ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setCcShowToken((v) => !v)}
                            className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}
                          >
                            {ccShowToken ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Organization ID</Label>
                        <Input
                          value={ccOrgIdInput}
                          onChange={(e) => setCcOrgIdInput(e.target.value.trim())}
                          placeholder="e.g. 684fbfd4c264f8f677beb444"
                          disabled={ccStep === 'verifying'}
                          className={`h-8 text-sm font-mono ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                        />
                      </div>
                      <div className="pt-1">
                        <Button
                          type="button" size="sm"
                          onClick={handleCcVerify}
                          disabled={ccStep === 'verifying' || !ccTokenInput.trim() || !ccOrgIdInput.trim()}
                          className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white"
                        >
                          {ccStep === 'verifying'
                            ? <><Loader2 size={12} className="animate-spin mr-1.5" />Verifying…</>
                            : 'Verify token'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {ccStep === 'confirmed' && ccVerifiedUser && (
                    <div className="pt-3 space-y-3">
                      <div className={`rounded-md border px-3 py-2.5 text-xs space-y-1 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                        <p className={`font-medium flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          <CheckCircle size={13} /> Token verified — will be saved with the new user
                        </p>
                        {ccVerifiedUser.name && <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>{ccVerifiedUser.name}</p>}
                        {ccVerifiedUser.email && <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>{ccVerifiedUser.email}</p>}
                        {ccVerifiedUser.organization && <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>{ccVerifiedUser.organization}</p>}
                      </div>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleCcCancel}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Control Center token section — edit mode only */}
          {mode === 'edit' && (
            <div className={`rounded-lg border ${isDark ? 'border-slate-600 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
              <button
                type="button"
                onClick={() => setCcExpanded((v) => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
              >
                <span className="flex items-center gap-2">
                  {ccHasToken === true
                    ? <Link2 size={15} className="text-emerald-500" />
                    : <Link2Off size={15} className={isDark ? 'text-slate-500' : 'text-slate-400'} />}
                  Control Center
                  {ccHasToken === true && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-normal">Linked</span>
                  )}
                  {ccHasToken === false && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>Not linked</span>
                  )}
                </span>
                {ccExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>

              {ccExpanded && (
                <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  {ccHasToken === null && (
                    <div className="pt-4 space-y-4">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-full" />
                      </div>

                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-8 w-full" />
                      </div>

                      <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-full" />
                      </div>

                      <Skeleton className="h-7 w-24 mt-1" />
                    </div>
                  )}

                  {ccHasToken === true && !ccShowForm && (
                    <div className="pt-3 space-y-3">
                      <div className={`flex items-center gap-2 text-xs rounded-md px-3 py-2 ${isDark ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                        <CheckCircle size={13} className="shrink-0" />
                        <span>Control Center token is linked{ccTokenName ? ` — ${ccTokenName}` : ''}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCcShowForm(true)}>
                          Replace token
                        </Button>
                        <Button
                          type="button" variant="outline" size="sm"
                          disabled={ccRemoving}
                          className="h-7 text-xs border-red-400/40 text-red-500 hover:bg-red-500/10"
                          onClick={handleCcRemove}
                        >
                          {ccRemoving ? 'Removing…' : 'Remove'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {(ccHasToken === false || ccShowForm) && ccStep !== 'confirmed' && ccStep !== 'saving' && (
                    <div className="pt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Token Name <span className={`font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span></Label>
                        <Input
                          value={ccNameInput}
                          onChange={(e) => setCcNameInput(e.target.value)}
                          placeholder="e.g. Production"
                          disabled={ccStep === 'verifying'}
                          className={`h-8 text-sm ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">API Token</Label>
                        <div className="relative">
                          <Input
                            type={ccShowToken ? 'text' : 'password'}
                            value={ccTokenInput}
                            onChange={(e) => setCcTokenInput(e.target.value.trim())}
                            placeholder="Paste Control Center long-lived API key"
                            disabled={ccStep === 'verifying'}
                            className={`h-8 text-sm pr-9 font-mono ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setCcShowToken((v) => !v)}
                            className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}
                          >
                            {ccShowToken ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Organization ID</Label>
                        <Input
                          value={ccOrgIdInput}
                          onChange={(e) => setCcOrgIdInput(e.target.value.trim())}
                          placeholder="e.g. 684fbfd4c264f8f677beb444"
                          disabled={ccStep === 'verifying'}
                          className={`h-8 text-sm font-mono ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button" size="sm"
                          onClick={handleCcVerify}
                          disabled={ccStep === 'verifying' || !ccTokenInput.trim() || !ccOrgIdInput.trim()}
                          className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white"
                        >
                          {ccStep === 'verifying'
                            ? <><Loader2 size={12} className="animate-spin mr-1.5" />Verifying…</>
                            : 'Verify token'}
                        </Button>
                        {ccShowForm && (
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleCcCancel}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {(ccStep === 'confirmed' || ccStep === 'saving') && ccVerifiedUser && (
                    <div className="pt-3 space-y-3">
                      <div className={`rounded-md border px-3 py-2.5 text-xs space-y-1 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                        <p className={`font-medium flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          <CheckCircle size={13} /> Token verified
                        </p>
                        {ccVerifiedUser.name && <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>{ccVerifiedUser.name}</p>}
                        {ccVerifiedUser.email && <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>{ccVerifiedUser.email}</p>}
                        {ccVerifiedUser.organization && <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>{ccVerifiedUser.organization}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button" size="sm"
                          onClick={handleCcSave}
                          disabled={ccStep === 'saving'}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          {ccStep === 'saving'
                            ? <><Loader2 size={12} className="animate-spin mr-1.5" />Saving…</>
                            : 'Save token'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleCcCancel} disabled={ccStep === 'saving'}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
