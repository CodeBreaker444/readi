'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { inputCls, labelCls, scCls, siCls, SectionTitle } from './OperationModalHelpers'
import { Client } from './OperationModalTypes'

interface Props {
    clients: Client[]
    clientId: string
    onClientChange: (id: string) => void
    loadingClients: boolean
    isDark: boolean
}

export function OperationStepClient({ clients, clientId, onClientChange, loadingClients, isDark }: Props) {
    const { t } = useTranslation()
    const selectedClient = clients.find(c => String(c.client_id) === clientId)

    return (
        <div className="space-y-4">
            <SectionTitle isDark={isDark}>{t('operations.newOperation.client.sectionTitle')}</SectionTitle>
            {loadingClients ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('operations.newOperation.client.loading')}
                </div>
            ) : (
                <div className="max-w-xs">
                    <Label className={labelCls(isDark)}>{t('operations.newOperation.client.label')} <span className="text-red-500">*</span></Label>
                    <Select value={clientId} onValueChange={onClientChange}>
                        <SelectTrigger className={inputCls(isDark)}>
                            <SelectValue placeholder={t('operations.newOperation.client.placeholder')} />
                        </SelectTrigger>
                        <SelectContent className={scCls(isDark)}>
                            {clients.map(c => (
                                <SelectItem key={c.client_id} value={String(c.client_id)} className={siCls(isDark)}>
                                    [{c.client_code}] {c.client_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {selectedClient && (
                <div className={cn('rounded-md border px-4 py-3 max-w-xs', isDark ? 'border-slate-600 bg-slate-700/40' : 'bg-muted/30')}>
                    <p className="text-xs text-muted-foreground">{t('operations.newOperation.client.selectedLabel')}</p>
                    <p className={cn('font-medium text-sm mt-0.5', isDark && 'text-white')}>{selectedClient.client_name}</p>
                </div>
            )}
        </div>
    )
}
