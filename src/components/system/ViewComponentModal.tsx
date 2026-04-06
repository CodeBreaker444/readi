'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ViewComponentModalProps {
    open: boolean;
    component: any | null;
    systemCode?: string;
    onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm font-medium text-slate-800">{value != null && value !== '' ? value : '—'}</p>
        </div>
    );
}

const statusColors: Record<string, string> = {
    OPERATIONAL: 'bg-green-100 text-green-800 border border-green-200',
    MAINTENANCE: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    NOT_OPERATIONAL: 'bg-red-100 text-red-800 border border-red-200',
    DECOMMISSIONED: 'bg-gray-100 text-gray-600 border border-gray-200',
};

export default function ViewComponentModal({ open, component, systemCode, onClose }: ViewComponentModalProps) {
    if (!component) return null;

    const statusCls = statusColors[component.component_status] ?? 'bg-slate-100 text-slate-600';

    const hasMaintCycle = component.maintenance_cycle ||
        component.maintenance_cycle_hour ||
        component.maintenance_cycle_day ||
        component.maintenance_cycle_flight;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg h-[580px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Component Details
                        {component.component_code && (
                            <span className="text-sm font-normal text-slate-500">— {component.component_code}</span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 pt-1 flex-1 overflow-y-auto">
                    {/* Status + System badge row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>
                            {component.component_status ?? 'UNKNOWN'}
                        </span>
                        {systemCode && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                                {systemCode}
                            </span>
                        )}
                        {!component.fk_tool_id && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                Not attached
                            </span>
                        )}
                    </div>

                    {/* Identity */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Identity</p>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow label="Type" value={component.component_type} />
                            <InfoRow label="Code" value={component.component_code} />
                            <InfoRow label="Name" value={component.component_name} />
                            <InfoRow label="Serial No." value={component.component_sn} />
                            <InfoRow label="Vendor" value={component.component_vendor} />
                            <InfoRow label="Installation Date" value={component.component_activation_date} />
                        </div>
                    </div>

                    {hasMaintCycle && (
                        <>
                            <div className="border-t border-slate-100" />
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Maintenance Cycle</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoRow label="Cycle Type" value={component.maintenance_cycle} />
                                    <InfoRow label="Cycle Hours" value={component.maintenance_cycle_hour} />
                                    <InfoRow label="Cycle Days" value={component.maintenance_cycle_day} />
                                    <InfoRow label="Cycle Flights" value={component.maintenance_cycle_flight} />
                                </div>
                            </div>
                        </>
                    )}

                    {(component.component_purchase_date || component.component_guarantee_day) && (
                        <>
                            <div className="border-t border-slate-100" />
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Procurement</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoRow label="Purchase Date" value={component.component_purchase_date} />
                                    <InfoRow label="Guarantee (days)" value={component.component_guarantee_day} />
                                </div>
                            </div>
                        </>
                    )}

                    {component.component_desc && (
                        <>
                            <div className="border-t border-slate-100" />
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Description</p>
                                <p className="text-sm text-slate-600 whitespace-pre-line">{component.component_desc}</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
                    <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
