'use client';

import { cn } from '@/lib/utils';
import { useRef } from 'react';

interface PinInputProps {
  value: string[];    
  onChange: (value: string[]) => void;
  disabled?: boolean;
  error?: boolean;
  isDark?: boolean;
}

export function PinInput({ value, onChange, disabled, error, isDark }: PinInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[index]) {
        const next = [...value];
        next[index] = '';
        onChange(next);
      } else if (index > 0) {
        const next = [...value];
        next[index - 1] = '';
        onChange(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = Array(6).fill('');
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    onChange(next);
    const focusIndex = Math.min(digits.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i]}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={cn(
            'w-11 h-13 text-center text-xl font-bold rounded-lg border-2 outline-none transition-all',
            'focus:scale-105',
            isDark
              ? [
                  'bg-slate-800 text-white',
                  error
                    ? 'border-red-500 focus:border-red-400'
                    : value[i]
                    ? 'border-violet-500 focus:border-violet-400'
                    : 'border-slate-600 focus:border-violet-500',
                ]
              : [
                  'bg-white text-slate-900',
                  error
                    ? 'border-red-400 focus:border-red-500'
                    : value[i]
                    ? 'border-violet-500 focus:border-violet-600'
                    : 'border-slate-300 focus:border-violet-500',
                ],
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
}
