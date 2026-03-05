'use client';

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
import { Evaluation } from '@/config/types/evaluation';
import { cn } from '@/lib/utils';
import {
    BookOpen,
    ChevronDown,
    PlusCircle
} from 'lucide-react';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { AddEvaluationForm } from './AddEvaluationForm';
import { EvaluationEditSheet } from './EvaluationEditSheet';
import { EvaluationFilePanel } from './EvaluationFilePanel';
import { EvaluationTable } from './EvaluationTable';

interface EvaluationProps {
    isDark: boolean
}

const EvaluationDashboard: React.FC<EvaluationProps> = ({ isDark }) => {
    const [addOpen, setAddOpen] = useState<boolean>(false);
    const [editOpen, setEditOpen] = useState<boolean>(false);
    const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

    function handleView(evaluation: Evaluation) {
        setSelectedEvaluation(evaluation);
        setEditOpen(true);
    }

    return (
        <>
            <Toaster position="top-right" richColors />
            <div className="min-h-screen bg-slate-50/60">
                <div className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-10">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div>
                                <h1 className="text-base font-semibold text-slate-900">
                                    Evaluation Dashboard
                                </h1>
                                <p className="text-xs text-slate-500">Planning · Operational Scenario Requests</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="gap-2 bg-violet-500 hover:bg-violet-600"
                            onClick={() => setAddOpen((p) => !p)}
                        >
                            <PlusCircle className="w-4 h-4" />
                            New Evaluation
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

                    <Collapsible open={addOpen} onOpenChange={setAddOpen}>
                        <Card className="border-slate-200 shadow-sm">
                            <CollapsibleTrigger asChild>
                                <CardHeader className="pb-3 cursor-pointer select-none hover:bg-slate-50/80 transition-colors rounded-t-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <PlusCircle className="w-4 h-4 text-blue-600" />
                                            <CardTitle className="text-sm font-semibold">
                                                [GO.00.P01] Add Evaluation Request
                                            </CardTitle>
                                        </div>
                                        <ChevronDown
                                            className={cn(
                                                'w-4 h-4 text-slate-400 transition-transform duration-200',
                                                addOpen && 'rotate-180',
                                            )}
                                        />
                                    </div>
                                    <CardDescription className="text-xs mt-0.5">
                                        Fill the form to add a new evaluation / operational scenario request
                                    </CardDescription>
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <Separator />
                                <CardContent className="pt-5">
                                    <AddEvaluationForm
                                        onSuccess={() => setAddOpen(false)}
                                    />
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-slate-500" />
                                <CardTitle className="text-sm font-semibold">
                                    Evaluation — Operational Scenario Request Logbook
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Log of Operational Scenario Requests
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EvaluationTable onView={handleView} />
                        </CardContent>
                    </Card>

                    {selectedEvaluation && !editOpen && (
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    Files —{' '}
                                    <span className="font-mono text-xs text-slate-400">
                                        EVAL_{selectedEvaluation.evaluation_id}
                                    </span>{' '}
                                    {selectedEvaluation.evaluation_desc}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <EvaluationFilePanel
                                    evaluationId={selectedEvaluation.evaluation_id}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <EvaluationEditSheet
                evaluation={selectedEvaluation}
                open={editOpen}
                onOpenChange={(o) => {
                    setEditOpen(o);
                    if (!o && selectedEvaluation) {
                    }
                }}
                onUpdated={(updated) => {
                    setSelectedEvaluation(updated);
                }}
            />
        </>
    );
}

export default EvaluationDashboard