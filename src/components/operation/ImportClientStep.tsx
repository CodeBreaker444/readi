'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { SelectPaginationFooter, usePagedItems } from './OperationModalHelpers';

interface Client { client_id: number; client_name: string; client_code: string }

interface ImportClientStepProps {
    t: (key: string, opts?: any) => string;
    ns: string;
    loadingClients: boolean;
    clientId: string;
    setClientId: (id: string) => void;
    clients: Client[];
    selectedClientObj: Client | undefined;
}

export function ImportClientStep({ t, ns, loadingClients, clientId, setClientId, clients, selectedClientObj }: ImportClientStepProps) {
    const { page, setPage, totalPages, paged: pagedClients, showPagination } = usePagedItems(clients);
    return (
        <div className="space-y-4">
            <div>
                <Label className="mb-1.5 block">{t(ns + '.fields.client')} <span className="text-red-500">*</span></Label>
                <Select value={clientId} onValueChange={setClientId} disabled={loadingClients}>
                    <SelectTrigger>
                        {loadingClients ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                            <SelectValue placeholder={t(ns + '.placeholders.selectClient')}>
                                {selectedClientObj ? `${selectedClientObj.client_name} (${selectedClientObj.client_code})` : undefined}
                            </SelectValue>
                        )}
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" sideOffset={4}>
                        {pagedClients.map((c) => (
                            <SelectItem key={c.client_id} value={String(c.client_id)}>
                            {c.client_name} ({c.client_code})
                            </SelectItem>
                        ))}
                        {showPagination && (
                            <SelectPaginationFooter
                                page={page}
                                totalPages={totalPages}
                                onPageChange={setPage}
                                previousLabel={t('common.previous')}
                                nextLabel={t('common.next')}
                                indicatorLabel={t('common.pageIndicator', { current: page + 1, total: totalPages })}
                            />
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
