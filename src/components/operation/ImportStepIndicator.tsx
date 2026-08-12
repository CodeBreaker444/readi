'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, ClipboardCheck, FileUp, Settings, User } from 'lucide-react';

const STEP_KEYS = [
    { id: 1, labelKey: 'client',      icon: User },
    { id: 2, labelKey: 'logFile',     icon: FileUp },
    { id: 3, labelKey: 'missionData', icon: Settings },
    { id: 4, labelKey: 'pilot',       icon: User },
    { id: 5, labelKey: 'confirm',     icon: ClipboardCheck },
];

interface ImportStepIndicatorProps {
    step: number;
    t: (key: string) => string;
    ns: string;
}

export function ImportStepIndicator({ step, t, ns }: ImportStepIndicatorProps) {
    return (
        <div className="px-6 pt-4 pb-2 shrink-0">
            <div className="flex items-center gap-0">
                {STEP_KEYS.map((s, i) => {
                    const Icon   = s.icon;
                    const done   = step > s.id;
                    const active = step === s.id;
                    return (
                        <div key={s.id} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1 flex-1">
                                <div className={cn(
                                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                                    done   ? 'bg-emerald-600 text-white'
                                    : active ? 'bg-violet-600 text-white ring-4 ring-violet-100 dark:ring-violet-900'
                                    :          'bg-muted text-muted-foreground'
                                )}>
                                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                </div>
                                <span className={cn(
                                    'text-[10px] font-medium whitespace-nowrap',
                                    active ? 'text-violet-600' : done ? 'text-emerald-600' : 'text-muted-foreground'
                                )}>
                                    {t(ns + '.steps.' + s.labelKey)}
                                </span>
                            </div>
                            {i < STEP_KEYS.length - 1 && (
                                <div className={cn(
                                    'flex-1 h-0.5 mx-2 transition-colors',
                                    done ? 'bg-emerald-600' : active ? 'bg-violet-600' : 'bg-muted'
                                )} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
