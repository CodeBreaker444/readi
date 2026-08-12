'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BadgeCheck, Loader2 } from 'lucide-react';

interface Pilot { user_id: number; first_name: string; last_name: string }

interface ImportPilotStepProps {
    t: (key: string) => string;
    ns: string;

    pilotId: string;
    setPilotId: (v: string) => void;
    loadingPilots: boolean;
    pilots: Pilot[];
    setQualTarget: (target: { id: number; name: string } | null) => void;

    visualObserverIds: string[];
    setVisualObserverIds: (ids: string[]) => void;
}

export function ImportPilotStep({
    t, ns,
    pilotId, setPilotId, loadingPilots, pilots, setQualTarget,
    visualObserverIds, setVisualObserverIds,
}: ImportPilotStepProps) {
    return (
        <TooltipProvider delayDuration={100}>
        <div className="space-y-4">
            <div>
                <Label className="mb-1.5 block">{t(ns + '.fields.pilotInCommand')} <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-1.5">
                    <Select value={pilotId} onValueChange={setPilotId} disabled={loadingPilots}>
                        <SelectTrigger className="flex-1">
                            {loadingPilots ? <Loader2 className="h-4 w-4 animate-spin" /> : pilotId ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectPilot')} />}
                        </SelectTrigger>
                        <SelectContent>
                            {pilots.map((p) => <SelectItem key={p.user_id} value={String(p.user_id)}>{p.first_name} {p.last_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={!pilotId}
                                aria-label={t('operations.newOperation.pilot.viewQualifications')}
                                onClick={() => {
                                    const pilot = pilots.find(p => String(p.user_id) === pilotId)
                                    if (pilot) setQualTarget({ id: pilot.user_id, name: `${pilot.first_name} ${pilot.last_name}` })
                                }}
                            >
                                <BadgeCheck className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{t('operations.newOperation.pilot.viewQualifications')}</TooltipContent>
                    </Tooltip>
                </div>
            </div>
            <div>
                <Label className="mb-1.5 block">{t(ns + '.fields.visualObservers')}</Label>
                <div className="flex items-center gap-1.5">
                    <Select
                        value={visualObserverIds.length > 0 ? visualObserverIds[0] : ''}
                        onValueChange={(v) => setVisualObserverIds([v])}
                        disabled={loadingPilots}
                    >
                        <SelectTrigger className="flex-1">
                            {loadingPilots ? <Loader2 className="h-4 w-4 animate-spin" /> : visualObserverIds.length > 0 ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectVisualObserver')} />}
                        </SelectTrigger>
                        <SelectContent>
                            {pilots.filter(p => String(p.user_id) !== pilotId).map((p) => <SelectItem key={p.user_id} value={String(p.user_id)}>{p.first_name} {p.last_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={visualObserverIds.length === 0}
                                aria-label={t('operations.newOperation.pilot.viewQualifications')}
                                onClick={() => {
                                    const observer = pilots.find(p => String(p.user_id) === visualObserverIds[0])
                                    if (observer) setQualTarget({ id: observer.user_id, name: `${observer.first_name} ${observer.last_name}` })
                                }}
                            >
                                <BadgeCheck className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{t('operations.newOperation.pilot.viewQualifications')}</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
        </TooltipProvider>
    );
}
