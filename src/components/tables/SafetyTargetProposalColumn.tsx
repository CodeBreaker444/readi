import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';

export interface SafetyTargetProposal {
  proposal_id: number;
  fk_definition_id: number;
  indicator_area: string;
  indicator_name: string;
  indicator_type: string;
  target_current: number;
  target_suggested: number;
  diff: number;
  months_analyzed: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function DiffCell({ diff }: { diff: number }) {
  const isPositive = diff > 0;
  const isZero = diff === 0;
  return (
    <span className={`text-xs font-semibold tabular-nums ${isZero ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPositive ? '+' : ''}{diff}
    </span>
  );
}

export function getSafetyTargetProposalColumns(
  isDark: boolean,
  onApprove: (row: SafetyTargetProposal) => void,
  onReject: (row: SafetyTargetProposal) => void
): ColumnDef<SafetyTargetProposal>[] {
  const muted = isDark ? 'text-slate-500' : 'text-slate-400';
  const primary = isDark ? 'text-slate-200' : 'text-slate-800';

  return [
    {
      id: 'indicator_area',
      accessorKey: 'indicator_area',
      header: 'Area',
      size: 120,
      cell: ({ getValue }) => (
        <span className={`text-xs font-medium ${primary}`}>{getValue<string>() ?? '—'}</span>
      ),
    },
    {
      id: 'indicator_name',
      accessorKey: 'indicator_name',
      header: 'Indicator',
      size: 220,
      cell: ({ getValue }) => (
        <p className={`text-xs font-medium leading-snug ${primary}`}>{getValue<string>()}</p>
      ),
    },
    {
      id: 'indicator_type',
      accessorKey: 'indicator_type',
      header: 'Type',
      size: 70,
      cell: ({ getValue }) => (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${isDark ? 'bg-violet-500/10 text-violet-300' : 'bg-violet-50 text-violet-700'}`}>
          {getValue<string>()}
        </span>
      ),
    },
    {
      id: 'target_current',
      accessorKey: 'target_current',
      header: 'Current',
      size: 90,
      cell: ({ getValue }) => (
        <span className={`text-xs tabular-nums ${muted}`}>{getValue<number>()}</span>
      ),
    },
    {
      id: 'target_suggested',
      accessorKey: 'target_suggested',
      header: 'Suggested',
      size: 90,
      cell: ({ getValue }) => (
        <span className={`text-xs tabular-nums font-semibold ${primary}`}>{getValue<number>()}</span>
      ),
    },
    {
      id: 'diff',
      accessorKey: 'diff',
      header: 'Δ Diff',
      size: 80,
      cell: ({ getValue }) => <DiffCell diff={getValue<number>()} />,
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Created',
      size: 110,
      cell: ({ getValue }) => {
        const v = getValue<string>();
        try {
          return <span className={`text-xs tabular-nums ${muted}`}>{format(parseISO(v), 'dd MMM yyyy')}</span>;
        } catch {
          return <span className={`text-xs ${muted}`}>{v}</span>;
        }
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    {
      id: 'actions',
      header: '',
      size: 90,
      cell: ({ row }) => {
        if (row.original.status !== 'PENDING') return null;
        return (
          <div className="flex items-center gap-1 justify-end pr-1">
            <button
              onClick={() => onApprove(row.original)}
              className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/8' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
              title="Approve"
            >
              <CheckCircle2 size={14} strokeWidth={2} />
            </button>
            <button
              onClick={() => onReject(row.original)}
              className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/8' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
              title="Reject"
            >
              <XCircle size={14} strokeWidth={2} />
            </button>
          </div>
        );
      },
    },
  ];
}
