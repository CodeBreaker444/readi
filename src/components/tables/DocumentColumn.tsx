'use client';
 
import { getDownloadUrl } from '@/actions/repository';
import { RepositoryDocument } from '@/config/types/repository';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, Calendar, Download, DownloadCloud, History, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const STATUS_CLASSES: Record<string, string> = {
  DRAFT:     'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED:  'bg-green-100 text-green-800',
  OBSOLETE:  'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

const AREA_CLASSES: Record<string, string> = {
  BOARD:          'bg-purple-100 text-purple-800',
  COMPLIANCE:     'bg-blue-100 text-blue-800',
  DATACONTROLLER: 'bg-cyan-100 text-cyan-800',
  MAINTENANCE:     'bg-orange-100 text-orange-800',
  OPERATION:      'bg-teal-100 text-teal-800',
  SAFETY:         'bg-red-100 text-red-800',
  SECURITY:       'bg-rose-100 text-rose-800',
  TRAINING:       'bg-indigo-100 text-indigo-800',
  VENDOR:         'bg-amber-100 text-amber-800',
};

function AreaBadge({ area }: { area?: string | null }) {
  if (!area) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${AREA_CLASSES[area] ?? 'bg-gray-100 text-gray-600'}`}>
      {area}
    </span>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return d; }
}

function DownloadButton({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const url = await getDownloadUrl(filePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Download failed', e);
      alert('Error during download. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Download"
      className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  );
}

export interface ColumnActions {
  onEdit:    (doc: RepositoryDocument) => void;
  onDelete:  (doc: RepositoryDocument) => void;
  onHistory: (doc: RepositoryDocument) => void;
}

export function getRepositoryColumns(actions: ColumnActions): ColumnDef<RepositoryDocument>[] {
  return [
    {
      id: 'doc_code',
      accessorKey: 'doc_code',
      header: "# Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500">
          {row.original.doc_code ?? '—'}
        </span>
      ),
      size: 90,
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-slate-800 dark:text-white">
            {row.original.title}
          </span>
          {row.original.description && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[250px]">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'type_name',
      accessorKey: 'type_name',
      header: "Type & Area",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-700 dark:text-slate-200">
            {row.original.type_name ?? '—'}
          </span>
          <Badge
            variant="outline"
            className="w-fit text-[10px] border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            {row.original.doc_area}
          </Badge>
        </div>
      ),
      size: 180,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: "Status",
      cell: ({ row }) => {
        const val = row.original.status || "";
        const isActive = val.toLowerCase() === 'active' || val.toLowerCase() === 'published';
        return (
          <Badge 
            variant="outline" 
            className={`text-[10px] border ${
              isActive 
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" 
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            {val}
          </Badge>
        );
      },
      size: 100,
    },
    {
      id: 'version_label',
      accessorKey: 'version_label',
      header: "Version",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="w-fit rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            v{row.original.version_label ?? '1.0'}
          </span>
          {row.original.file_name && (
            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
              {row.original.file_name}
            </span>
          )}
        </div>
      ),
      size: 100,
    },
    {
      id: 'dates',
      header: () => (
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>Validity</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 text-[11px]">
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Eff:</span>
            {fmtDate(row.original.effective_date)}
          </div>
          {row.original.expiry_date && (
            <div className="flex items-center gap-1 text-slate-400">
               <span className="text-[9px] font-bold text-slate-300 uppercase">Exp:</span>
               {fmtDate(row.original.expiry_date)}
            </div>
          )}
        </div>
      ),
      size: 140,
    },
    {
      id: 'actions',
      header: () => <span className="text-xs font-semibold text-slate-400">Actions</span>,
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {doc.file_path && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-violet-600">
                 <DownloadCloud className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              title="Revision history"
              onClick={() => actions.onHistory(doc)}
              className="h-7 w-7 text-slate-500 hover:bg-slate-100"
            >
              <History className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Edit"
              onClick={() => actions.onEdit(doc)}
              className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Delete"
              onClick={() => actions.onDelete(doc)}
              className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
      size: 140,
    },
  ];
}