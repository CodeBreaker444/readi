'use client';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/components/useTheme';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SystemDraft = {
  tool_code: string;
  tool_desc: string;
  tool_status: string;
  tool_active: string;
  fk_client_id: string;
  tool_latitude: string;
  tool_longitude: string;
  date_activation: string;
  location: string;
  tool_maintenance_logbook: string;
};

type ComponentDraft = {
  tempId: string;
  sourceId: number;
  fk_tool_id: string;
  component_type: string;
  component_name: string;
  component_code: string;
  component_desc: string;
  fk_tool_model_id: string;
  component_sn: string;
  cc_platform: string;
  gcs_type: string;
  dcc_drone_id: string;
  component_activation_date: string;
  component_purchase_date: string;
  component_vendor: string;
  component_guarantee_day: string;
  component_status: string;
  maintenance_cycle: string;
  maintenance_cycle_hour: string;
  maintenance_cycle_day: string;
  maintenance_cycle_flight: string;
  battery_cycle_ratio: string;
  fk_parent_component_id: string;
};

interface DuplicateSystemModalProps {
  open: boolean;
  sourceSystemId: number | null;
  clients: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const appendCopySuffix = (value?: string | null): string => {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return '';
  if (cleaned.toLowerCase().endsWith('-copy')) return cleaned;
  return `${cleaned}-copy`;
};

const withCopyAttempt = (value: string, attempt: number): string => {
  if (!value) return value;
  if (attempt <= 0) return value;
  const base = value.replace(/-copy(?:-\d+)?$/i, '-copy');
  return `${base}-${attempt + 1}`;
};

export default function DuplicateSystemModal({
  open,
  sourceSystemId,
  clients,
  onClose,
  onSuccess,
}: DuplicateSystemModalProps) {
  const { isDark } = useTheme();
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [systemDraft, setSystemDraft] = useState<SystemDraft | null>(null);
  const [componentsDraft, setComponentsDraft] = useState<ComponentDraft[]>([]);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !sourceSystemId) {
      setSystemDraft(null);
      setComponentsDraft([]);
      setOpenRows({});
      return;
    }

    const loadDraft = async () => {
      setLoadingDraft(true);
      try {
        const [systemRes, componentRes] = await Promise.all([
          fetch('/api/system/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: 'ALL', status: 'ALL' }),
          }),
          fetch('/api/system/component/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool_id: sourceSystemId }),
          }),
        ]);
        const [systemJson, componentJson] = await Promise.all([systemRes.json(), componentRes.json()]);

        if (systemJson.code !== 1) {
          toast.error(systemJson.message || 'Failed to load source system');
          return;
        }
        if (componentJson.code !== 1) {
          toast.error(componentJson.message || 'Failed to load source components');
          return;
        }

        const sourceSystem = (systemJson.data || []).find((s: any) => s.tool_id === sourceSystemId);
        if (!sourceSystem) {
          toast.error('Source system not found');
          return;
        }

        setSystemDraft({
          tool_code: appendCopySuffix(sourceSystem.tool_code),
          tool_desc: sourceSystem.tool_desc || '',
          tool_status: sourceSystem.tool_status || 'OPERATIONAL',
          tool_active: sourceSystem.active || 'Y',
          fk_client_id: sourceSystem.fk_client_id ? String(sourceSystem.fk_client_id) : '0',
          tool_latitude: sourceSystem.tool_latitude != null ? String(sourceSystem.tool_latitude) : '',
          tool_longitude: sourceSystem.tool_longitude != null ? String(sourceSystem.tool_longitude) : '',
          date_activation: sourceSystem.date_activation || '',
          location: sourceSystem.location || '',
          tool_maintenance_logbook: sourceSystem.tool_maintenance_logbook || 'N',
        });

