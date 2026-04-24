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
import { useTimezone } from '@/components/TimezoneProvider'
import { OperationItem } from '@/config/types/operation'
import { formatDateInTz } from '@/lib/utils'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
    const { t } = useTranslation()
    const { timezone } = useTimezone()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!operation) return
        setIsDeleting(true)
        try {
            const res = await axios.delete(`/api/operation/calendar/${operation.pilot_mission_id}`)
            const result = res.data
            if (!result.success) {
                toast.error(result.error ?? t('operations.table.toast.deleteError'))
                return
            }
            toast.success(t('operations.table.toast.deleteSuccess', { count: 1 }))
            onSuccess(operation.pilot_mission_id)
            onClose()
        } catch {
            toast.error(t('operations.table.toast.deleteError'))
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}>
                <AlertDialogHeader>
                    <AlertDialogTitle className={isDark ? 'text-white' : 'text-slate-900'}>
                        {t('operations.table.batch.deleteSelected')} #{operation?.pilot_mission_id}
                    </AlertDialogTitle>
                    <AlertDialogDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                        {t('operations.table.detail.missionId')}:{' '}
                        <span className="font-semibold text-current">
                            {operation?.mission_name ?? '...'}
                        </span>
                        {operation?.scheduled_start && (
                            <>
                                {' — '}{t('operations.table.detail.scheduled')}:{' '}
                                <span className="font-semibold text-current">
                                    {formatDateInTz(operation.scheduled_start, timezone)}
                                </span>
                            </>
                        )}
                        ? {t('operations.board.toast.invalidMove')} (This action cannot be undone).
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent' : ''} disabled={isDeleting}>
                        {t('operations.table.filters.reset')}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500">
                        {isDeleting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('operations.table.batch.deleting')}</>
                        ) : (
                            t('operations.table.batch.deleteSelected')
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}