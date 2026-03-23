'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Evaluation } from '@/config/types/evaluation';
import {
    BookOpen
} from 'lucide-react';
import { useState } from 'react';
import { EvaluationEditSheet } from './EvaluationEditSheet';
import { EvaluationTable } from './EvaluationTable';

interface EvaluationProps {
    isDark: boolean
}

const EvaluationDashboard: React.FC<EvaluationProps> = ({ isDark }) => {
    const [editOpen, setEditOpen] = useState<boolean>(false);
    const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

    function handleView(evaluation: Evaluation) {
        setSelectedEvaluation(evaluation);
        setEditOpen(true);
    }

    return (
        <>
            <div className="min-h-screen bg-slate-50/60">
                <div className="border-b border-slate-200 bg-white py-4  top-0 z-10">
                    <div className="mx-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                             <div className="w-1 h-6 rounded-full bg-violet-600" />
                            <div>
                                <h1 className="text-base font-semibold text-slate-900">
                                    Evaluation Dashboard
                                </h1>
                                <p className="text-xs text-slate-500">Planning · Operational Scenario Requests</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto px-6 py-6 space-y-5">

                     
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