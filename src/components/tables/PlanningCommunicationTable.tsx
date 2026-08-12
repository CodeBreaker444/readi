'use client';

import axios from 'axios';
import { format } from 'date-fns';
import { Download, MessageSquare, Paperclip, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
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
    communication_level: string;
    sent_at: string;
    sent_by_user_id: number;
    sender_name: string;
    communication_file_name: string | null;
    communication_file_url: string | null;
}

const LEVEL_STYLES: Record<string, string> = {
    info: 'bg-sky-100 text-sky-700 border-sky-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
};

interface Props {
    planningId: number;
    refreshKey?: number;
}

export function PlanningCommunicationTable({ planningId, refreshKey }: Props) {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchCommunications() {
            if (planningId <= 0) return;
            try {
                setIsLoading(true);
                const res = await axios.post('/api/evaluation/mission/communication/list', {
                    planning_id: planningId,
                });
                setCommunications(res.data.data ?? []);
            } catch {
                toast.error(t('planning.communication.loadError'));
            } finally {
                setIsLoading(false);
            }
        }
        fetchCommunications();
    }, [planningId, refreshKey, t]);

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
                                        {t('planning.communication.level')}
                                    </TableHead>
                                    <TableHead className={cn('text-xs h-8 px-3', isDark ? 'text-slate-400' : 'text-slate-600')}>
                                        {t('planning.communication.status')}
                                    </TableHead>
                                    <TableHead className={cn('text-xs h-8 px-3', isDark ? 'text-slate-400' : 'text-slate-600')}>
                                        {t('planning.communication.file')}
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
                                                {comm.sender_name || '-'}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-3 py-2">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[10px] capitalize',
                                                    LEVEL_STYLES[comm.communication_level] ?? LEVEL_STYLES.info
                                                )}
                                            >
                                                {comm.communication_level || 'info'}
                                            </Badge>
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
                                            {comm.communication_file_url ? (
                                                <a
                                                    href={comm.communication_file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download={comm.communication_file_name ?? undefined}
                                                    className={cn(
                                                        'inline-flex items-center gap-1 text-xs font-medium hover:underline',
                                                        isDark ? 'text-violet-400' : 'text-violet-600'
                                                    )}
                                                    title={comm.communication_file_name ?? t('planning.communication.download')}
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    <span className="max-w-[120px] truncate">
                                                        {comm.communication_file_name ?? t('planning.communication.download')}
                                                    </span>
                                                </a>
                                            ) : (
                                                <span className={cn('inline-flex items-center gap-1 text-xs', isDark ? 'text-slate-600' : 'text-slate-300')}>
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                    {t('planning.communication.noFile')}
                                                </span>
                                            )}
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
