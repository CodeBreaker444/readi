import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SectionCardProps {
    title: string;
    isDark: boolean;
    className?: string;
    action?: ReactNode;
    children: ReactNode;
}

export default function SectionCard({ title, isDark, className, action, children }: SectionCardProps) {
    return (
        <div className={cn(
            'rounded-xl border flex flex-col',
            isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200',
            className
        )}>
            <div className={cn(
                'flex items-center justify-between px-5 py-4 border-b',
                isDark ? 'border-slate-700/60' : 'border-gray-100'
            )}>
                <h2 className={cn('text-sm font-semibold tracking-wide', isDark ? 'text-white' : 'text-gray-800')}>
                    {title}
                </h2>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="flex-1 p-5">
                {children}
            </div>
        </div>
    );
}