'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { EvaluationFile } from '@/config/types/evaluation';
import { ColumnDef } from '@tanstack/react-table';
import { Download, Trash2 } from 'lucide-react';

export const getEvaluationFileColumns = (
  evaluationId: number,
  onDelete?: (file: EvaluationFile) => void,
): ColumnDef<EvaluationFile>[] => [
  {
    accessorKey: 'evaluation_file_id',
    header: () => <span className="text-xs font-semibold text-slate-500">#</span>,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-slate-400">{getValue() as number}</span>
    ),
    size: 48,
  },
  {
    accessorKey: 'evaluation_file_filename',
    header: () => <span className="text-xs font-semibold text-slate-500">Filename</span>,
    cell: ({ row }) => {
      const file = row.original;
      return (
        <a
          href={`/api/evaluation/${evaluationId}/files/download?key=${encodeURIComponent(file.evaluation_file_folder)}`}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          download={file.evaluation_file_filename}
        >
          <Download className="w-3 h-3 shrink-0" />
          {file.evaluation_file_filename}
        </a>
      );
    },
  },
  {
    accessorKey: 'evaluation_file_desc',
    header: () => <span className="text-xs font-semibold text-slate-500">Description</span>,
    cell: ({ getValue }) => (
      <span className="text-xs text-slate-600">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'evaluation_file_ver',
    header: () => <span className="text-xs font-semibold text-slate-500">Version</span>,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">v{getValue() as string}</span>
    ),
    size: 80,
  },
  // {
  //   accessorKey: 'evaluation_file_filesize',
  //   header: () => <span className="text-xs font-semibold text-slate-500">Size</span>,
  //   cell: ({ getValue }) => {
  //     const size = getValue() as number;
  //     return (
  //       <span className="text-xs text-slate-500">
  //         {size ? `${size.toFixed(2)} MB` : '—'}
  //       </span>
  //     );
  //   },
  //   size: 80,
  // },
  {
    accessorKey: 'last_update',
    header: () => <span className="text-xs font-semibold text-slate-500">Modified</span>,
    cell: ({ getValue }) => {
      const val = getValue() as string;
      return (
        <span className="text-xs text-slate-400 font-mono">
          {val ? new Date(val).toLocaleDateString() : '—'}
        </span>
      );
    },
    size: 100,
  },
  {
    id: 'actions',
    size: 48,
    cell: ({ row }) => {
      const file = row.original;
      if (!onDelete) return null;
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete file?</AlertDialogTitle>
              <AlertDialogDescription>
                Delete <strong>{file.evaluation_file_filename}</strong>? This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(file)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    },
  },
];