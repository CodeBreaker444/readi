'use client';

import { useAuthorization } from '@/components/authorization/AuthorizationProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Evaluation } from '@/config/types/evaluation';
import type { Resolver } from 'react-hook-form';
import z from 'zod';
import { ResultBadge, StatusBadge } from './StatusBadge';

interface EvaluationEditSheetProps {
    evaluation: Evaluation | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated?: (updated: Evaluation) => void;  
}
const EvaluationStatusEnum = z.enum([
  'NEW',
  'PROGRESS',
  'REVIEW',
  'SUSPENDED',
  'DONE',
]);

export const EvaluationResultEnum = z.enum([
  'PROCESSING',
  'RESULT_POSITIVE',
  'RESULT_NEGATIVE',
]);

const updateEvaluationSchema = z.object({
  evaluation_id: z.number().int().positive('Invalid evaluation ID'),
  fk_owner_id: z.number().int().positive('Invalid owner ID'),
  fk_client_id: z.number().int().positive('Invalid client ID'),
  evaluation_status: EvaluationStatusEnum,
  evaluation_result: EvaluationResultEnum,
  evaluation_request_date: z.string().min(1, 'Request date is required'),
  evaluation_year: z.number().int().min(2000).max(2100),
  evaluation_desc: z.string().max(500).default(''),
  evaluation_offer: z.string().max(100).default(''),
  evaluation_sale_manager: z.string().max(100).default(''),
  evaluation_folder: z.string().default(''),
  fk_luc_procedure_id: z.number().int().positive().optional(),
  fk_evaluation_code: z.string().optional(),
});

type UpdateEvaluationFormValues = z.infer<typeof updateEvaluationSchema>;

export function EvaluationEditSheet({
    evaluation,
    open,
    onOpenChange,
    onUpdated,
}: EvaluationEditSheetProps) {
    const { t } = useTranslation();
    const { requireAuthorization } = useAuthorization();
    const [isUpdating, setIsUpdating] = useState(false);

const form = useForm<UpdateEvaluationFormValues>({
        resolver: zodResolver(updateEvaluationSchema) as unknown as Resolver<UpdateEvaluationFormValues>,
        defaultValues: {
            evaluation_id: 0,
            fk_owner_id: 0,
            fk_client_id: 0,
            evaluation_status: 'NEW',
            evaluation_result: 'PROCESSING',
            evaluation_request_date: '',
            evaluation_year: new Date().getFullYear(),
            evaluation_desc: '',
            evaluation_offer: '',
            evaluation_sale_manager: '',
            evaluation_folder: '',
            fk_evaluation_code: '',
            fk_luc_procedure_id: undefined, 
        },
    });

    useEffect(() => {
        if (evaluation) {
            form.reset({
                evaluation_id: evaluation.evaluation_id,
                fk_owner_id: evaluation.fk_owner_id,
                fk_client_id: evaluation.fk_client_id,
                fk_luc_procedure_id: evaluation.fk_luc_procedure_id,
                evaluation_status: evaluation.evaluation_status,
                evaluation_result: evaluation.evaluation_result,
                evaluation_request_date: evaluation.evaluation_request_date ?? '',
                evaluation_year: evaluation.evaluation_year,
                evaluation_desc: evaluation.evaluation_desc ?? '',
                evaluation_offer: evaluation.evaluation_offer ?? '',
                evaluation_sale_manager: evaluation.evaluation_sale_manager ?? '',
                evaluation_folder: evaluation.evaluation_folder ?? '',
                fk_evaluation_code: evaluation.fk_evaluation_code ?? '',
            });
        }
    }, [evaluation, form]);

   async function onSubmit(values: UpdateEvaluationFormValues) {
        const prevStatus = evaluation?.evaluation_status;
        const authRequired = (values.evaluation_status === 'DONE' || values.evaluation_status === 'REVIEW')
            && values.evaluation_status !== prevStatus;

        if (authRequired) {
            try {
                await requireAuthorization({
                    actionType: values.evaluation_status === 'DONE' ? 'evaluation_done' : 'evaluation_review',
                    entityType: 'evaluation',
                    entityId:   String(values.evaluation_id),
                    label:      `Set Evaluation ${values.evaluation_status}: EVAL_${values.evaluation_id}`,
                    details: {
                        evaluation_id: values.evaluation_id,
                        from:          prevStatus,
                        to:            values.evaluation_status,
                    },
                });
            } catch {
                return;
            }
        }

        try {
            setIsUpdating(true);
            const response = await axios.put(
                `/api/evaluation/${values.evaluation_id}`,
                values
            );

            toast.success(t('planning.evaluation.updated'));

            const updatedEvaluation: Evaluation = response.data?.data ?? (values as unknown as Evaluation);
            if (onUpdated) onUpdated(updatedEvaluation);

            onOpenChange(false);
        } catch (err) {
            const message = axios.isAxiosError(err)
                ? err.response?.data?.message
                : t('planning.evaluation.updateFailed');
            toast.error(message);
        } finally {
            setIsUpdating(false);
        }
    }

    if (!evaluation) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <span className="font-mono text-sm text-slate-400">
                            EVAL_{evaluation.evaluation_id}
                        </span>
                        <StatusBadge status={evaluation.evaluation_status} />
                    </SheetTitle>
                    <SheetDescription className="text-sm text-slate-500">
                        {evaluation.client_name} · {evaluation.evaluation_year}
                    </SheetDescription>
                </SheetHeader>

                <Separator className="mb-5" />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">{t('planning.form.client')}</label>
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                {evaluation.client_name}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="evaluation_request_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('planning.form.requestDate')}</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="evaluation_year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('planning.form.year')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="evaluation_desc"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('planning.form.description')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('planning.form.descriptionPlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="evaluation_offer"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('planning.form.offerRef')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('planning.form.offerRefPlaceholder')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="evaluation_sale_manager"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('planning.form.salesManager')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('planning.form.namePlaceholder')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="evaluation_status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('planning.form.status')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="NEW">{t('planning.status.newTask')}</SelectItem>
                                                <SelectItem value="PROGRESS">{t('planning.status.inProgress')}</SelectItem>
                                                <SelectItem value="REVIEW">{t('planning.status.feedbackRequest')}</SelectItem>
                                                <SelectItem value="SUSPENDED">{t('planning.status.suspended')}</SelectItem>
                                                <SelectItem value="DONE">{t('planning.status.done')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="evaluation_result"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('planning.form.result')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="PROCESSING">{t('planning.status.processing')}</SelectItem>
                                                <SelectItem value="RESULT_POSITIVE">{t('planning.status.completedPositive')}</SelectItem>
                                                <SelectItem value="RESULT_NEGATIVE">{t('planning.status.completedRefused')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase font-semibold text-slate-400">
                                    {t('planning.form.lastUpdate')} {evaluation.last_update ?? '—'}
                                </span>
                                <ResultBadge result={form.watch('evaluation_result')} />
                            </div>
                            <Button type="submit" disabled={isUpdating} className="gap-2 min-w-[120px]">
                                {isUpdating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {t('planning.actions.saveChanges')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}