'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { fmtCompact } from './format';

interface Props {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  label: string;
  /** One of the app's `--chart-1..5` tokens, e.g. `var(--chart-2)`. */
  color?: string;
  xFormatter?: (value: string) => string;
  height?: number;
}

export default function TrendAreaChart({ data, xKey, yKey, label, color = 'var(--chart-1)', xFormatter, height = 220 }: Props) {
  const chartConfig = {
    [yKey]: { label, color },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height }}>
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={`fill-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={`var(--color-${yKey})`} stopOpacity={0.18} />
            <stop offset="95%" stopColor={`var(--color-${yKey})`} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={xFormatter}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={44}
          tickFormatter={(v) => fmtCompact(Number(v))}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                const raw = String(payload?.[0]?.payload?.[xKey] ?? '');
                return xFormatter ? xFormatter(raw) : raw;
              }}
            />
          }
        />
        <Area
          dataKey={yKey}
          type="monotone"
          fill={`url(#fill-${yKey})`}
          stroke={`var(--color-${yKey})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
