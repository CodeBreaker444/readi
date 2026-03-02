// 'use client';

// import { zodResolver } from '@hookform/resolvers/zod';
// import axios from 'axios';
// import { Loader2, Save } from 'lucide-react';
// import { useEffect, useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { toast } from 'sonner';

// import { Button } from '@/components/ui/button';
// import {
//     Form,
//     FormControl,
//     FormField,
//     FormItem,
//     FormLabel,
//     FormMessage,
// } from '@/components/ui/form';
// import { Input } from '@/components/ui/input';
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from '@/components/ui/select';
// import { Separator } from '@/components/ui/separator';
// import {
//     Sheet,
//     SheetContent,
//     SheetDescription,
//     SheetHeader,
//     SheetTitle,
// } from '@/components/ui/sheet';
// import { Evaluation, UpdateEvaluationInput } from '@/config/types/evaluation';
// import z from 'zod';
// import { ResultBadge, StatusBadge } from './StatusBadge';

// interface EvaluationEditSheetProps {
//     evaluation: Evaluation | null;
//     open: boolean;
//     onOpenChange: (open: boolean) => void;
//     onUpdated?: () => void;  
// }
// const EvaluationStatusEnum = z.enum([
//   'NEW',
//   'PROGRESS',
//   'REVIEW',
//   'SUSPENDED',
//   'DONE',
// ]);

// export const EvaluationResultEnum = z.enum([
//   'PROCESSING',
//   'RESULT_POSITIVE',
//   'RESULT_NEGATIVE',
// ]);

// export const updateEvaluationSchema = z.object({
//   evaluation_id: z.number().int().positive('Invalid evaluation ID'),
//   fk_owner_id: z.number().int().positive('Invalid owner ID'),
//   fk_client_id: z.number().int().positive('Invalid client ID'),
//   evaluation_status: EvaluationStatusEnum,
//   evaluation_result: EvaluationResultEnum,
//   evaluation_request_date: z.string().min(1, 'Request date is required'),
//   evaluation_year: z.number().int().min(2000, 'Year must be >= 2000').max(2100, 'Year must be <= 2100'),

//   evaluation_desc: z
//     .string()
//     .max(500, 'Description must be under 500 characters')
//     .optional()
//     .default(''),

//   evaluation_offer: z
//     .string()
//     .max(100, 'Offer ref must be under 100 characters')
//     .optional()
//     .default(''),

//   evaluation_sale_manager: z
//     .string()
//     .max(100, 'Sales manager must be under 100 characters')
//     .optional()
//     .default(''),

//   evaluation_folder: z
//     .string()
//     .optional()
//     .default(''),

//   fk_luc_procedure_id: z
//     .number()
//     .int()
//     .positive()
//     .optional(),

//   fk_evaluation_code: z
//     .string()
//     .optional(),
// });
// export function EvaluationEditSheet({
//     evaluation,
//     open,
//     onOpenChange,
//     onUpdated,
// }: EvaluationEditSheetProps) {
//     const [isUpdating, setIsUpdating] = useState(false);

//     const form = useForm<UpdateEvaluationInput>({
//         resolver: zodResolver(updateEvaluationSchema),
//         defaultValues: {
//             evaluation_id: 0,
//             fk_owner_id: 0,
//             fk_client_id: 0,
//             evaluation_status: 'NEW',
//             evaluation_result: 'PROCESSING',
//             evaluation_request_date: '',
//             evaluation_year: new Date().getFullYear(),
//             evaluation_desc: '',
//             evaluation_offer: '',
//             evaluation_sale_manager: '',
//             evaluation_folder: '',
//             fk_evaluation_code: '',
//         },
//     });

//     useEffect(() => {
//         if (evaluation) {
//             form.reset({
//                 evaluation_id: evaluation.evaluation_id,
//                 fk_owner_id: evaluation.fk_owner_id,
//                 fk_client_id: evaluation.fk_client_id,
//                 fk_luc_procedure_id: evaluation.fk_luc_procedure_id,
//                 evaluation_status: evaluation.evaluation_status,
//                 evaluation_result: evaluation.evaluation_result,
//                 evaluation_request_date: evaluation.evaluation_request_date ?? '',
//                 evaluation_year: evaluation.evaluation_year,
//                 evaluation_desc: evaluation.evaluation_desc ?? '',
//                 evaluation_offer: evaluation.evaluation_offer ?? '',
//                 evaluation_sale_manager: evaluation.evaluation_sale_manager ?? '',
//                 evaluation_folder: evaluation.evaluation_folder ?? '',
//                 fk_evaluation_code: evaluation.fk_evaluation_code ?? '',
//             });
//         }
//     }, [evaluation, form]);

//     async function onSubmit(values: UpdateEvaluationInput) {
//         try {
//             setIsUpdating(true);
//             const response = await axios.put(
//                 `/api/evaluation/${values.evaluation_id}`,
//                 values
//             );

//             toast.success('Evaluation updated successfully');
            
//             if (onUpdated) onUpdated();
            
