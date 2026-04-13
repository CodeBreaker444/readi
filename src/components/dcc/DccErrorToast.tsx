'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  toastId: string | number;
  title: string;
  dcc: DccCallbackResult;
}

export default function DccErrorToast({ toastId, title, dcc }: Props) {
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
        title="Click for details"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 leading-snug">{title}</p>
          <p className="text-xs text-amber-700 mt-0.5">
            DCC {dcc.outcome} · <span className="font-mono">{dcc.path}</span>
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5 underline underline-offset-2">
            Click for details
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
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
              DCC Error Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <Row label="Action" value={title} />
            <Row label="Endpoint" value={dcc.path} mono />
            <Row label="Outcome" value={dcc.outcome} />
            <Row label="Message" value={dcc.message} />
            {dcc.httpStatus != null && (
              <Row label="HTTP Status" value={String(dcc.httpStatus)} />
            )}
            {dcc.responseBody?.trim() && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Response Body</p>
                <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                  {dcc.responseBody.trim()}
                </pre>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            {!isSuperAdmin && (
              <p className="text-xs text-muted-foreground">
                {reported
                  ? 'Reported to admin team.'
                  : 'Report this error to the admin team.'}
              </p>
            )}
            <div className={`flex gap-2 ${isSuperAdmin ? 'ml-auto' : ''}`}>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Close
              </Button>
              {!isSuperAdmin && (
                <Button
                  size="sm"
                  variant={reported ? 'outline' : 'destructive'}
                  disabled={reporting || reported}
                  onClick={handleReport}
                >
                  {reported ? 'Reported ✓' : reporting ? 'Reporting…' : 'Report Bug'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={mono ? 'font-mono text-xs mt-0.5' : 'mt-0.5'}>{value}</p>
    </div>
  );
}
