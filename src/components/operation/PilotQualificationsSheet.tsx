'use client'

import { CurriculumTable, TrainingCurriculumRecord } from '@/components/profile/CurriculumTable'
import { useTimezone } from '@/components/TimezoneProvider'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDateInTz } from '@/lib/utils'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface UserQualification {
    qualification_id: number
    qualification_name: string
    qualification_type: string
    status: string
    start_date: string | null
    expiry_date: string | null
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    pilotId: number | null
    pilotName: string
    isDark: boolean
}

export function PilotQualificationsSheet({ open, onOpenChange, pilotId, pilotName, isDark }: Props) {
    const { t } = useTranslation()
    const { timezone } = useTimezone()
    const [loading, setLoading] = useState(false)
    const [qualifications, setQualifications] = useState<UserQualification[]>([])
    const [curriculum, setCurriculum] = useState<TrainingCurriculumRecord[]>([])

    useEffect(() => {
        if (!open || !pilotId) return
        setLoading(true)
        axios.get('/api/operation/pilot/qualifications', { params: { user_id: pilotId } })
            .then(res => {
                setQualifications(res.data.qualifications ?? [])
                setCurriculum(res.data.curriculum ?? [])
            })
            .catch(() => toast.error(t('operations.newOperation.pilotQualifications.loadError')))
            .finally(() => setLoading(false))
    }, [open, pilotId])

    const today = new Date().toISOString().slice(0, 10)
    const activeQualifications = qualifications.filter(q => {
        const isExpired = q.expiry_date != null && q.expiry_date < today
        return q.status !== 'Inactive' && !isExpired
    })

    const cellMuted = isDark ? 'text-slate-400' : 'text-slate-500'
    const cellText = isDark ? 'text-slate-200' : 'text-slate-800'
    const borderClass = isDark ? 'border-slate-700' : 'border-slate-200'

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{pilotName || t('operations.newOperation.pilotQualifications.title')}</SheetTitle>
                </SheetHeader>

                <div className="px-4 pb-6 space-y-6">
                    <div>
                        <p className={cn('text-xs font-semibold uppercase tracking-wide pb-2 mb-2 border-b', cellMuted, borderClass)}>
                            {t('operations.newOperation.pilotQualifications.qualificationsSection')}
                        </p>
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full rounded-md" />
                                <Skeleton className="h-10 w-full rounded-md" />
                            </div>
                        ) : activeQualifications.length === 0 ? (
                            <p className={cn('text-xs', cellMuted)}>{t('operations.newOperation.pilotQualifications.noQualifications')}</p>
                        ) : (
                            <div className={cn('rounded-md border divide-y', borderClass)}>
                                {activeQualifications.map(q => (
                                    <div key={q.qualification_id} className="flex items-center justify-between gap-3 px-3 py-2">
                                        <div className="min-w-0">
                                            <p className={cn('text-sm font-medium truncate', cellText)}>{q.qualification_name}</p>
                                            <div className={cn('flex items-center gap-2 mt-0.5 text-xs', cellMuted)}>
                                                <Badge
                                                    variant="outline"
                                                    className={q.qualification_type === 'Certification'
                                                        ? (isDark ? 'border-violet-700 text-violet-300' : 'border-violet-300 text-violet-700')
                                                        : (isDark ? 'border-blue-700 text-blue-300' : 'border-blue-300 text-blue-700')}
                                                >
                                                    {q.qualification_type}
                                                </Badge>
                                                {q.expiry_date && (
                                                    <span>{t('operations.newOperation.pilotQualifications.expiry')}: {formatDateInTz(q.expiry_date, timezone)}</span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className={isDark ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/40' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                                            {t('operations.newOperation.pilotQualifications.statusActive')}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className={cn('text-xs font-semibold uppercase tracking-wide pb-2 mb-2 border-b', cellMuted, borderClass)}>
                            {t('operations.newOperation.pilotQualifications.curriculumSection')}
                        </p>
                        {loading ? (
                            <Skeleton className="h-24 w-full rounded-md" />
                        ) : curriculum.length === 0 ? (
                            <p className={cn('text-xs', cellMuted)}>{t('operations.newOperation.pilotQualifications.noCurriculum')}</p>
                        ) : (
                            <CurriculumTable
                                rows={curriculum}
                                formatDate={(d) => formatDateInTz(d, timezone)}
                                t={t}
                                isDark={isDark}
                            />
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
