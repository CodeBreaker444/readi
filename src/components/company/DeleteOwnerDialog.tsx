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
        toast.success('Company deleted successfully');
        onClose();
      }
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Failed to delete company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the comapany{' '}
            <span className="font-semibold text-foreground">
              {owner?.owner_name} ({owner?.owner_code})
            </span>
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}