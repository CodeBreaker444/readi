'use client';

import DateRangePicker from '@/components/common/DateRangePicker';
import { useTimezone } from '@/components/TimezoneProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { nowAsLocalInput } from '@/lib/utils';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface QtbReportDrone {
  component_id: number;
  label: string;
}

interface Props {
  open: boolean;
  drone: QtbReportDrone | null;
  onClose: () => void;
}

export function QtbReportModal({ open, drone, onClose }: Props) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { timezone } = useTimezone();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const today = nowAsLocalInput(timezone).slice(0, 10);
    setStartDate(today);
    setEndDate(today);
    setError(null);
  }, [open, timezone]);

  const handleGenerate = async () => {
    if (!drone || !startDate || !endDate) return;
    if (endDate < startDate) {
      setError(t('systems.components.qtbReportModal.errors.rangeInvalid'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate, timezone });
      const res = await fetch(`/api/system/component/${drone.component_id}/qtb-report?${params.toString()}`);
      const body = await res.json();

      if (body.code === 1 && body.data) {
        const { generateQtbReportPdf } = await import('@/lib/generateQtbReport');
        await generateQtbReportPdf(body.data, timezone, i18n.language);
        toast.success(t('systems.components.qtbReportModal.toasts.success'));
        onClose();
      } else if (body.code === 2) {
        setError(body.message || t('systems.components.qtbReportModal.errors.tooManyRecords'));
      } else {
        setError(body.message || t('systems.components.qtbReportModal.errors.generic'));
      }
    } catch {
      toast.error(t('systems.components.qtbReportModal.toasts.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <FileText className="h-5 w-5 text-violet-600" />
            {t('systems.components.qtbReportModal.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {drone?.label}
          </p>

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => { setStartDate(start); setEndDate(end); setError(null); }}
          />

          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('systems.components.qtbReportModal.timezoneHint', { timezone })}
          </p>

          {error && (
            <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${isDark ? 'bg-red-950/40 text-red-300 border border-red-800/50' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}
            className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
            {t('systems.components.qtbReportModal.buttons.cancel')}
          </Button>
          <Button onClick={handleGenerate} disabled={loading || !startDate || !endDate}
            className="bg-violet-600 hover:bg-violet-700 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {loading
              ? t('systems.components.qtbReportModal.buttons.generating')
              : t('systems.components.qtbReportModal.buttons.generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
