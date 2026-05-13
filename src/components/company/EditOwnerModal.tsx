'use client';

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
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { OwnerData } from '../tables/OwnerColumn';

interface EditOwnerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  owner: OwnerData | null;
}

export default function EditOwnerModal({ open, onClose, onSuccess, owner }: EditOwnerModalProps) {
  const [form, setForm] = useState({
    owner_name: '',
    owner_address: '',
    owner_phone: '',
    owner_email: '',
    owner_website: '',
    owner_active: 'Y',
    drone_atc_enabled: false,
    easa_operator_code: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (owner) {
      setForm({
        owner_name: owner.owner_name,
        owner_address: owner.owner_address || '',
        owner_phone: owner.owner_phone || '',
        owner_email: owner.owner_email,
        owner_website: owner.owner_website,
        owner_active: owner.owner_active,
        drone_atc_enabled: owner.drone_atc_enabled ?? false,
        easa_operator_code: owner.easa_operator_code ?? '',
      });
      setError('');
    }
  }, [owner]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!owner) return;
    setError('');

    if (!form.owner_name || !form.owner_email || !form.owner_website) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/owner/${owner.owner_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.code === 1) {
        onSuccess();
        toast.success('Company updated successfully');
        onClose();
      } else {
        setError(data.message || 'Something went wrong');
        toast.error(data.message || 'Failed to update company');
      }
    } catch (err) {
      setError('Network error');
      toast.error('Network error. Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>
            Edit Company{' '}
            <span className="text-muted-foreground">({owner?.owner_code})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          {[
            { name: 'owner_name', label: 'Name', required: true },
            { name: 'owner_address', label: 'Address' },
            { name: 'owner_phone', label: 'Phone' },
            { name: 'owner_email', label: 'Email', required: true },
            { name: 'owner_website', label: 'Website', required: true },
          ].map((field) => (
            <div key={field.name} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={`edit-${field.name}`} className="text-right">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id={`edit-${field.name}`}
                name={field.name}
                value={form[field.name as keyof typeof form] as string}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
          ))}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Status <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.owner_active}
              onValueChange={(val) => setForm((prev) => ({ ...prev, owner_active: val }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Y">Active</SelectItem>
                <SelectItem value="N">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Drone ATC</Label>
            <div className="col-span-3 flex items-center gap-3">
              <Switch
                checked={form.drone_atc_enabled}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, drone_atc_enabled: checked }))
                }
              />
              <span className="text-sm text-muted-foreground">
                {form.drone_atc_enabled ? 'Enabled for this company' : 'Disabled for this company'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-easa_operator_code" className="text-right">EASA Code</Label>
            <Input
              id="edit-easa_operator_code"
              name="easa_operator_code"
              value={form.easa_operator_code}
              onChange={handleChange}
              placeholder="e.g. ITA-OP-12345"
              className="col-span-3"
            />
          </div>
        </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-black text-white hover:bg-black/80"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}