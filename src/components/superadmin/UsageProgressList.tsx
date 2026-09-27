import { fmtCompact } from './format';

interface UsageItem {
  id: number | string;
  name: string;
  used: number;
  limit: number;
  percent: number;
}

interface Props {
  items: UsageItem[];
  emptyLabel?: string;
  formatValue?: (n: number) => string;
}

export default function UsageProgressList({ items, emptyLabel = 'No data yet', formatValue = fmtCompact }: Props) {
  if (items.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const barColor = item.percent >= 90 ? 'bg-red-500' : item.percent >= 70 ? 'bg-amber-500' : 'bg-orange-400';
        return (
          <div key={item.id}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-sm text-foreground truncate">{item.name}</span>
              <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
                {formatValue(item.used)} / {formatValue(item.limit)} · {item.percent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(100, item.percent)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
