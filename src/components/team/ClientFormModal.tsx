'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ClientData } from '../tables/ClientColumn';

const PAYMENT_TERMS = [
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
  'Due on Receipt',
  'Prepaid',
];


interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  clientData?: ClientData;
  onSubmit: (data: any) => Promise<void>;
  isDark: boolean;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

type FormState = {
  client_name: string;
  client_legal_name: string;
  client_code: string;
  client_email: string;
  client_phone: string;
  client_website: string;
  client_address: string;
  client_city: string;
  client_state: string;
  client_postal_code: string;
  payment_terms: string;
  credit_limit: string;
  contract_start_date: string;
  contract_end_date: string;
  client_active: string;
  username: string;
};

const defaultForm: FormState = {
  client_name: '',
  client_legal_name: '',
  client_code: '',
  client_email: '',
  client_phone: '',
  client_website: '',
  client_address: '',
  client_city: '',
  client_state: '',
  client_postal_code: '',
  payment_terms: '',
  credit_limit: '',
  contract_start_date: '',
  contract_end_date: '',
  client_active: 'Y',
  username: '',
};

export function ClientFormModal({ isOpen, onClose, mode, clientData, onSubmit, isDark }: ClientFormModalProps) {
  const [formData, setFormData] = useState<FormState>(
    clientData
      ? {
          ...defaultForm,
          ...clientData,
          credit_limit: clientData.credit_limit?.toString() || '',
          contract_start_date: clientData.contract_start_date || '',
          contract_end_date: clientData.contract_end_date || '',
          username: clientData.username || '',
        }
      : defaultForm
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(
        clientData
          ? {
              ...defaultForm,
              ...clientData,
              credit_limit: clientData.credit_limit?.toString() || '',
              contract_start_date: clientData.contract_start_date || '',
              contract_end_date: clientData.contract_end_date || '',
              username: clientData.username || '',
            }
          : defaultForm
      );
      setUsernameStatus('idle');
    }
  }, [isOpen, clientData]);

  const checkUsername = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value || value.length < 3) {
      setUsernameStatus(value.length > 0 ? 'invalid' : 'idle');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(value)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/client/check-username?username=${encodeURIComponent(value)}`);
        setUsernameStatus(res.data.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 350);
  }, []);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key === 'username' && mode === 'add') {
      checkUsername(value.toLowerCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_name.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (mode === 'add') {
      if (!formData.client_email) {
        toast.error('Email is required');
        return;
      }
      if (!formData.username) {
        toast.error('Username is required');
        return;
      }
      if (usernameStatus === 'taken') {
        toast.error('Username is already taken');
        return;
      }
      if (usernameStatus === 'invalid') {
        toast.error('Username must be at least 3 characters (lowercase, numbers, underscores only)');
        return;
      }
    }
    if (formData.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (formData.contract_start_date && formData.contract_end_date && formData.contract_end_date < formData.contract_start_date) {
      toast.error('Contract end date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : undefined,
        contract_start_date: formData.contract_start_date || undefined,
        contract_end_date: formData.contract_end_date || undefined,
        client_email: formData.client_email || undefined,
        client_website: formData.client_website || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = `h-9 text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600' : ''}`;
  const labelClass = `text-xs font-medium pb-1.5 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`;

  const usernameHint = () => {
    if (mode === 'edit') return null;
    if (usernameStatus === 'checking') return (
      <span className="flex items-center gap-1 text-slate-400 text-[11px] mt-1">
        <Loader2 size={11} className="animate-spin" /> Checking…
      </span>
    );
    if (usernameStatus === 'available') return (
      <span className="flex items-center gap-1 text-emerald-500 text-[11px] mt-1">
        <CheckCircle2 size={11} /> Available
      </span>
    );
    if (usernameStatus === 'taken') return (
      <span className="flex items-center gap-1 text-rose-500 text-[11px] mt-1">
        <XCircle size={11} /> Already taken
      </span>
    );
    if (usernameStatus === 'invalid') return (
      <span className="flex items-center gap-1 text-amber-500 text-[11px] mt-1">
        <XCircle size={11} /> Min 3 chars, lowercase / numbers / underscore only
      </span>
    );
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {mode === 'add' ? 'Add New Client' : 'Edit Client'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-1">

          {/* Basic Info */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Basic Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className={labelClass}>Client Name *</label>
                <Input className={inputClass} value={formData.client_name} onChange={set('client_name')} placeholder="Acme Corporation" required />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className={labelClass}>Legal Name</label>
                <Input className={inputClass} value={formData.client_legal_name} onChange={set('client_legal_name')} placeholder="Acme Corp Ltd." />
              </div>
              <div>
                <label className={labelClass}>Client Code</label>
                <Input className={inputClass} value={formData.client_code} onChange={set('client_code')} placeholder="ACM-001" />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <Input className={inputClass} value={formData.client_website} onChange={set('client_website')} placeholder="https://example.com" type="url" />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Contact Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Email {mode === 'add' && <span className="text-rose-500">*</span>}</label>
                <Input
                  className={inputClass}
                  value={formData.client_email}
                  onChange={set('client_email')}
                  type="email"
                  placeholder="contact@company.com"
                  required={mode === 'add'}
                  readOnly={mode === 'edit'}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <Input className={inputClass} value={formData.client_phone} onChange={set('client_phone')} type="tel" placeholder="+1 555 000 0000" />
              </div>
            </div>
          </div>

          {/* Portal Access — only shown in add mode */}
          {mode === 'add' && (
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Portal Access</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Username *</label>
                  <Input
                    className={`${inputClass} ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-rose-500' : usernameStatus === 'available' ? 'border-emerald-500' : ''}`}
                    value={formData.username}
                    onChange={(e) => {
                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      setFormData((p) => ({ ...p, username: v }));
                      checkUsername(v);
                    }}
                    placeholder="acme_corp"
                    required
                    autoComplete="off"
                  />
                  {usernameHint()}
                </div>
               
              </div>
            </div>
          )}

          {/* Address */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Address</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Street Address</label>
                <Input className={inputClass} value={formData.client_address} onChange={set('client_address')} placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>City</label>
                  <Input className={inputClass} value={formData.client_city} onChange={set('client_city')} placeholder="New York" />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <Input className={inputClass} value={formData.client_state} onChange={set('client_state')} placeholder="NY" />
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <Input className={inputClass} value={formData.client_postal_code} onChange={set('client_postal_code')} placeholder="10001" />
                </div>
              </div>
            </div>
          </div>

          {/* Contract */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Contract & Billing</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Contract Start</label>
                <Input className={inputClass} type="date" value={formData.contract_start_date} onChange={set('contract_start_date')} />
              </div>
              <div>
                <label className={labelClass}>Contract End</label>
                <Input className={inputClass} type="date" value={formData.contract_end_date} onChange={set('contract_end_date')} />
              </div>
              <div>
                <label className={labelClass}>Payment Terms</label>
                <Select value={formData.payment_terms} onValueChange={(v) => setFormData((p) => ({ ...p, payment_terms: v }))}>
                  <SelectTrigger className={`h-9 text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : ''}`}>
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Credit Limit ($)</label>
                <Input className={inputClass} type="number" value={formData.credit_limit} onChange={set('credit_limit')} placeholder="0.00" min="0" step="0.01" />
              </div>
            </div>
          </div>

          {/* Status (edit only) */}
          {mode === 'edit' && (
            <div className="w-1/2">
              <label className={labelClass}>Status</label>
              <Select value={formData.client_active} onValueChange={(v) => setFormData((p) => ({ ...p, client_active: v }))}>
                <SelectTrigger className={`h-9 text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Y">Active</SelectItem>
                  <SelectItem value="N">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || (mode === 'add' && (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'))}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'add' ? 'Add Client' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
