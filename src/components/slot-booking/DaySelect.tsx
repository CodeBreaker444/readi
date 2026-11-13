'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { inputCls } from './ui';

/** Day-of-month picker (1–28): a compact grid like a calendar month. */
export function DaySelect({ isDark, value, onChange, format }: { isDark: boolean; value: number; onChange: (d: number) => void; format: (d: number) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(inputCls(isDark), 'flex items-center justify-between cursor-pointer text-left')}>
          <span className="flex items-center gap-2">
            <CalendarDays size={14} className="text-violet-500" />
            {format(value)}
          </span>
          <ChevronDown size={14} className={cn('transition-transform opacity-60', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn('w-64 p-2', isDark && 'bg-[#0f1320] border-white/[0.1] text-white')}>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                onChange(d);
                setOpen(false);
              }}
              className={cn(
                'cursor-pointer h-8 rounded-md text-xs font-medium transition-colors',
                d === value ? 'bg-violet-600 text-white' : isDark ? 'text-gray-300 hover:bg-white/[0.08]' : 'text-gray-700 hover:bg-violet-50 hover:text-violet-700',
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
