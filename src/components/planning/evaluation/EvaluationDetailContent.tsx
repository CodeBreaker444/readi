'use client';

import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import { Evaluation, EvaluationTask } from '@/config/types/evaluation';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ChevronDown,
    ClipboardList,
    FileText,
    Map,
    MessageSquarePlus,
    Pencil,
    Send,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EditEvaluationForm } from './EditEvaluationForm';
import { EvaluationCommunicationModal } from './EvaluationCommunicationModal';
import { EvaluationDetailFilePanel } from './EvaluationDetailFilePanel';
import { EvaluationMapPanel } from './EvaluationMapPanel';
import { EvaluationDetailSkeleton } from './EvaluationSkeleton';
import { TaskCompletionTable } from './TaskCompletionTable';

interface Props {
    ownerId: number;
}

export const EvaluationDetailContent: FC<Props> = ({ ownerId }) => {
    const { isDark } = useTheme();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useTranslation();

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(true);
    const [taskTableKey, setTaskTableKey] = useState(0);

    const [commModalOpen, setCommModalOpen] = useState(false);
    const [commModalTask, setCommModalTask] = useState<EvaluationTask | null>(null);

    const [flightRequests, setFlightRequests] = useState<any[]>([]);
    const [frLoading, setFrLoading] = useState(false);

    const params = {
        e_id: searchParams.get('e_id') ?? '',
        c_id: searchParams.get('c_id') ?? '',
    };

    const evaluationId = Number(params.e_id);
    const clientId = Number(params.c_id);

    const breadcrumbItems = [
        { label: t('planning.evaluation.evaluation'), href: '/planning/evaluation' },
        { label: t('planning.evaluation.detailTitle'), href: '#' },
    ];

    useEffect(() => {
        const eId = Number(params.e_id);
        const cId = Number(params.c_id);

        if (!params.e_id || !params.c_id || isNaN(eId) || isNaN(cId)) {
            toast.error(t('planning.evaluation.invalidParams'));
            router.replace('/planning/evaluation');
            return;
        }

        async function fetchEvaluation() {
            try {
                setIsLoading(true);
                const res = await axios.get(`/api/evaluation/${eId}`);
                setEvaluation(res.data.data);
            } catch {
                toast.error(t('planning.evaluation.loadError'));
            } finally {
                setIsLoading(false);
            }
        }

        fetchEvaluation();

        async function fetchFlightRequests() {
            setFrLoading(true);
            try {
                const res = await axios.get(`/api/evaluation/${eId}/flight-requests`);
                setFlightRequests(res.data.items ?? []);
            } catch {
                toast.error(t('planning.evaluation.flightRequestsLoadError'));
            } finally {
                setFrLoading(false);
            }
        }

        fetchFlightRequests();
    }, [searchParams, router, t]);

    function handleNewCommunication() {
        setCommModalTask(null);
        setCommModalOpen(true);
    }

    function handleCommSent() {
        setTaskTableKey((k) => k + 1);
    }

    if (isLoading) return <EvaluationDetailSkeleton isDark={isDark} />;

    const card     = cn('shadow-sm', isDark ? 'bg-slate-800 border-slate-700' : 'border-slate-200');
    const cardText = isDark ? 'text-white' : 'text-slate-900';
    const cardDesc = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <>
            <div className={cn('min-h-screen', isDark ? 'bg-slate-900' : 'bg-slate-50/60')}>
                <div className={cn('border-b py-3 top-0 z-10', isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white')}>
                    <div className="mx-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 rounded-full bg-violet-600" />
                            <div>
                                <h1 className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                                    {t('planning.evaluation.detailTitle')}
                                </h1>
                                <p className={cn('text-xs leading-none mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                    {t('planning.evaluation.detailSubtitle')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={handleNewCommunication}
                            >
                                <MessageSquarePlus className="h-3.5 w-3.5" />
                                {t('planning.evaluation.newCommunication')}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="m-4">
                    <Breadcrumbs items={breadcrumbItems} isDark={isDark} />
                </div>

                <div className="px-6 py-6 space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <Collapsible open={editOpen} onOpenChange={setEditOpen}>
                            <Card className={card}>
                                <CollapsibleTrigger asChild>
                                    <CardHeader className={cn(
                                        'pb-3 cursor-pointer select-none transition-colors rounded-t-xl',
                                        isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/80'
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Pencil className="w-4 h-4 text-violet-500" />
                                                <CardTitle className={cn('text-sm font-semibold', cardText)}>
                                                    {t('planning.evaluation.editTitle')}
                                                </CardTitle>
                                            </div>
                                            <ChevronDown className={cn(
                                                'w-4 h-4 transition-transform duration-200',
                                                isDark ? 'text-slate-500' : 'text-slate-400',
                                                editOpen && 'rotate-180',
                                            )} />
                                        </div>
                                        <CardDescription className={cn('text-xs mt-0.5', cardDesc)}>
                                            {t('planning.evaluation.editSubtitle')}
                                        </CardDescription>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <Separator className={isDark ? 'bg-slate-700' : ''} />
                                    <CardContent className="pt-5">
                                        <EditEvaluationForm
                                            evaluation={evaluation}
                                            onUpdated={(updated) => setEvaluation(updated)}
                                        />
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>

                        <Card className={card}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <Map className="w-4 h-4 text-emerald-500" />
                                    <CardTitle className={cn('text-sm font-semibold', cardText)}>
                                        {t('planning.evaluation.operationArea')}
                                    </CardTitle>
                                </div>
                                <CardDescription className={cn('text-xs', cardDesc)}>
                                    {t('planning.evaluation.operationAreaDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <EvaluationMapPanel
                                    evaluationId={evaluationId}
                                    polygonData={evaluation?.polygon_data ?? null}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <Card className={card}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-blue-500" />
                                <CardTitle className={cn('text-sm font-semibold', cardText)}>
                                    {t('planning.evaluation.taskCompletion')}
                                </CardTitle>
                            </div>
                            <CardDescription className={cn('text-xs', cardDesc)}>
                                {t('planning.evaluation.taskCompletionDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TaskCompletionTable
                                key={taskTableKey}
                                evaluationId={evaluationId}
                                clientId={clientId}
                                ownerId={ownerId}
                                onAllCompleted={() => {}}
                            />
                        </CardContent>
                    </Card>

                    <Card className={card}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-amber-500" />
                                <CardTitle className={cn('text-sm font-semibold', cardText)}>
                                    {t('planning.evaluation.files')}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <EvaluationDetailFilePanel
                                evaluationId={evaluationId}
                                clientId={clientId}
                            />
                        </CardContent>
                    </Card>

                    <Card className={card}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Send className="w-4 h-4 text-violet-500" />
                                <CardTitle className={cn('text-sm font-semibold', cardText)}>
                                    {t('planning.evaluation.linkedFlightRequests')}
                                </CardTitle>
                            </div>
                            <CardDescription className={cn('text-xs', cardDesc)}>
                                {t('planning.evaluation.linkedFlightRequestsDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {frLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                                </div>
                            ) : flightRequests.length === 0 ? (
                                <p className={cn('text-xs py-4 text-center', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                    {t('planning.evaluation.noFlightRequests')}
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className={cn('border-b', isDark ? 'border-slate-700' : 'border-slate-100')}>
                                                {['Mission ID', 'Type', 'Target', 'Priority', 'Operator', 'Status', 'Received'].map((h) => (
                                                    <th key={h} className={cn(
                                                        'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider',
                                                        isDark ? 'text-slate-500' : 'text-slate-400'
                                                    )}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className={cn('divide-y', isDark ? 'divide-slate-700/60' : 'divide-slate-50')}>
                                            {flightRequests.map((r: any) => (
                                                <tr key={r.request_id} className={cn(isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/60')}>
                                                    <td className="px-3 py-2.5 font-mono font-semibold text-violet-600">{r.external_mission_id}</td>
                                                    <td className={cn('px-3 py-2.5', isDark ? 'text-slate-300' : 'text-slate-600')}>{r.mission_type ?? '—'}</td>
                                                    <td className={cn('px-3 py-2.5', isDark ? 'text-slate-300' : 'text-slate-600')}>{r.target ?? '—'}</td>
                                                    <td className="px-3 py-2.5">
                                                        {r.priority ? (
                                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold
                                                                ${r.priority === 'HIGH' ? 'bg-red-100 text-red-700' : r.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                                {r.priority}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td className={cn('px-3 py-2.5 font-mono', isDark ? 'text-slate-400' : 'text-slate-500')}>{r.operator ?? '—'}</td>
                                                    <td className="px-3 py-2.5">
                                                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700">
                                                            {r.dcc_status}
                                                        </span>
                                                    </td>
                                                    <td className={cn('px-3 py-2.5', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                                        {format(new Date(r.created_at), 'dd MMM yyyy HH:mm')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <EvaluationCommunicationModal
                evaluationId={evaluationId}
                open={commModalOpen}
                task={commModalTask}
                onClose={() => setCommModalOpen(false)}
                onSent={handleCommSent}
            />
        </>
    );
};