//             onOpenChange(false);
//         } catch (err) {
//             const message = axios.isAxiosError(err) 
//                 ? err.response?.data?.message 
//                 : 'Update failed';
//             toast.error(message);
//         } finally {
//             setIsUpdating(false);
//         }
//     }

//     if (!evaluation) return null;

//     return (
//         <Sheet open={open} onOpenChange={onOpenChange}>
//             <SheetContent className="sm:max-w-xl overflow-y-auto">
//                 <SheetHeader className="pb-4">
//                     <SheetTitle className="flex items-center gap-2">
//                         <span className="font-mono text-sm text-slate-400">
//                             EVAL_{evaluation.evaluation_id}
//                         </span>
//                         <StatusBadge status={evaluation.evaluation_status} />
//                     </SheetTitle>
//                     <SheetDescription className="text-sm text-slate-500">
//                         {evaluation.client_name} · {evaluation.evaluation_year}
//                     </SheetDescription>
//                 </SheetHeader>

//                 <Separator className="mb-5" />

//                 <Form {...form}>
//                     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
//                         <div className="space-y-1.5">
//                             <label className="text-sm font-medium text-slate-700">Client</label>
//                             <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
//                                 {evaluation.client_name}
//                             </div>
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                             <FormField
//                                 control={form.control}
//                                 name="evaluation_request_date"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel>Request Date</FormLabel>
//                                         <FormControl>
//                                             <Input type="date" {...field} />
//                                         </FormControl>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                             <FormField
//                                 control={form.control}
//                                 name="evaluation_year"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel>Year</FormLabel>
//                                         <FormControl>
//                                             <Input
//                                                 type="number"
//                                                 {...field}
//                                                 onChange={(e) => field.onChange(Number(e.target.value))}
//                                             />
//                                         </FormControl>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                         </div>

//                         <FormField
//                             control={form.control}
//                             name="evaluation_desc"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Description</FormLabel>
//                                     <FormControl>
//                                         <Input placeholder="Description…" {...field} />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <div className="grid grid-cols-2 gap-4">
//                             <FormField
//                                 control={form.control}
//                                 name="evaluation_offer"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel>Offer Ref</FormLabel>
//                                         <FormControl>
//                                             <Input placeholder="Offer ref…" {...field} />
//                                         </FormControl>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                             <FormField
//                                 control={form.control}
//                                 name="evaluation_sale_manager"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel>Sales Manager</FormLabel>
//                                         <FormControl>
//                                             <Input placeholder="Name…" {...field} />
//                                         </FormControl>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                         </div>

//                         <Separator />

//                         <div className="grid grid-cols-2 gap-4">
//                             <FormField
//                                 control={form.control}
//                                 name="evaluation_status"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel>Status</FormLabel>
//                                         <Select onValueChange={field.onChange} value={field.value}>
//                                             <FormControl>
//                                                 <SelectTrigger>
//                                                     <SelectValue />
//                                                 </SelectTrigger>
//                                             </FormControl>
//                                             <SelectContent>
//                                                 <SelectItem value="NEW">New Task</SelectItem>
//                                                 <SelectItem value="PROGRESS">In Progress</SelectItem>
//                                                 <SelectItem value="REVIEW">Feedback Request</SelectItem>
//                                                 <SelectItem value="SUSPENDED">Suspended</SelectItem>
//                                                 <SelectItem value="DONE">Done</SelectItem>
//                                             </SelectContent>
//                                         </Select>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />

//                             <FormField
//                                 control={form.control}
//                                 name="evaluation_result"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel>Result</FormLabel>
//                                         <Select onValueChange={field.onChange} value={field.value}>
//                                             <FormControl>
//                                                 <SelectTrigger>
//                                                     <SelectValue />
//                                                 </SelectTrigger>
//                                             </FormControl>
//                                             <SelectContent>
//                                                 <SelectItem value="PROCESSING">Processing</SelectItem>
//                                                 <SelectItem value="RESULT_POSITIVE">Completed Positive</SelectItem>
//                                                 <SelectItem value="RESULT_NEGATIVE">Completed Refused</SelectItem>
//                                             </SelectContent>
//                                         </Select>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                         </div>

//                         <div className="flex items-center justify-between pt-4">
//                             <div className="flex flex-col gap-1">
//                                 <span className="text-[10px] uppercase font-semibold text-slate-400">
//                                     Last update: {evaluation.last_update ?? '—'}
//                                 </span>
//                                 <ResultBadge result={form.watch('evaluation_result')} />
//                             </div>
//                             <Button type="submit" disabled={isUpdating} className="gap-2 min-w-[120px]">
//                                 {isUpdating ? (
//                                     <Loader2 className="w-4 h-4 animate-spin" />
//                                 ) : (
//                                     <Save className="w-4 h-4" />
//                                 )}
//                                 Save Changes
//                             </Button>
//                         </div>
//                     </form>
//                 </Form>
//             </SheetContent>
//         </Sheet>
//     );
// }