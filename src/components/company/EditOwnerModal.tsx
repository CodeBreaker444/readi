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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Company{' '}
            <span className="text-muted-foreground">({owner?.owner_code})</span>
          </DialogTitle>
        </DialogHeader>

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
                value={form[field.name as keyof typeof form]}
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
        </div>

        <DialogFooter>
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