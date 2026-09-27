import { fmtCompact } from './format';

interface Item {
  id: string | number;
  label: string;
  value: number;
}

interface Props {
  items: Item[];
  emptyLabel?: string;
  formatValue?: (n: number) => string;
  /** One of the app's `--chart-1..5` tokens. All rows share this one color. */
  color?: string;
}

/** A ranked list of thin, proportional bars — one color, value at the end of each row. */
export default function HorizontalProgressList({
  items,
  emptyLabel = 'No data yet',
  formatValue = fmtCompact,
  color = 'var(--chart-1)',
}: Props) {
  if (items.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-28 shrink-0 truncate">{item.label}</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-sm font-semibold text-foreground w-14 text-right tabular-nums shrink-0">
            {formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
