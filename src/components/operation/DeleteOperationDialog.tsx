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
import { OperationItem } from '@/config/types/operation'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeleteOperationDialogProps {
  operation: OperationItem | null
  open: boolean
  onClose: () => void
  onSuccess: (operationId: number) => void
  isDark: boolean
}

export function DeleteOperationDialog({
  operation,
  open,
  onClose,
  onSuccess,
  isDark,
}: DeleteOperationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!operation) return
    setIsDeleting(true)
    try {
      const res = await axios.delete(`/api/operation/calendar/${operation.pilot_mission_id}`)
      const result = res.data
      if (!result.success) {
        toast.error(result.error ?? 'Failed to delete operation')
        return
      }
      toast.success('Operation deleted successfully')
      onSuccess(operation.pilot_mission_id)
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
            Delete Operation #{operation?.pilot_mission_id}
          </AlertDialogTitle>
          <AlertDialogDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-current">
              {operation?.mission_name ?? 'this operation'}
            </span>
            {operation?.scheduled_start && (
              <>
                {' '}scheduled on{' '}
                <span className="font-semibold text-current">
                  {new Date(operation.scheduled_start).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </>
            )}
            ? This action cannot be undone.
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