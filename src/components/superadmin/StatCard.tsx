import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type StatTone = 'indigo' | 'emerald' | 'violet' | 'cyan' | 'amber' | 'rose' | 'blue' | 'orange';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  sublabel?: string;
  tone?: StatTone;
}

const toneClasses: Record<StatTone, { bar: string; iconBg: string; iconColor: string }> = {
  indigo: { bar: 'bg-indigo-500', iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-500' },
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
  violet: { bar: 'bg-violet-500', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500' },
  cyan: { bar: 'bg-cyan-500', iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-500' },
  amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
  rose: { bar: 'bg-rose-500', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500' },
  blue: { bar: 'bg-blue-500', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  orange: { bar: 'bg-orange-500', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500' },
};

export default function StatCard({ label, value, icon: Icon, sublabel, tone = 'indigo' }: StatCardProps) {
  const t = toneClasses[tone];
  return (
    <Card className="py-0 gap-0 relative overflow-hidden">
      <div className={cn('absolute left-0 top-0 h-full w-1 rounded-l-xl', t.bar)} />
      <CardContent className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5 truncate tabular-nums">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
        </div>
        <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', t.iconBg)}>
          <Icon size={18} className={t.iconColor} />
        </div>
      </CardContent>
    </Card>
  );
}
