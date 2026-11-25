'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { EMPTY_ZONES, OperationZones } from '@/lib/operation-zones';
import { Fence } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import OperationZonesEditor, { OperationZonesEditorSkeleton } from './OperationZonesEditor';

interface Props {
  open: boolean;
  toolId: number | null;
  toolCode?: string;
  /** Hides Save for users who can only view. */
  canEdit?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function OperationZonesModal({ open, toolId, toolCode, canEdit = true, onClose, onSaved }: Props) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [zones, setZones] = useState<OperationZones>(EMPTY_ZONES);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || !toolId) {
      // Don't flash the previous system's zones next time the dialog opens.
      setLoaded(false);
      setZones(EMPTY_ZONES);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoaded(false);
    fetch(`/api/system/${toolId}/zones`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.code !== 1) { toast.error(res.message || t('systems.zones.loadFailed', 'Could not load zones')); onClose(); return; }
        setZones(res.operationZones ?? EMPTY_ZONES);
        setFocus(res.latitude != null && res.longitude != null ? { lat: Number(res.latitude), lng: Number(res.longitude) } : null);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) { toast.error(t('systems.zones.loadFailed', 'Could not load zones')); onClose(); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, toolId]);

  const save = async () => {
    if (!toolId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/system/${toolId}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationZones: zones }),
      });
      const data = await res.json();
      if (data.code === 1) { toast.success(t('systems.zones.saved', 'Operation zones saved')); onSaved?.(); onClose(); }
      else toast.error(data.message || t('systems.zones.saveFailed', 'Could not save zones'));
    } catch {
      toast.error(t('systems.zones.saveFailed', 'Could not save zones'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`max-w-225! w-[92vw] max-h-[92vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <Fence className="h-4 w-4 text-violet-500" />
            {t('systems.zones.title', 'Operation zones')}{toolCode ? ` — ${toolCode}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading || !loaded ? (
          <OperationZonesEditorSkeleton />
        ) : (
          <OperationZonesEditor value={zones} onChange={setZones} isDark={isDark} focus={focus} height={460} />
        )}

        <div className={`flex justify-end gap-2 border-t pt-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <Button type="button" variant="outline" onClick={onClose} className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
            {t('systems.zones.close', 'Close')}
          </Button>
          {canEdit && (
            <Button type="button" disabled={saving || !loaded} onClick={save} className="bg-violet-600 hover:bg-violet-500 text-white">
              {saving ? t('systems.zones.saving', 'Saving…') : t('systems.zones.save', 'Save zones')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
