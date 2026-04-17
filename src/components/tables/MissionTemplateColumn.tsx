'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { TFunction } from 'i18next';
import { Download } from 'lucide-react';

export interface MissionTemplateRow {
  mission_planning_id: number;
  mission_planning_code: string;
  mission_planning_desc: string | null;
  mission_planning_active: string;
  mission_planning_ver: number;
  mission_planning_filename: string | null;
  mission_planning_filesize: number | null;
  mission_planning_s3_key: string | null;
  created_at: string;
  updated_at: string;
  planning_code: string | null;
  planning_name: string | null;
  planning_status: string | null;
  evaluation_code: string | null;
  client_name: string | null;
  pilot_fullname: string | null;
  tool_code: string | null;
  download_url: string | null;
}

interface ColumnOptions {
  isDark: boolean;
  t: TFunction; // Added TFunction to options
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getMissionTemplateColumns({
  isDark,
  t, // Destructured t
}: ColumnOptions): ColumnDef<MissionTemplateRow, any>[] {
  return [
    {
      accessorKey: 'mission_planning_code',
      header: t('planning.missionTemplate.templateCode'),
      size: 130,
      cell: ({ getValue }) => (
        <span className="font-mono text-[11px] tabular-nums font-semibold text-violet-500">
          {String(getValue() ?? '—')}
        </span>
      ),
    },

    {
      accessorKey: 'evaluation_code',
      header: t('planning.missionTemplate.evaluationCol'),
      size: 120,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span className="opacity-30">—</span>;
        return (
          <span className="font-mono text-[11px] tabular-nums">
            {String(val)}
          </span>
        );
      },
    },

    {
      accessorKey: 'planning_name',
      header: t('planning.missionTemplate.planningCol'),
      size: 110,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span className="opacity-30">—</span>;
        return (
          <span className="truncate max-w-[140px] inline-block">
            {String(val)}
          </span>
        );
      },
    },

    {
      accessorKey: 'client_name',
      header: t('planning.form.client'),
      size: 150,
      cell: ({ getValue }) => (
        <span className="truncate max-w-[140px] inline-block">
          {String(getValue() ?? '—')}
        </span>
      ),
    },

    {
      accessorKey: 'pilot_fullname',
      header: t('planning.missionTemplate.pic'),
      size: 140,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span className="opacity-30">—</span>;
        return <span className="truncate max-w-[130px] inline-block">{String(val)}</span>;
      },
    },

    {
      accessorKey: 'tool_code',
      header: t('planning.form.drone'),
      size: 100,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span className="opacity-30">—</span>;
        return (
          <span className="font-mono text-[11px] tabular-nums">{String(val)}</span>
        );
      },
    },

    {
      accessorKey: 'mission_planning_desc',
      header: t('planning.form.description'),
      size: 200,
      cell: ({ getValue }) => (
        <span
          className="truncate max-w-[190px] inline-block"
          title={String(getValue() ?? '')}
        >
          {String(getValue() ?? '—')}
        </span>
      ),
    },

    {
      accessorKey: 'mission_planning_ver',
      header: t('planning.form.version'),
      size: 50,
      cell: ({ getValue }) => (
        <span className="font-mono text-[11px] tabular-nums text-center block">
          v{String(getValue() ?? 1)}
        </span>
      ),
    },

    {
      accessorKey: 'planning_status',
      header: t('planning.form.status'),
      size: 100,
      cell: ({ getValue }) => {
        const status = String(getValue() ?? '');
        if (!status) return <span className="opacity-30">—</span>;

        const colorMap: Record<string, string> = {
          NEW: 'bg-blue-500/10 text-blue-500',
          IN_PROGRESS: 'bg-amber-500/10 text-amber-500',
          COMPLETED: 'bg-emerald-500/10 text-emerald-500',
          APPROVED: 'bg-emerald-500/10 text-emerald-500',
          CANCELLED: 'bg-red-500/10 text-red-500',
        };

        const classes = colorMap[status.toUpperCase()] ?? 'bg-slate-500/10 text-slate-500';

        const statusKey = status.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const label = t(`planning.status.${statusKey}`, { defaultValue: status });

        return (
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${classes}`}>
            {label}
          </span>
        );
      },
    },

    {
      accessorKey: 'updated_at',
      header: t('planning.missionTemplate.lastUpdate'),
      size: 110,
      cell: ({ getValue }) => (
        <span className="tabular-nums text-[11px]">
          {formatDate(getValue() as string)}
        </span>
      ),
    },

    {
      id: 'download',
      header: t('planning.files.file'),
      size: 130,
      cell: ({ row }) => {
        const { mission_planning_filename, mission_planning_filesize, download_url } =
          row.original;

        if (!download_url || !mission_planning_filename) {
          return <span className="opacity-30 text-[11px]">{t('planning.files.noFiles')}</span>;
        }

        return (
          <div className="flex items-center gap-1.5">
            <a
              href={download_url}
              target="_blank"
              rel="noopener noreferrer"
              download={mission_planning_filename}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors"
              title={`${mission_planning_filename} (${formatFileSize(mission_planning_filesize)})`}
            >
              <Download className="w-3 h-3" />
              <span className="truncate max-w-[70px]">{mission_planning_filename}</span>
            </a>
          </div>
        );
      },
    },
  ];
}