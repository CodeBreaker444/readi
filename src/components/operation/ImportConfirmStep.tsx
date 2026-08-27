'use client';

import { Label } from '@/components/ui/label';
import type { ReactNode } from 'react';
import { OpType } from './OperationModalTypes';

interface Client { client_id: number; client_name: string; client_code: string }
interface DroneSystem { tool_id: number; tool_code: string; tool_name: string }
interface SelectOption { id: number; name: string }
interface PlanningOptionLike { planning_name: string }
interface MissionPlanningOptionLike { mission_planning_name: ReactNode | Iterable<ReactNode> }

interface ImportConfirmStepProps {
    t: (key: string) => string;
    ns: string;

    clientId: string;
    clients: Client[];
    platform: string;
    vehicleId: string;
    drones: DroneSystem[];
    missionCode: string;
    categoryId: string;
    categories: SelectOption[];
    typeId: string;
    types: SelectOption[];
    opType: OpType;
    flightMode: 'RC' | 'DOCK';
    selectedPlan: PlanningOptionLike | undefined;
    selectedMissionPlanning: MissionPlanningOptionLike | undefined;
    lucProcedureId: string;
    lucProcedures: SelectOption[];
    location: string;
    groupLabel: string;
    pilotLabel: string;
    missionStartDate: string;
    isRecurrent: boolean;
    recurrentDays: number[];
    recurrentEndDate: string;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ImportConfirmStep({
    t, ns,
    clientId, clients, platform, vehicleId, drones, missionCode,
    categoryId, categories, typeId, types, opType, flightMode,
    selectedPlan, selectedMissionPlanning,
    lucProcedureId, lucProcedures, location, groupLabel, pilotLabel,
    missionStartDate, isRecurrent, recurrentDays, recurrentEndDate,
}: ImportConfirmStepProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.client')}</Label>
                    <p className="text-sm font-medium">{clients.find(c => String(c.client_id) === clientId)?.client_name || '—'}</p>
                </div>
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.platform')}</Label>
                    <p className="text-sm font-medium">{platform}</p>
                </div>
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.drone')}</Label>
                    <p className="text-sm font-medium">{drones.find(d => String(d.tool_id) === vehicleId)?.tool_name || '—'}</p>
                </div>
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.missionCode')}</Label>
                    <p className="text-sm font-medium">{missionCode || '—'}</p>
                </div>
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.category')}</Label>
                    <p className="text-sm font-medium">{categories.find(c => String(c.id) === categoryId)?.name || '—'}</p>
                </div>
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.type')}</Label>
                    <p className="text-sm font-medium">{types.find(ty => String(ty.id) === typeId)?.name || '—'}</p>
                </div>
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.opType')}</Label>
                    <p className="text-sm font-medium">{opType}</p>
                </div>
                {opType === 'PDRA' && (
                    <>
                        <div>
                            <Label className="mb-1.5 block">{t(ns + '.fields.flightMode')}</Label>
                            <p className="text-sm font-medium">{flightMode}</p>
                        </div>
                        <div>
                            <Label className="mb-1.5 block">{t(ns + '.fields.planning')}</Label>
                            <p className="text-sm font-medium">{selectedPlan?.planning_name || '—'}</p>
                        </div>
                        <div>
                            <Label className="mb-1.5 block">{t(ns + '.fields.missionPlanning')}</Label>
                            <p className="text-sm font-medium">{selectedMissionPlanning?.mission_planning_name || '—'}</p>
                        </div>
                    </>
                )}
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.lucProcedure')}</Label>
                    <p className="text-sm font-medium">{lucProcedures.find(p => String(p.id) === lucProcedureId)?.name || '—'}</p>
                </div>
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.location')}</Label>
                    <p className="text-sm font-medium">{location || '—'}</p>
                </div>
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.groupLabel')}</Label>
                    <p className="text-sm font-medium">{groupLabel || '—'}</p>
                </div>
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.pilotInCommand')}</Label>
                    <p className="text-sm font-medium">{pilotLabel || '—'}</p>
                </div>
                {isRecurrent && (
                    <>
                        <div>
                            <Label className="mb-1.5 block">{t(ns + '.fields.startDate')}</Label>
                            <p className="text-sm font-medium">{missionStartDate ? new Date(missionStartDate).toLocaleString() : '—'}</p>
                        </div>
                        <div>
                            <Label className="mb-1.5 block">{t(ns + '.fields.recurrentDays')}</Label>
                            <p className="text-sm font-medium">
                                {recurrentDays.length ? recurrentDays.slice().sort().map(d => WEEKDAY_LABELS[d]).join(', ') : '—'}
                            </p>
                        </div>
                        <div>
                            <Label className="mb-1.5 block">{t(ns + '.fields.recurrentEndDate')}</Label>
                            <p className="text-sm font-medium">{recurrentEndDate || '—'}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
