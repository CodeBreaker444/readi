'use client';

import axios from 'axios';
import { format } from 'date-fns';
import { MessageSquare, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';

interface Communication {
    communication_id: number;
    subject: string;
    message: string;
    status: string;
    sent_at: string;
    sent_by_user_id: number;
    sender: {
        user_id: number;
        first_name: string;
        last_name?: string;
        email: string;
    };
    recipients: number[];
}

interface Props {
    evaluationId: number;
    clientId: number;
    refreshKey?: number;
}

export function EvaluationCommunicationTable({ evaluationId, clientId, refreshKey }: Props) {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchCommunications() {
            if (evaluationId <= 0) return;
            try {
                setIsLoading(true);
                const res = await axios.post(`/api/evaluation/${evaluationId}/communications`);
                setCommunications(res.data.data ?? []);
            } catch {
                toast.error(t('planning.communication.loadError'));
            } finally {
                setIsLoading(false);
            }
        }
        fetchCommunications();
    }, [evaluationId, refreshKey, t]);

    const card = cn('shadow-sm', isDark ? 'bg-slate-800 border-slate-700' : 'border-slate-200');
    const cardText = isDark ? 'text-white' : 'text-slate-900';
    const cardDesc = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <Card className={card}>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-violet-500" />
                    <CardTitle className={cn('text-sm font-semibold', cardText)}>
                        {t('planning.communication.title')}
                    </CardTitle>
                </div>
                <CardDescription className={cn('text-xs', cardDesc)}>
                    {t('planning.communication.subtitle')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className={cn('h-12 w-full', isDark ? 'bg-slate-700' : 'bg-slate-100')} />
                        ))}
                    </div>
                ) : communications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <MessageSquare className={cn('h-8 w-8 mb-2', isDark ? 'text-slate-600' : 'text-slate-300')} />
                        <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                            {t('planning.communication.noCommunications')}
                        </p>
                    </div>
                ) : (
                    <div className={cn('rounded-md border overflow-hidden', isDark ? 'border-slate-700' : 'border-slate-200')}>
                        <Table>
                            <TableHeader>
                                <TableRow className={cn(
                                    'hover:bg-transparent border-b',
                                    isDark
                                        ? 'bg-slate-800/60 border-slate-700'
                                        : 'bg-slate-50 hover:bg-slate-50 border-slate-200'
                                )}>
                                    <TableHead className={cn('text-xs h-8 px-3', isDark ? 'text-slate-400' : 'text-slate-600')}>
                                        {t('planning.communication.subject')}
                                    </TableHead>
                                    <TableHead className={cn('text-xs h-8 px-3', isDark ? 'text-slate-400' : 'text-slate-600')}>
                                        {t('planning.communication.sender')}
                                    </TableHead>
                                    <TableHead className={cn('text-xs h-8 px-3', isDark ? 'text-slate-400' : 'text-slate-600')}>
                                        {t('planning.communication.status')}
                                    </TableHead>
                                    <TableHead className={cn('text-xs h-8 px-3', isDark ? 'text-slate-400' : 'text-slate-600')}>
                                        {t('planning.communication.sentAt')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {communications.map((comm) => (
                                    <TableRow
                                        key={comm.communication_id}
                                        className={cn(
                                            'border-b transition-colors',
                                            isDark
                                                ? 'border-slate-700/60 hover:bg-slate-800/60'
                                                : 'border-slate-100 hover:bg-slate-50/50'
                                        )}
                                    >
                                        <TableCell className="px-3 py-2">
                                            <div className="max-w-md">
                                                <p className={cn('text-xs font-medium', isDark ? 'text-slate-200' : 'text-slate-700')}>
                                                    {comm.subject}
                                                </p>
                                                <p className={cn('text-xs mt-0.5 truncate', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                                    {comm.message}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-3 py-2">
                                            <p className={cn('text-xs', isDark ? 'text-slate-300' : 'text-slate-600')}>
                                                {comm.sender.first_name} {comm.sender.last_name ?? ''}
                                            </p>
                                            <p className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                                {comm.sender.email}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-3 py-2">
                                            <Badge
                                                variant={comm.status === 'sent' ? 'default' : 'secondary'}
                                                className={cn(
                                                    'text-[10px]',
                                                    comm.status === 'sent'
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                )}
                                            >
                                                {comm.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-3 py-2">
                                            <p className={cn('text-xs font-mono', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                                {format(new Date(comm.sent_at), 'dd MMM yyyy HH:mm')}
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
