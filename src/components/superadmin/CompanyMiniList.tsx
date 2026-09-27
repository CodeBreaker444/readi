import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

export interface CompanyMiniItem {
  owner_id: number;
  owner_name: string;
  owner_code: string | null;
  owner_active: string;
  /** Pre-formatted trailing value — a date, a count, whatever the list is ranked by. */
  metric: string;
}

interface Props {
  companies: CompanyMiniItem[];
  emptyLabel?: string;
}

export default function CompanyMiniList({ companies, emptyLabel = 'No companies yet' }: Props) {
  if (companies.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {companies.map((c) => (
        <li key={c.owner_id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 shrink-0">
              <Building2 size={14} className="text-indigo-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{c.owner_name}</p>
              {c.owner_code && <p className="text-xs text-muted-foreground">{c.owner_code}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge
              variant="outline"
              className={c.owner_active === 'Y' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent' : 'text-muted-foreground'}
            >
              {c.owner_active === 'Y' ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{c.metric}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
