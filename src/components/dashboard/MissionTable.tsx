import { cn } from '@/lib/utils';

interface MissionRow {
    id: string;
    name: string;
    date: string;
    status: string;
}

interface MissionTableProps {
    rows: MissionRow[];
    isDark: boolean;
    emptyLabel?: string;
}

const STATUS_STYLES: Record<string, string> = {
    Completed: 'bg-emerald-500/12 text-emerald-500 ring-1 ring-emerald-500/30',
    Waiting:   'bg-yellow-500/12 text-yellow-500 ring-1 ring-yellow-500/30',
    Left:      'bg-slate-500/12 text-slate-400 ring-1 ring-slate-500/30',
};

export default function MissionTable({ rows, isDark, emptyLabel = 'No missions found' }: MissionTableProps) {
    const thCls = cn('text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider', isDark ? 'text-slate-500' : 'text-gray-400');
    const tdCls = cn('py-3 px-3 text-xs', isDark ? 'text-slate-300' : 'text-gray-700');

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead>
                    <tr className={cn('border-b', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
                        <th className={cn(thCls, 'w-16')}>ID</th>
                        <th className={thCls}>Pilot</th>
                        <th className={cn(thCls, 'hidden sm:table-cell')}>Date</th>
                        <th className={thCls}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={4} className={cn('py-8 text-center text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
                                {emptyLabel}
                            </td>
                        </tr>
                    )}
                    {rows.map((m, i) => (
                        <tr key={i} className={cn(
                            'border-b transition-colors',
                            isDark
                                ? 'border-slate-700/40 hover:bg-slate-700/30'
                                : 'border-gray-50 hover:bg-gray-50/80'
                        )}>
                            <td className={cn(tdCls, 'font-mono text-blue-500 font-medium')}>{m.id}</td>
                            <td className={tdCls}>{m.name}</td>
                            <td className={cn(tdCls, 'hidden sm:table-cell', isDark ? 'text-slate-400' : 'text-gray-400')}>{m.date}</td>
                            <td className="py-3 px-3">
                                <span className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium',
                                    STATUS_STYLES[m.status] ?? 'bg-gray-100 text-gray-500'
                                )}>
                                    {m.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}