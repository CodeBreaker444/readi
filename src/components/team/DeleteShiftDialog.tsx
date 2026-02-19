'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Shift } from '@/config/types/crewShift'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeleteShiftDialogProps {
  shift: Shift | null
  open: boolean
  onClose: () => void
  onSuccess: (shiftId: number) => void
  isDark: boolean
}

export function DeleteShiftDialog({
  shift,
  open,
  onClose,
  onSuccess,
  isDark,
}: DeleteShiftDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!shift) return
    setIsDeleting(true)

    try {
      const res = await axios.delete(`/api/team/shift/${shift.shift_id}`)
      const result = res.data

      if (!result.success) {
        toast.error(result.error ?? 'Failed to delete shift')
        return
      }

      toast.success('Shift deleted successfully')
      onSuccess(shift.shift_id)
      onClose()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent
        className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={isDark ? 'text-white' : 'text-slate-900'}>
            Delete Shift #{shift?.shift_id}
          </AlertDialogTitle>
          <AlertDialogDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-current">
              {shift?.shift_category?.replace('_', ' ')}
            </span>{' '}
            shift on{' '}
            <span className="font-semibold text-current">{shift?.shift_date_start}</span>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>


        <AlertDialogFooter>
          <AlertDialogCancel
            className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent' : ''}
            disabled={isDeleting}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Yes, Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}