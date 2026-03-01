// 'use client';

// import { Button } from '@/components/ui/button';
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from '@/components/ui/form';
// import { Input } from '@/components/ui/input';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { useClients, useCreateEvaluation, useLucProcedures } from '@/lib/hooks';
// import { createEvaluationSchema, type CreateEvaluationInput } from '@/lib/validation';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { Loader2, PlusCircle } from 'lucide-react';
// import { useForm } from 'react-hook-form';
// import { toast } from 'sonner';

// interface AddEvaluationFormProps {
//   onSuccess?: () => void;
// }

// const currentYear = new Date().getFullYear();

// export function AddEvaluationForm({  onSuccess }: AddEvaluationFormProps) {
//   const { data: clients = [] } = useClients(ownerId);
//   const { data: procedures = [] } = useLucProcedures(ownerId, 'EVALUATION');
//   const createMutation = useCreateEvaluation();

//   const form = useForm<CreateEvaluationInput>({
//     resolver: zodResolver(createEvaluationSchema),
//     defaultValues: {
//       fk_client_id: 0,
//       fk_luc_procedure_id: 0,
//       evaluation_status: 'NEW',
//       evaluation_request_date: new Date().toISOString().split('T')[0],
//       evaluation_year: currentYear,
//       evaluation_desc: '',
//       evaluation_offer: '',
//       evaluation_sale_manager: '',
//       evaluation_result: 'PROCESSING',
//     },
//   });

//   async function onSubmit(values: CreateEvaluationInput) {
//     try {
//       await createMutation.mutateAsync({ ...values, owner_id: ownerId, user_id: userId });
//       toast.success('Evaluation request added successfully');
//       form.reset();
//       onSuccess?.();
//     } catch (err) {
//       toast.error(err instanceof Error ? err.message : 'Failed to create evaluation');
//     }
//   }

//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
//         {/* Row 1: Client + LUC Procedure */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <FormField
//             control={form.control}
//             name="fk_client_id"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Client</FormLabel>
//                 <Select
//                   onValueChange={(v) => field.onChange(Number(v))}
//                   value={field.value ? String(field.value) : ''}
//                 >
//                   <FormControl>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select Client" />
//                     </SelectTrigger>
//                   </FormControl>
//                   <SelectContent>
//                     {clients.map((c) => (
//                       <SelectItem key={c.client_id} value={String(c.client_id)}>
//                         {c.client_name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={form.control}
//             name="fk_luc_procedure_id"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>LUC Procedure</FormLabel>
//                 <Select
//                   onValueChange={(v) => field.onChange(Number(v))}
//                   value={field.value ? String(field.value) : ''}
//                 >
//                   <FormControl>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select LUC Procedure" />
//                     </SelectTrigger>
//                   </FormControl>
//                   <SelectContent>
//                     {procedures.map((p) => (
//                       <SelectItem key={p.luc_procedure_id} value={String(p.luc_procedure_id)}>
//                         {p.luc_procedure_desc} [{p.luc_procedure_ver}]
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//         </div>

//         {/* Row 2: Status, Request Date, Year */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <FormField
//             control={form.control}
//             name="evaluation_status"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Status</FormLabel>
//                 <Select onValueChange={field.onChange} value={field.value}>
//                   <FormControl>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                   </FormControl>
//                   <SelectContent>
//                     <SelectItem value="NEW">New Task</SelectItem>
//                   </SelectContent>
//                 </Select>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={form.control}
//             name="evaluation_request_date"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Request Date</FormLabel>
//                 <FormControl>
//                   <Input type="date" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={form.control}
//             name="evaluation_year"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Year Reference</FormLabel>
//                 <Select
//                   onValueChange={(v) => field.onChange(Number(v))}
//                   value={String(field.value)}
//                 >
//                   <FormControl>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                   </FormControl>
//                   <SelectContent>
//                     {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
//                       <SelectItem key={y} value={String(y)}>
//                         {y}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//         </div>

//         {/* Row 3: Description, Offer, Sales Manager */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <FormField
//             control={form.control}
//             name="evaluation_desc"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Description</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Evaluation description…" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={form.control}
//             name="evaluation_offer"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Offer Ref</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Offer reference…" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={form.control}
//             name="evaluation_sale_manager"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Sales Manager</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Sales manager name…" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//         </div>

//         <div className="flex justify-end">
//           <Button
//             type="submit"
//             disabled={createMutation.isPending}
//             className="gap-2"
//           >
//             {createMutation.isPending ? (
//               <Loader2 className="w-4 h-4 animate-spin" />
//             ) : (
//               <PlusCircle className="w-4 h-4" />
//             )}
//             Add New Evaluation
//           </Button>
//         </div>
//       </form>
//     </Form>
//   );
// }