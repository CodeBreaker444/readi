'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Evaluation } from '@/config/types/evaluation';
import axios from 'axios';
import { ArrowLeft, CheckSquare, MessageSquare, Pencil } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { EvaluationEditSheet } from './EvaluationEditSheet';
import { EvaluationFilePanel } from './EvaluationFilePanel';
import { ResultBadge, StatusBadge } from './StatusBadge';

export default function EvaluationDetailPage() {
    const router = useRouter()
    const params = useParams();
    const searchParams = useSearchParams();

    const evaluationId = Number(params.id);
    const clientId = Number(searchParams.get('c_id') ?? 0);

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(null);

    const displayEvaluation = currentEvaluation ?? evaluation;

    useEffect(() => {
        const getEvaluation = async () => {
            if (!evaluationId) return;

            try {
                setIsLoading(true);
                setIsError(false);

                const response = await axios.get(`/api/evaluation/${evaluationId}`)

                setEvaluation(response.data.data);
            } catch (error) {
                console.error("Error fetching evaluation:", error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        getEvaluation();
    }, [evaluationId]);
    if (isLoading) {
        return (
            <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    if (isError || !displayEvaluation) {
        return (
            <div className="max-w-screen-xl mx-auto px-6 py-8">
                <p className="text-red-500 text-sm">Evaluation not found or access denied.</p>
                <Button variant="ghost" size="sm" className="mt-4 gap-1.5" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>
            </div>
        );
    }

    return (
        <>
            <Toaster position="top-right" richColors />

            <div className="min-h-screen bg-slate-50/60">
                <div className="border-b border-slate-200 bg-white px-6 py-3 sticky top-0 z-10">
                    <div className="max-w-screen-xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                onClick={() => router.push('/evaluations')}
                                className="text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                Evaluation Dashboard
                            </button>
                            <span className="text-slate-300">/</span>
                            <span className="font-medium text-slate-800">
                                EVAL_{displayEvaluation.evaluation_id}
                            </span>
                            <StatusBadge status={displayEvaluation.evaluation_status} />
                            <ResultBadge result={displayEvaluation.evaluation_result} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() => setEditOpen(true)}
                            >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                            </Button>
                            {displayEvaluation.evaluation_status !== 'DONE' &&
                                displayEvaluation.evaluation_result === 'PROCESSING' && (
                                    <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700">
                                        <CheckSquare className="w-3.5 h-3.5" />
                                        Move to Planning
                                    </Button>
                                )}
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Client', value: displayEvaluation.client_name },
                            { label: 'Request Date', value: displayEvaluation.evaluation_request_date },
                            { label: 'Year', value: String(displayEvaluation.evaluation_year) },
                            { label: 'LUC Procedure', value: `${displayEvaluation.luc_procedure_code ?? '—'} [v${displayEvaluation.luc_procedure_ver ?? '—'}]` },
                        ].map(({ label, value }) => (
                            <div
                                key={label}
                                className="bg-white rounded-lg border border-slate-200 px-4 py-3"
                            >
                                <p className="text-xs text-slate-400 font-medium">{label}</p>
                                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate" title={value}>
                                    {value || '—'}
                                </p>
                            </div>
                        ))}
                    </div>

                    {displayEvaluation.evaluation_desc && (
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="pt-4 pb-4">
                                <p className="text-xs text-slate-400 font-medium mb-1">Description</p>
                                <p className="text-sm text-slate-700">{displayEvaluation.evaluation_desc}</p>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <MessageSquare className="w-3.5 h-3.5" />
                            New Communication
                        </Button>
                    </div>

                    <Separator />

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Files & Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EvaluationFilePanel
                                evaluationId={displayEvaluation.evaluation_id}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <EvaluationEditSheet
                evaluation={displayEvaluation}
                open={editOpen}
                onOpenChange={setEditOpen}
                onUpdated={(updated:any) => {
                    setCurrentEvaluation(updated);
                    setEditOpen(false);
                }}
            />
        </>
    );
}