        const drafts = (componentJson.data || []).map((component: any, idx: number) => ({
          tempId: `comp-${component.tool_component_id}-${idx}`,
          sourceId: component.tool_component_id,
          fk_tool_id: '',
          component_type: component.component_type || '',
          component_name: component.component_name || '',
          component_code: appendCopySuffix(component.component_code || ''),
          component_desc: component.component_desc || '',
          fk_tool_model_id: component.fk_tool_model_id ? String(component.fk_tool_model_id) : '',
          component_sn: appendCopySuffix(component.component_sn || ''),
          cc_platform: component.cc_platform || '',
          gcs_type: component.gcs_type || '',
          dcc_drone_id: component.dcc_drone_id || '',
          component_activation_date: component.component_activation_date?.split('T')[0] || '',
          component_purchase_date: component.component_purchase_date?.split('T')[0] || '',
          component_vendor: component.component_vendor || '',
          component_guarantee_day: component.component_guarantee_day ? String(component.component_guarantee_day) : '',
          component_status: component.component_status || 'OPERATIONAL',
          maintenance_cycle: component.maintenance_cycle || '',
          maintenance_cycle_hour: component.maintenance_cycle_hour != null ? String(component.maintenance_cycle_hour) : '',
          maintenance_cycle_day: component.maintenance_cycle_day != null ? String(component.maintenance_cycle_day) : '',
          maintenance_cycle_flight: component.maintenance_cycle_flight != null ? String(component.maintenance_cycle_flight) : '',
          battery_cycle_ratio: component.battery_cycle_ratio != null ? String(component.battery_cycle_ratio) : '',
          fk_parent_component_id: component.fk_parent_component_id ? String(component.fk_parent_component_id) : '_none',
        }));
        setComponentsDraft(drafts);
        setOpenRows(
          drafts.reduce((acc: Record<string, boolean>, item: ComponentDraft, idx: number) => {
            acc[item.tempId] = idx === 0;
            return acc;
          }, {}),
        );
      } catch {
        toast.error('Error preparing duplicate draft');
      } finally {
        setLoadingDraft(false);
      }
    };

    loadDraft();
  }, [open, sourceSystemId]);

  const inputCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200';

  const parentOptionsBySourceId = useMemo(() => {
    const map: Record<number, { label: string; value: string }[]> = {};
    componentsDraft.forEach((current) => {
      map[current.sourceId] = componentsDraft
        .filter((candidate) => candidate.sourceId !== current.sourceId)
        .map((candidate) => ({
          value: String(candidate.sourceId),
          label: candidate.component_code || candidate.component_name || `#${candidate.sourceId}`,
        }));
    });
    return map;
  }, [componentsDraft]);

  const handleSystemChange = (field: keyof SystemDraft, value: string) => {
    setSystemDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleComponentChange = (tempId: string, field: keyof ComponentDraft, value: string) => {
    setComponentsDraft((prev) => prev.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item)));
  };

  const createSystemWithRetries = async () => {
    if (!systemDraft) throw new Error('System draft is missing');

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateCode = withCopyAttempt(systemDraft.tool_code, attempt);
      const formPayload = new FormData();
      formPayload.append(
        'data',
        JSON.stringify({
          tool_code: candidateCode,
          tool_name: candidateCode,
          tool_description: systemDraft.tool_desc || null,
          tool_active: systemDraft.tool_active,
          fk_client_id: systemDraft.fk_client_id && systemDraft.fk_client_id !== '0' ? Number(systemDraft.fk_client_id) : null,
          location: systemDraft.location || null,
          latitude: systemDraft.tool_latitude ? Number(systemDraft.tool_latitude) : null,
          longitude: systemDraft.tool_longitude ? Number(systemDraft.tool_longitude) : null,
          activationDate: systemDraft.date_activation || null,
        }),
      );

      const response = await fetch('/api/system/add', { method: 'POST', body: formPayload });
      const result = await response.json();
      if (result.code === 1) {
        return { newSystemId: result.data?.tool_id as number, finalCode: candidateCode };
      }

      const message = String(result.message || '').toLowerCase();
      if (!message.includes('already exists')) {
        throw new Error(result.message || 'Failed to create system copy');
      }
    }

    throw new Error('Unable to create a unique system code for the copy');
  };

  const handleSave = async () => {
    if (!systemDraft) return;
    if (!systemDraft.tool_code.trim()) {
      toast.error('System code is required');
      return;
    }

    setSaving(true);
    try {
      const { newSystemId } = await createSystemWithRetries();
      const sourceToNewComponentId = new Map<number, number>();
      const pending = [...componentsDraft];

      while (pending.length > 0) {
        const readyIndex = pending.findIndex((component) => {
          if (!component.fk_parent_component_id || component.fk_parent_component_id === '_none') return true;
          return sourceToNewComponentId.has(Number(component.fk_parent_component_id));
        });

        if (readyIndex < 0) {
          throw new Error('Could not resolve parent-child mapping for components');
        }

        const component = pending.splice(readyIndex, 1)[0];
        const mappedParentId =
          component.fk_parent_component_id && component.fk_parent_component_id !== '_none'
            ? sourceToNewComponentId.get(Number(component.fk_parent_component_id)) ?? null
            : null;

        let created = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const payload = {
            fk_tool_id: newSystemId,
            component_type: component.component_type,
            component_name: component.component_name || null,
            component_code: component.component_code ? withCopyAttempt(component.component_code, attempt) : null,
            component_desc: component.component_desc || null,
            fk_tool_model_id: component.fk_tool_model_id ? Number(component.fk_tool_model_id) : null,
            component_sn: component.component_sn ? withCopyAttempt(component.component_sn, attempt) : null,
            cc_platform: component.cc_platform || null,
            gcs_type: component.gcs_type || null,
            dcc_drone_id: component.dcc_drone_id || null,
            component_activation_date: component.component_activation_date || null,
            component_purchase_date: component.component_purchase_date || null,
            component_vendor: component.component_vendor || null,
            component_guarantee_day: component.component_guarantee_day ? Number(component.component_guarantee_day) : null,
            component_status: component.component_status || 'OPERATIONAL',
            maintenance_cycle: component.maintenance_cycle || null,
            maintenance_cycle_hour: component.maintenance_cycle_hour ? Number(component.maintenance_cycle_hour) : null,
            maintenance_cycle_day: component.maintenance_cycle_day ? Number(component.maintenance_cycle_day) : null,
            maintenance_cycle_flight: component.maintenance_cycle_flight ? Number(component.maintenance_cycle_flight) : null,
            battery_cycle_ratio: component.battery_cycle_ratio ? Number(component.battery_cycle_ratio) : null,
            fk_parent_component_id: mappedParentId,
          };

          const res = await fetch('/api/system/component/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (json.code === 1) {
            sourceToNewComponentId.set(component.sourceId, json.data?.component_id);
            created = true;
            break;
          }

          const message = String(json.message || '').toLowerCase();
          if (!message.includes('already exists')) {
            throw new Error(json.message || `Failed to create component copy (${component.component_type})`);
          }
        }

        if (!created) {
          throw new Error(`Unable to create unique copy for component ${component.component_code || component.component_type}`);
        }
      }

      toast.success('System duplicated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to duplicate system');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`w-[95vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden p-0 gap-0 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className={isDark ? 'text-white' : ''}>Duplicate System</DialogTitle>
        </DialogHeader>

        {loadingDraft || !systemDraft ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Preparing duplicate draft...
          </div>
        ) : (
          <Tabs defaultValue="system" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="shrink-0 mx-6 mt-4 mb-0 w-fit">
              <TabsTrigger value="system">System Details</TabsTrigger>
              <TabsTrigger value="components">Components ({componentsDraft.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="flex-1 overflow-y-auto px-6 py-4 mt-0 data-[state=inactive]:hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="pb-2">Code *</Label>
                  <Input className={inputCls} value={systemDraft.tool_code} onChange={(e) => handleSystemChange('tool_code', e.target.value)} />
                </div>
                <div>
                  <Label className="pb-2">Description</Label>
                  <Input className={inputCls} value={systemDraft.tool_desc} onChange={(e) => handleSystemChange('tool_desc', e.target.value)} />
                </div>
                <div>
                  <Label className="pb-2">Latitude</Label>
                  <Input className={inputCls} value={systemDraft.tool_latitude} onChange={(e) => handleSystemChange('tool_latitude', e.target.value)} />
                </div>
                <div>
                  <Label className="pb-2">Longitude</Label>
                  <Input className={inputCls} value={systemDraft.tool_longitude} onChange={(e) => handleSystemChange('tool_longitude', e.target.value)} />
                </div>
                <div>
                  <Label className="pb-2">Status</Label>
                  <Select value={systemDraft.tool_status} onValueChange={(v) => handleSystemChange('tool_status', v)}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATIONAL">Operational</SelectItem>
                      <SelectItem value="NOT_OPERATIONAL">Not Operational</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="pb-2">Activation Date</Label>
                  <Input type="date" className={inputCls} value={systemDraft.date_activation} onChange={(e) => handleSystemChange('date_activation', e.target.value)} />
                </div>
                <div>
                  <Label className="pb-2">Client</Label>
                  <Select value={systemDraft.fk_client_id} onValueChange={(v) => handleSystemChange('fk_client_id', v)}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {clients.map((client: any) => (
                        <SelectItem key={client.client_id} value={String(client.client_id)}>
                          {client.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="pb-2">Location</Label>
                  <Input className={inputCls} value={systemDraft.location} onChange={(e) => handleSystemChange('location', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="components" className="flex-1 overflow-y-auto px-6 py-4 mt-0 space-y-3 data-[state=inactive]:hidden">
              {componentsDraft.length === 0 ? (
                <p className="text-sm text-slate-400">No components found for this system.</p>
              ) : (
                componentsDraft.map((component, index) => (
                  <Collapsible
                    key={component.tempId}
                    open={!!openRows[component.tempId]}
                    onOpenChange={(isOpen) => setOpenRows((prev) => ({ ...prev, [component.tempId]: isOpen }))}
                    className={`border rounded-lg ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50/40'}`}
                  >
                    <CollapsibleTrigger className="w-full p-3 flex items-center justify-between text-left">
                      <div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                          {component.component_code || component.component_name || `Component ${index + 1}`}
                        </p>
                        <p className="text-xs text-slate-400">{component.component_type || 'No type'}</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openRows[component.tempId] ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-3 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><Label className="pb-2">Type *</Label><Input className={inputCls} value={component.component_type} onChange={(e) => handleComponentChange(component.tempId, 'component_type', e.target.value)} /></div>
                        <div><Label className="pb-2">Code</Label><Input className={inputCls} value={component.component_code} onChange={(e) => handleComponentChange(component.tempId, 'component_code', e.target.value)} /></div>
                        <div><Label className="pb-2">Name</Label><Input className={inputCls} value={component.component_name} onChange={(e) => handleComponentChange(component.tempId, 'component_name', e.target.value)} /></div>
                        <div><Label className="pb-2">Serial Number</Label><Input className={inputCls} value={component.component_sn} onChange={(e) => handleComponentChange(component.tempId, 'component_sn', e.target.value)} /></div>
                        <div><Label className="pb-2">Description</Label><Input className={inputCls} value={component.component_desc} onChange={(e) => handleComponentChange(component.tempId, 'component_desc', e.target.value)} /></div>
                        <div><Label className="pb-2">Model</Label><Input className={inputCls} value={component.fk_tool_model_id} onChange={(e) => handleComponentChange(component.tempId, 'fk_tool_model_id', e.target.value)} placeholder="Tool model id" /></div>
                        <div><Label className="pb-2">Status</Label><Select value={component.component_status} onValueChange={(v) => handleComponentChange(component.tempId, 'component_status', v)}><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OPERATIONAL">Operational</SelectItem><SelectItem value="NOT_OPERATIONAL">Not Operational</SelectItem><SelectItem value="MAINTENANCE">Maintenance</SelectItem><SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem></SelectContent></Select></div>
                        <div><Label className="pb-2">Parent Component</Label><Select value={component.fk_parent_component_id || '_none'} onValueChange={(v) => handleComponentChange(component.tempId, 'fk_parent_component_id', v)}><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_none">None (top-level)</SelectItem>{(parentOptionsBySourceId[component.sourceId] || []).map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label className="pb-2">Activation Date</Label><Input type="date" className={inputCls} value={component.component_activation_date} onChange={(e) => handleComponentChange(component.tempId, 'component_activation_date', e.target.value)} /></div>
                        <div><Label className="pb-2">Purchase Date</Label><Input type="date" className={inputCls} value={component.component_purchase_date} onChange={(e) => handleComponentChange(component.tempId, 'component_purchase_date', e.target.value)} /></div>
                        <div><Label className="pb-2">Vendor</Label><Input className={inputCls} value={component.component_vendor} onChange={(e) => handleComponentChange(component.tempId, 'component_vendor', e.target.value)} /></div>
                        <div><Label className="pb-2">Guarantee (days)</Label><Input type="number" className={inputCls} value={component.component_guarantee_day} onChange={(e) => handleComponentChange(component.tempId, 'component_guarantee_day', e.target.value)} /></div>
                        <div><Label className="pb-2">Maintenance Cycle</Label><Input className={inputCls} value={component.maintenance_cycle} onChange={(e) => handleComponentChange(component.tempId, 'maintenance_cycle', e.target.value)} /></div>
                        <div><Label className="pb-2">Cycle Hours</Label><Input type="number" className={inputCls} value={component.maintenance_cycle_hour} onChange={(e) => handleComponentChange(component.tempId, 'maintenance_cycle_hour', e.target.value)} /></div>
                        <div><Label className="pb-2">Cycle Days</Label><Input type="number" className={inputCls} value={component.maintenance_cycle_day} onChange={(e) => handleComponentChange(component.tempId, 'maintenance_cycle_day', e.target.value)} /></div>
                        <div><Label className="pb-2">Cycle Flights</Label><Input type="number" className={inputCls} value={component.maintenance_cycle_flight} onChange={(e) => handleComponentChange(component.tempId, 'maintenance_cycle_flight', e.target.value)} /></div>
                        <div><Label className="pb-2">Battery Cycle Ratio</Label><Input type="number" step="0.01" className={inputCls} value={component.battery_cycle_ratio} onChange={(e) => handleComponentChange(component.tempId, 'battery_cycle_ratio', e.target.value)} /></div>
                        <div><Label className="pb-2">C2 Platform</Label><Input className={inputCls} value={component.cc_platform} onChange={(e) => handleComponentChange(component.tempId, 'cc_platform', e.target.value)} /></div>
                        <div><Label className="pb-2">GCS</Label><Input className={inputCls} value={component.gcs_type} onChange={(e) => handleComponentChange(component.tempId, 'gcs_type', e.target.value)} /></div>
                        <div className="md:col-span-2"><Label className="pb-2">DCC Drone ID</Label><Input className={inputCls} value={component.dcc_drone_id} onChange={(e) => handleComponentChange(component.tempId, 'dcc_drone_id', e.target.value)} /></div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={saving || loadingDraft || !systemDraft} onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saving ? 'Saving Copy...' : 'Save Duplicate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
