'use client'

import { EmergencyResponsePlan } from '@/config/types/erp'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SectionTitle } from './OperationModalHelpers'

interface Props {
    erps: EmergencyResponsePlan[]
    loadingErps: boolean
    isDark: boolean
}

export function OperationErpTab({ erps, loadingErps, isDark }: Props) {
    const { t } = useTranslation()

    return (
        <div className="space-y-4">
            <SectionTitle isDark={isDark}>{t('operations.newOperation.erp.sectionTitle')}</SectionTitle>
            {loadingErps ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('operations.newOperation.erp.loading')}
                </div>
            ) : erps.length === 0 ? (
                <div className={cn('text-sm rounded-lg border p-8 text-center', isDark ? 'border-slate-600 bg-slate-700/30 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
                    {t('operations.newOperation.erp.empty')}
                </div>
            ) : (
                <div className={cn('overflow-hidden rounded-lg border', isDark ? 'border-slate-700' : 'border-slate-200')}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={cn('border-b text-left', isDark ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-200')}>
                                <th className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-500')}>{t('operations.newOperation.erp.colType')}</th>
                                <th className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-500')}>{t('operations.newOperation.erp.colDescription')}</th>
                                <th className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-500')}>{t('operations.newOperation.erp.colContact')}</th>
                            </tr>
                        </thead>
                        <tbody className={cn('divide-y', isDark ? 'divide-slate-700' : 'divide-slate-100')}>
                            {erps.map(erp => (
                                <tr key={erp.id} className={cn(isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50')}>
                                    <td className="px-4 py-3">
                                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold',
                                            erp.type === 'MEDICAL'        ? 'bg-red-100 text-red-700'
                                            : erp.type === 'FIRE'         ? 'bg-orange-100 text-orange-700'
                                            : erp.type === 'SECURITY'     ? 'bg-blue-100 text-blue-700'
                                            : erp.type === 'ENVIRONMENTAL' ? 'bg-green-100 text-green-700'
                                            : 'bg-slate-100 text-slate-700'
                                        )}>
                                            {erp.type}
                                        </span>
                                    </td>
                                    <td className={cn('px-4 py-3 text-sm', isDark ? 'text-slate-200' : 'text-slate-700')}>{erp.description}</td>
                                    <td className={cn('px-4 py-3 text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>{erp.contact}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
