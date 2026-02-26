import { cn } from '@/lib/utils';

interface ThemeSelectProps {
    isDark: boolean;
    children: React.ReactNode;
    value?: string;
    onChange?: (v: string) => void;
}

export default function ThemeSelect({ isDark, children, value, onChange }: ThemeSelectProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(
                'text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all',
                isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
            )}
        >
            {children}
        </select>
    );
}