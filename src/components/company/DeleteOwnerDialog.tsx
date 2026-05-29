'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { OwnerData } from '../tables/OwnerColumn';

interface DeleteOwnerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  owner: OwnerData | null;
}

export default function DeleteOwnerDialog({ open, onClose, onSuccess, owner }: DeleteOwnerDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!owner) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/${owner.owner_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 1) {
        onSuccess();
        toast.success('Company deactivated successfully');
        onClose();
      }
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Failed to deactivate company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate company?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate{' '}
            <span className="font-semibold text-foreground">
              {owner?.owner_name} ({owner?.owner_code})
            </span>
            {' '}and disable all users belonging to this company. The company record will be archived and can be reviewed by a system administrator.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 text-white hover:bg-red-600"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deactivating...' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}