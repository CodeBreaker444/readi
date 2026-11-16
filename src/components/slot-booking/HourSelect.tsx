'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronDown, Clock } from 'lucide-react';
import { useState } from 'react';
import { inputCls } from './ui';

const fmt = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;

/** Hour picker: a compact grid of hours instead of the browser's long native dropdown. */
export function HourSelect({
  isDark,
  value,
  onChange,
  min = 0,
  max = 23,
  invalid,
}: {
  isDark: boolean;
  value: number;
  onChange: (h: number) => void;
  /** First and last selectable hour (24 renders as 00:00 of the next day). */
  min?: number;
  max?: number;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hours = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(inputCls(isDark), 'flex items-center justify-between cursor-pointer text-left', invalid && 'border-red-400')}
        >
          <span className="flex items-center gap-2">
            <Clock size={14} className="text-violet-500" />
            {fmt(value)}
          </span>
          <ChevronDown size={14} className={cn('transition-transform opacity-60', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn('w-64 p-2', isDark && 'bg-[#0f1320] border-white/[0.1] text-white')}>
        <div className="grid grid-cols-4 gap-1 max-h-56 overflow-y-auto">
          {hours.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => {
                onChange(h);
                setOpen(false);
              }}
              className={cn(
                'cursor-pointer h-8 rounded-md text-xs font-medium transition-colors',
                h === value
                  ? 'bg-violet-600 text-white'
                  : isDark
                    ? 'text-gray-300 hover:bg-white/[0.08]'
                    : 'text-gray-700 hover:bg-violet-50 hover:text-violet-700',
              )}
            >
              {fmt(h)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
