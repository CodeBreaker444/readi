'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
  toastId: string | number;
  title: string;
  dcc: DccCallbackResult;
}

export default function DccErrorToast({ toastId, title, dcc }: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/owner')
      .then((r) => r.json())
      .then((d) => { if (d.code === 1) setIsSuperAdmin(true); })
      .catch(() => {});
  }, []);

  const handleReport = async () => {
    setReporting(true);
    try {
      await fetch('/api/dcc/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, dcc }),
      });
      setReported(true);
    } catch {
      // silently ignore
    } finally {
      setReporting(false);
    }
  };

  return (
    <>
      <div
        className="flex items-start gap-2.5 w-full min-w-[300px] max-w-sm rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 shadow-md cursor-pointer select-none"
        onClick={() => setModalOpen(true)}
        title={t('dccToast.clickForDetails')}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 leading-snug">{title}</p>
          <p className="text-xs text-amber-700 mt-0.5">
            DCC {dcc.outcome} · <span className="font-mono">{dcc.path}</span>
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5 underline underline-offset-2">
            {t('dccToast.clickForDetails')}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('dccToast.dismiss')}
          className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 hover:text-amber-900 transition-colors mt-0.5"
          onClick={(e) => { e.stopPropagation(); toast.dismiss(toastId); }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {t('dccToast.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <Row label={t('dccToast.labelAction')} value={title} />
            <Row label={t('dccToast.labelEndpoint')} value={dcc.path} mono />
            <Row label={t('dccToast.labelOutcome')} value={dcc.outcome} />
            <Row label={t('dccToast.labelMessage')} value={dcc.message} />
            {dcc.httpStatus != null && (
              <Row label={t('dccToast.labelHttpStatus')} value={String(dcc.httpStatus)} />
            )}
            {dcc.responseBody?.trim() && (
              <ResponseBody raw={dcc.responseBody.trim()} label={t('dccToast.labelResponseBody')} />
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            {!isSuperAdmin && (
              <p className="text-xs text-muted-foreground">
                {reported
                  ? t('dccToast.reportedToAdmin')
                  : t('dccToast.reportHint')}
              </p>
            )}
            <div className={`flex gap-2 ${isSuperAdmin ? 'ml-auto' : ''}`}>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                {t('common.close')}
              </Button>
              {!isSuperAdmin && (
                <Button
                  size="sm"
                  variant={reported ? 'outline' : 'destructive'}
                  disabled={reporting || reported}
                  onClick={handleReport}
                >
                  {reported ? t('dccToast.reported') : reporting ? t('dccToast.reporting') : t('dccToast.reportBug')}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResponseBody({ raw, label }: { raw: string; label: string }) {
  let parsed: unknown = null;
  try { parsed = JSON.parse(raw); } catch { /* not JSON */ }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {parsed !== null ? (
        <div className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-52 overflow-y-auto">
          <JsonValue value={parsed} depth={0} />
        </div>
      ) : (
        <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-52">
          {raw}
        </pre>
      )}
    </div>
  );
}

function JsonValue({ value, depth }: { value: unknown; depth: number }) {
  const indent = depth * 12;

  if (value === null) return <span className="text-slate-400">null</span>;
  if (typeof value === 'boolean') return <span className="text-blue-500">{String(value)}</span>;
  if (typeof value === 'number') return <span className="text-emerald-600">{value}</span>;
  if (typeof value === 'string') return <span className="text-amber-700">"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-500">[]</span>;
    return (
      <span>
        {'['}
        {value.map((item, i) => (
          <div key={i} style={{ paddingLeft: indent + 12 }}>
            <JsonValue value={item} depth={depth + 1} />
            {i < value.length - 1 && <span className="text-slate-400">,</span>}
          </div>
        ))}
        <div style={{ paddingLeft: indent }}>{']'}</div>
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-slate-500">{'{}'}</span>;
    return (
      <span>
        {'{'}
        {entries.map(([k, v], i) => (
          <div key={k} style={{ paddingLeft: indent + 12 }}>
            <span className="text-violet-600 font-medium">"{k}"</span>
            <span className="text-slate-500">: </span>
            <JsonValue value={v} depth={depth + 1} />
            {i < entries.length - 1 && <span className="text-slate-400">,</span>}
          </div>
        ))}
        <div style={{ paddingLeft: indent }}>{'}'}</div>
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={mono ? 'font-mono text-xs mt-0.5' : 'mt-0.5'}>{value}</p>
    </div>
  );
}
