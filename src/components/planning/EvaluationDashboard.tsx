'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Evaluation } from '@/config/types/evaluation';
import { cn } from '@/lib/utils';
import {
    BookOpen
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EvaluationEditSheet } from './EvaluationEditSheet';
import { EvaluationTable } from './EvaluationTable';

interface EvaluationProps {
    isDark: boolean
}

const EvaluationDashboard: React.FC<EvaluationProps> = ({ isDark }) => {
    const { t } = useTranslation();
    const [editOpen, setEditOpen] = useState<boolean>(false);
    const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

    function handleView(evaluation: Evaluation) {
        setSelectedEvaluation(evaluation);
        setEditOpen(true);
    }

    return (
        <>
            <div className={cn('min-h-screen', isDark ? 'bg-slate-900' : 'bg-slate-50/60')}>
                <div className={cn('border-b py-4 top-0 z-10', isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white')}>
                    <div className="mx-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 rounded-full bg-violet-600" />
                            <div>
                                <h1 className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                                    {t("planning.evaluation.dashboardTitle")}
                                </h1>
                                <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                    {t("planning.evaluation.dashboardSubtitle")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto px-6 py-6 space-y-5">
                    <Card className={cn('shadow-sm', isDark ? 'bg-slate-800 border-slate-700' : 'border-slate-200')}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <BookOpen className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')} />
                                <CardTitle className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                                    {t("planning.evaluation.logbookTitle")}
                                </CardTitle>
                            </div>
                            <CardDescription className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                {t("planning.evaluation.logbookDescription")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EvaluationTable onView={handleView} isDark={isDark} />
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
