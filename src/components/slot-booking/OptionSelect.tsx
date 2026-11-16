'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { inputCls } from './ui';

/** Single-choice dropdown that matches HourSelect / DaySelect instead of the browser's native list. */
export function OptionSelect<T extends string>({
  isDark,
  value,
  options,
  onChange,
  disabled,
  placeholder,
}: {
  isDark: boolean;
  value: T;
  /** A disabled option is greyed out and cannot be picked; `note` is a small tag shown after the label. */
  options: Array<{
    value: T;
    label: string;
    disabled?: boolean;
    note?: string;
  }>;
  onChange: (v: T) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            inputCls(isDark),
            'flex items-center justify-between gap-2 cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <span className={cn('truncate', !current && 'opacity-60')}>{current?.label ?? placeholder ?? ''}</span>
          <ChevronDown size={14} className={cn('shrink-0 transition-transform opacity-60', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn('w-(--radix-popover-trigger-width) min-w-40 p-1.5', isDark && 'bg-[#0f1320] border-white/[0.1] text-white')}
      >
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={o.disabled}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  'cursor-pointer w-full flex items-center justify-between gap-2 h-8 px-2.5 rounded-md text-xs font-medium text-left transition-colors',
                  o.disabled
                    ? 'opacity-45 cursor-not-allowed text-gray-400'
                    : on
                      ? 'bg-violet-600 text-white'
                      : isDark
                        ? 'text-gray-300 hover:bg-white/[0.08]'
                        : 'text-gray-700 hover:bg-violet-50 hover:text-violet-700',
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.note && <span className="shrink-0 text-[10px] font-normal opacity-80">{o.note}</span>}
                {on && !o.disabled && <Check size={13} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
