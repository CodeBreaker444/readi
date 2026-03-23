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
import { useTheme } from '@/components/useTheme';
import { Evaluation, EvaluationTask } from '@/config/types/evaluation';
import { cn } from '@/lib/utils';
import axios from 'axios';
import {
    ChevronDown,
    ClipboardList,
    FileText,
    Map,
    MessageSquarePlus,
    Pencil,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FC, useEffect, useState } from 'react';
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

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(true);
    const [taskTableKey, setTaskTableKey] = useState(0);

    const [commModalOpen, setCommModalOpen] = useState(false);
    const [commModalTask, setCommModalTask] = useState<EvaluationTask | null>(null);

    const params = {
        e_id: searchParams.get('e_id') ?? '',
        c_id: searchParams.get('c_id') ?? '',
    };

    const evaluationId = Number(params.e_id);
    const clientId = Number(params.c_id);

    const breadcrumbItems = [
        { label: 'Evaluation', href: '/planning/evaluation' },
        { label: 'Evaluation Detail', href: '#' },
    ];

    useEffect(() => {
        const eId = Number(params.e_id);
        const cId = Number(params.c_id);

        if (!params.e_id || !params.c_id || isNaN(eId) || isNaN(cId)) {
            toast.error('Invalid parameters – redirecting to dashboard');
            router.replace('/planning/evaluation');
            return;
        }

        async function fetchEvaluation() {
            try {
                setIsLoading(true);
                const res = await axios.get(`/api/evaluation/${eId}`);
                setEvaluation(res.data.data);
            } catch {
                toast.error('Failed to load evaluation data');
            } finally {
                setIsLoading(false);
            }
        }

        fetchEvaluation();
    }, [searchParams]);

    function handleNewCommunication() {
        setCommModalTask(null);
        setCommModalOpen(true);
    }

    function handleCommSent() {
        setTaskTableKey((k) => k + 1);
    }

    if (isLoading) return <EvaluationDetailSkeleton />;

    return (
        <>
            <div className="min-h-screen bg-slate-50/60">
                <div className="border-b border-slate-200 bg-white py-3  top-0 z-10">
                    <div className="mx-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 rounded-full bg-violet-600" />
                            <div>
                                <h1 className="text-base font-semibold text-slate-900">
                                    Evaluation Detail
                                </h1>
                                <p className="text-xs text-slate-500 leading-none mt-0.5">
                                    View and manage specific performance metrics for this record.
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
                                New Communication
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
                            <Card className="border-slate-200 shadow-sm">
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="pb-3 cursor-pointer select-none hover:bg-slate-50/80 transition-colors rounded-t-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Pencil className="w-4 h-4 text-violet-500" />
                                                <CardTitle className="text-sm font-semibold">
                                                    Edit Evaluation Request
                                                </CardTitle>
                                            </div>
                                            <ChevronDown
                                                className={cn(
                                                    'w-4 h-4 text-slate-400 transition-transform duration-200',
                                                    editOpen && 'rotate-180',
                                                )}
                                            />
                                        </div>
                                        <CardDescription className="text-xs mt-0.5">
                                            Update evaluation details, status, and result
                                        </CardDescription>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <Separator />
                                    <CardContent className="pt-5">
                                        <EditEvaluationForm
                                            evaluation={evaluation}
                                            onUpdated={(updated) => setEvaluation(updated)}
                                        />
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <Map className="w-4 h-4 text-emerald-500" />
                                    <CardTitle className="text-sm font-semibold">
                                        Operational Scenario — Operation Area
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    Geographic area for this evaluation request
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

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-blue-500" />
                                <CardTitle className="text-sm font-semibold">
                                    Task Completion
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Assignments, checklists and communications required for
                                this evaluation
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

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-amber-500" />
                                <CardTitle className="text-sm font-semibold">Files</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <EvaluationDetailFilePanel
                                evaluationId={evaluationId}
                                clientId={clientId}
                            />
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