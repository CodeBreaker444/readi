
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import type { TFunction } from 'i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ComplianceRequirement {
    requirement_id: number;
    fk_owner_id: number;
    requirement_code: string;
    requirement_title: string;
    requirement_description: string | null;
    requirement_type: string | null;
    regulatory_body: string | null;
    requirement_status: string;
    effective_date: string | null;
    review_frequency: number | null;
    next_review_date: string | null;
    created_at: string;
    updated_at: string;
}

export type ComplianceStatus =
    | 'COMPLIANT'
    | 'PARTIAL'
    | 'NON_COMPLIANT'
    | 'NOT_APPLICABLE';

const STATUS_STYLE: Record<string, { bg: string; text: string; dotBg: string }> = {
    COMPLIANT: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dotBg: 'bg-emerald-400' },
    PARTIAL: { bg: 'bg-amber-500/10', text: 'text-amber-400', dotBg: 'bg-amber-400' },
    NON_COMPLIANT: { bg: 'bg-red-500/10', text: 'text-red-400', dotBg: 'bg-red-400' },
    NOT_APPLICABLE: { bg: 'bg-slate-500/10', text: 'text-slate-400', dotBg: 'bg-slate-400' },
};

function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation();
    const style = STATUS_STYLE[status] ?? STATUS_STYLE.NOT_APPLICABLE;
    const label = t(`compliance.shared.status.${status}`, { defaultValue: status });
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${style.bg} ${style.text}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dotBg}`} />
            {label}
        </span>
    );
}


function CriticalityDots({ value }: { value: number | null }) {
    if (value == null) return <span className="text-slate-600 text-xs">—</span>;
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${i < value ? 'bg-red-500' : 'bg-slate-700'}`}
                />
            ))}
        </div>
    );
}


export function getComplianceRequirementsColumns(
    isDark: boolean,
    onEdit: (row: ComplianceRequirement) => void,
    onDelete: (row: ComplianceRequirement) => void,
    t: TFunction
): ColumnDef<ComplianceRequirement>[] {
    const muted = isDark ? 'text-slate-500' : 'text-slate-400';
    const primary = isDark ? 'text-slate-200' : 'text-slate-800';

    return [
        {
            id: 'requirement_code',
            accessorKey: 'requirement_code',
            header: t('compliance.generalAuditPlan.table.columns.ref'),
            size: 100,
            cell: ({ getValue }) => (
                <code
                    className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-white/6 text-violet-300' : 'bg-violet-50 text-violet-700'}`}
                >
                    {getValue<string>()}
                </code>
            ),
        },
        {
            id: 'requirement_title',
            accessorKey: 'requirement_title',
            header: t('compliance.generalAuditPlan.table.columns.title'),
            size: 260,
            cell: ({ getValue }) => (
                <p className={`text-xs font-medium leading-snug ${primary}`}>{getValue<string>()}</p>
            ),
        },
        {
            id: 'requirement_type',
            accessorKey: 'requirement_type',
            header: t('compliance.generalAuditPlan.table.columns.type'),
            size: 120,
            cell: ({ getValue }) => (
                <span className={`text-xs ${muted}`}>{getValue<string | null>() ?? '—'}</span>
            ),
        },
        {
            id: 'regulatory_body',
            accessorKey: 'regulatory_body',
            header: t('compliance.generalAuditPlan.table.columns.regulatoryBody'),
            size: 160,
            cell: ({ getValue }) => (
                <span className={`text-[11px] ${muted}`}>{getValue<string | null>() ?? '—'}</span>
            ),
        },
        {
            id: 'requirement_status',
            accessorKey: 'requirement_status',
            header: t('compliance.generalAuditPlan.table.columns.status'),
            size: 130,
            cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
        },
        {
            id: 'review_frequency',
            accessorKey: 'review_frequency',
            header: t('compliance.generalAuditPlan.table.columns.criticality'),
            size: 110,
            cell: ({ getValue }) => <CriticalityDots value={getValue<number | null>()} />,
        },
        {
            id: 'next_review_date',
            accessorKey: 'next_review_date',
            header: t('compliance.generalAuditPlan.table.columns.nextDue'),
            size: 110,
            cell: ({ getValue }) => {
                const v = getValue<string | null>();
                if (!v) return <span className={`text-xs ${muted}`}>—</span>;
                try {
                    return (
                        <span className={`text-xs tabular-nums ${primary}`}>
                            {format(parseISO(v), 'dd MMM yyyy')}
                        </span>
                    );
                } catch {
                    return <span className={`text-xs ${muted}`}>{v}</span>;
                }
            },
        },
        {
            id: 'actions',
            header: '',
            size: 80,
            cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end pr-1">
                    <button
                        onClick={() => onEdit(row.original)}
                        className={`p-1.5 rounded-md transition-colors ${isDark
                            ? 'text-slate-500 hover:text-violet-400 hover:bg-white/6'
                            : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
                        }`}
                        title={t('compliance.requirementsEvidences.table.tooltips.edit')}
                    >
                        <Pencil size={13} strokeWidth={2} />
                    </button>
                    <button
                        onClick={() => onDelete(row.original)}
                        className={`p-1.5 rounded-md transition-colors ${isDark
                            ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/8'
                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title={t('compliance.requirementsEvidences.table.tooltips.delete')}
                    >
                        <Trash2 size={13} strokeWidth={2} />
                    </button>
                </div>
            ),
        },
    ];
}
