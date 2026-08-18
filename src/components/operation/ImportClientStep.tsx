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

interface Client { client_id: number; client_name: string; client_code: string }

interface ImportClientStepProps {
    t: (key: string) => string;
    ns: string;
    loadingClients: boolean;
    clientId: string;
    setClientId: (id: string) => void;
    clients: Client[];
    selectedClientObj: Client | undefined;
}

export function ImportClientStep({ t, ns, loadingClients, clientId, setClientId, clients, selectedClientObj }: ImportClientStepProps) {
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
                    <SelectContent>
                        {clients.map((c) => (
                            <SelectItem key={c.client_id} value={String(c.client_id)}>
                            {c.client_name} ({c.client_code})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
