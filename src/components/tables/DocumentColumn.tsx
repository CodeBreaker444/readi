'use client';
 
import { getDownloadUrl } from '@/actions/repository';
import { RepositoryDocument } from '@/config/types/repository';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, Download, History, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

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
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Code <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-gray-700">
          {row.original.doc_code ?? '—'}
        </span>
      ),
      size: 90,
    },

    {
      id: 'title',
      accessorKey: 'title',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{row.original.title}</p>
          {row.original.description && (
            <p className="mt-0.5 truncate text-xs text-gray-400">{row.original.description}</p>
          )}
        </div>
      ),
    },

    {
      id: 'type_name',
      accessorKey: 'type_name',
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Type</span>
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="text-sm text-gray-800">{row.original.type_name ?? '—'}</p>
          <AreaBadge area={row.original.doc_area} />
        </div>
      ),
      size: 180,
    },

    {
      id: 'doc_area',
      accessorKey: 'doc_area',
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Area</span>
      ),
      cell: ({ row }) => <AreaBadge area={row.original.doc_area} />,
      size: 110,
      filterFn: (row, _, filterValue) => !filterValue || row.original.doc_area === filterValue,
    },

    {
      id: 'doc_category',
      accessorKey: 'doc_category',
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</span>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">{row.original.doc_category ?? '—'}</span>
      ),
      size: 120,
    },

    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 100,
      filterFn: (row, _, filterValue) => !filterValue || row.original.status === filterValue,
    },

    {
      id: 'version_label',
      accessorKey: 'version_label',
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Version</span>
      ),
      cell: ({ row }) => (
        <div>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-700">
            {row.original.version_label ?? '—'}
          </span>
          {row.original.file_name && (
            <p className="mt-1 max-w-30 truncate text-xs text-gray-400">{row.original.file_name}</p>
          )}
        </div>
      ),
      size: 100,
    },

    {
      id: 'dates',
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Eff. / Expiry</span>
      ),
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="text-gray-700">{fmtDate(row.original.effective_date)}</p>
          {row.original.expiry_date && (
            <p className="text-gray-400">{fmtDate(row.original.expiry_date)}</p>
          )}
        </div>
      ),
      size: 140,
    },

    {
      id: 'actions',
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</span>
      ),
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="flex items-center justify-end gap-0.5">
            {doc.file_path && <DownloadButton filePath={doc.file_path} />}
            <button
              title="Revision history"
              onClick={() => actions.onHistory(doc)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              title="Edit"
              onClick={() => actions.onEdit(doc)}
              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              title="Delete"
              onClick={() => actions.onDelete(doc)}
              className="rounded p-1.5 text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
      size: 140,
    },
  ];
}