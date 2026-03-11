'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

interface EditModelModalProps {
  open: boolean;
  toolId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  factory_type: '',
  factory_serie: '',
  factory_model: '',
  model_type: '',
};

export default function EditModelModal({ open, toolId, onClose, onSuccess }: EditModelModalProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [allModels, setAllModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open && toolId) {
      fetchModelsForTool();
    } else {
      setAllModels([]);
      setSelectedModelId('');
      setFormData(EMPTY_FORM);
    }
  }, [open, toolId]);

  const fetchModelsForTool = async () => {
    setFetching(true);
    try {
      const [compRes, modelRes] = await Promise.all([
        fetch('/api/system/component/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_id: toolId }),
        }),
        fetch('/api/system/model/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      ]);

      const compResult = await compRes.json();
      const modelResult = await modelRes.json();

      if (modelResult.code === 1) {
        const models: any[] = modelResult.data || [];
        if (compResult.code === 1 && compResult.data?.length > 0) {
          const usedModelIds = new Set(
            compResult.data
              .map((c: any) => c.fk_tool_model_id)
              .filter(Boolean)
          );
          const filtered = models.filter(m => usedModelIds.has(m.tool_model_id));
          setAllModels(filtered.length > 0 ? filtered : models);
        } else {
          setAllModels(models);
        }
      }
    } catch {
      toast.error('Error loading models');
    } finally {
      setFetching(false);
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = allModels.find(m => String(m.tool_model_id) === modelId);
    if (model) {
      setFormData({
        factory_type: model.factory_type || '',
        factory_serie: model.factory_serie || '',
        factory_model: model.factory_model || '',
        model_type: '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId) { toast.error('Please select a model'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/system/model/${selectedModelId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer: formData.factory_type,
          model_code: formData.factory_serie,
          model_name: formData.factory_model,
          model_type: formData.model_type || null,
        }),
      });
      const result = await res.json();
      if (result.code === 1) {
        toast.success('Model updated successfully');
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to update model');
      }
    } catch {
      toast.error('Error updating model');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500'
    : 'bg-gray-50 border-gray-200 text-gray-900';
  const selectTriggerCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : '';
  const selectContentCls = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : '';
  const labelCls = `pb-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`;
  const sectionLabelCls = `text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-muted-foreground'}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={isDark ? 'text-white' : ''}>Edit Model</DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Skeleton className={`h-4 w-40 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>

            <div className="space-y-4">
              <Skeleton className={`h-4 w-28 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div className="grid grid-cols-12 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="col-span-12 sm:col-span-3 space-y-2">
                    <Skeleton className={`h-3 w-20 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-transparent">
              <Skeleton className={`h-10 w-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-10 w-32 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className={sectionLabelCls}>Select Model to Edit</p>
              <Select value={selectedModelId} onValueChange={handleModelSelect}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {allModels.map(m => (
                    <SelectItem key={m.tool_model_id} value={String(m.tool_model_id)}>
                      {m.factory_type} — {m.factory_serie} — {m.factory_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedModelId && (
              <>
                <div>
                  <p className={sectionLabelCls}>Model Details</p>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-3">
                      <Label className={labelCls}>Component Type</Label>
                      <Select value={formData.model_type} onValueChange={v => handleChange('model_type', v)}>
                        <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          <SelectItem value="BATTERY">Battery</SelectItem>
                          <SelectItem value="RC">Remote Control</SelectItem>
                          <SelectItem value="DOCK">Docking Station</SelectItem>
                          <SelectItem value="PAYLOAD">Payload</SelectItem>
                          <SelectItem value="FTS">Flight Termination System</SelectItem>
                          <SelectItem value="PARACHUTE">Parachute</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <Label className={labelCls}>Brand (Manufacturer) *</Label>
                      <Input className={inputCls} value={formData.factory_type} onChange={e => handleChange('factory_type', e.target.value)} required />
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <Label className={labelCls}>Serie (Model Code) *</Label>
                      <Input className={inputCls} value={formData.factory_serie} onChange={e => handleChange('factory_serie', e.target.value)} required />
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <Label className={labelCls}>Model (Name) *</Label>
                      <Input className={inputCls} value={formData.factory_model} onChange={e => handleChange('factory_model', e.target.value)} required />
                    </div>
                  </div>
                </div>

                <div className={`flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                  <Button type="button" variant="outline" onClick={onClose}
                    className={`w-full sm:w-auto ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            )}

            {!selectedModelId && (
              <div className={`flex justify-end pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                <Button type="button" variant="outline" onClick={onClose}
                  className={`w-full sm:w-auto ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}>Cancel</Button>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}