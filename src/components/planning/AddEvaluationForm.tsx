'use client';

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
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Loader2, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';


const createEvaluationSchema = z.object({
    fk_client_id: z
        .number({ message: 'Client is required' })
        .int()
        .positive('Please select a client'),
    fk_luc_procedure_id: z
        .number({ message: 'LUC Procedure is required' })
        .int()
        .positive('Please select a LUC procedure'),
    evaluation_status: z.enum(['NEW', 'PROGRESS', 'REVIEW', 'SUSPENDED', 'DONE']).default('NEW'),
    evaluation_request_date: z
        .string({ message: 'Request date is required' })
        .min(1, 'Request date is required'),
    evaluation_year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .default(new Date().getFullYear()),
    evaluation_desc: z
        .string()
        .max(500, 'Description must be under 500 characters')
        .optional()
        .default(''),
    evaluation_offer: z
        .string()
        .max(100, 'Offer ref must be under 100 characters')
        .optional()
        .default(''),
    evaluation_sale_manager: z
        .string()
        .max(100, 'Sales manager must be under 100 characters')
        .optional()
        .default(''),
    evaluation_result: z.enum(['PROCESSING', 'RESULT_POSITIVE', 'RESULT_NEGATIVE']).default('PROCESSING'),
});

type CreateEvaluationFormValues = z.infer<typeof createEvaluationSchema>;

interface AddEvaluationFormProps {
    onSuccess?: () => void;
}

const currentYear = new Date().getFullYear();

export function AddEvaluationForm({ onSuccess }: AddEvaluationFormProps) {
    const [clients, setClients] = useState<{ client_id: number; client_name: string }[]>([]);
    const [procedures, setProcedures] = useState<{
        luc_procedure_id: number;
        luc_procedure_desc: string;
        luc_procedure_ver: string;
    }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchClients();
        fetchProcedures();
    }, []);

    const fetchProcedures = async () => {
        try {
            const res = await axios.get('/api/evaluation/luc-procedures?sector=EVALUATION');
            const data = res.data;
            if (data.code === 1 && data.data) setProcedures(data.data);
        } catch (e) {
            console.error('Failed to fetch procedures', e);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await axios.get('/api/client/list');
            const data = res.data;
            if (data.code === 1 && data.data) setClients(data.data);
        } catch (e) {
            console.error('Failed to fetch clients', e);
        }
    };

    const form = useForm<CreateEvaluationFormValues>({
        resolver: zodResolver(createEvaluationSchema) as Resolver<CreateEvaluationFormValues>,
        defaultValues: {
            fk_client_id: 0,
            fk_luc_procedure_id: 0,
            evaluation_status: 'NEW',
            evaluation_request_date: new Date().toISOString().split('T')[0],
            evaluation_year: currentYear,
            evaluation_desc: '',
            evaluation_offer: '',
            evaluation_sale_manager: '',
            evaluation_result: 'PROCESSING',
        },
    });

    async function onSubmit(values: CreateEvaluationFormValues) {
        setIsSubmitting(true);
        try {
            const response = await axios.post('/api/evaluation', values);
            if (response.data.code === 1) {
                toast.success('Evaluation request added successfully');
                form.reset();
                onSuccess?.();
            } else {
                throw new Error(response.data.message || 'Submission failed');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: unknown } } };
            const errMsg = axiosErr.response?.data?.message;
            toast.error(
                typeof errMsg === 'object'
                    ? 'Validation Error'
                    : (errMsg as string | undefined) ?? 'Failed to create evaluation',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="fk_client_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Client</FormLabel>
                                <Select
                                    onValueChange={(v) => field.onChange(Number(v))}
                                    value={field.value ? String(field.value) : ''}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Client" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {clients.map((c) => (
                                            <SelectItem key={c.client_id} value={String(c.client_id)}>
                                                {c.client_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="fk_luc_procedure_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>LUC Procedure</FormLabel>
                                <Select
                                    onValueChange={(v) => field.onChange(Number(v))}
                                    value={field.value ? String(field.value) : ''}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select LUC Procedure" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {procedures.map((p) => (
                                            <SelectItem key={p.luc_procedure_id} value={String(p.luc_procedure_id)}>
                                                {p.luc_procedure_desc} [{p.luc_procedure_ver}]
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="evaluation_status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="NEW">New Task</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="evaluation_request_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Request Date</FormLabel>
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
                                <FormLabel>Year Reference</FormLabel>
                                <Select
                                    onValueChange={(v) => field.onChange(Number(v))}
                                    value={String(field.value)}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                                            <SelectItem key={y} value={String(y)}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="evaluation_desc"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Input placeholder="Evaluation description…" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="evaluation_offer"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Offer Ref</FormLabel>
                                <FormControl>
                                    <Input placeholder="Offer reference…" {...field} />
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
                                <FormLabel>Sales Manager</FormLabel>
                                <FormControl>
                                    <Input placeholder="Sales manager name…" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting} className="gap-2 bg-violet-500 hover:bg-violet-600">
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <PlusCircle className="w-4 h-4" />
                        )}
                        Add New Evaluation
                    </Button>
                </div>
            </form>
        </Form>
    );
}