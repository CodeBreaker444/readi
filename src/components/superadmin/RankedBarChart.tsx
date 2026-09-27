'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { fmtCompact } from './format';

interface Props {
  data: Array<{ name: string; value: number }>;
  valueLabel: string;
  emptyLabel?: string;
  /** One of the app's `--chart-1..5` tokens, e.g. `var(--chart-2)`. */
  color?: string;
  /** How the on-bar value label is rendered — defaults to compact numbers (1.2K); pass `fmtBytes` for storage, etc. */
  formatValue?: (n: number) => string;
}

export default function RankedBarChart({
  data,
  valueLabel,
  emptyLabel = 'No data yet',
  color = 'var(--chart-1)',
  formatValue = fmtCompact,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const chartConfig = {
    value: { label: valueLabel, color },
  } satisfies ChartConfig;

  const height = Math.max(140, data.length * 34 + 24);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height }}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 28, top: 4, bottom: 4 }}
        barCategoryGap={10}
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis type="number" hide tickFormatter={(v) => fmtCompact(Number(v))} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={{ fill: 'var(--muted-foreground)' }}
          tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
        />
        <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.4 }} content={<ChartTooltipContent hideLabel indicator="line" />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground text-[11px]"
            formatter={(v) => formatValue(Number(v))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
