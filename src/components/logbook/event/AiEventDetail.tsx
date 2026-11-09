'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { AiEventActionType, AiEventItem, AiEventStatus } from '@/config/types/ai-event';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Check, CheckCheck, ImageOff, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AiDetectionFeedback } from './AiDetectionFeedback';
import { eventUi } from './event-ui';

type ImageView = 'processed' | 'original';

const STATUS_STYLE: Record<AiEventStatus, string> = {
  open: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  acknowledged: 'border-sky-500/30 bg-sky-500/10 text-sky-600',
  resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
};

export function AiEventDetail({
  event,
  onClose,
  isDark,
  showCompany,
  companyBadge,
  linkBadge,
  statusBadge,
  onActed,
  onDelete,
}: {
  event: AiEventItem | null;
  onClose: () => void;
  isDark: boolean;
  showCompany: boolean;
  companyBadge: (e: AiEventItem) => React.ReactNode;
  linkBadge: (e: AiEventItem) => React.ReactNode;
  statusBadge: (e: AiEventItem) => React.ReactNode;
  onActed: () => Promise<void> | void;
  onDelete: (e: AiEventItem) => void;
}) {
  const { t } = useTranslation();
  const a = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.ai.${key}`, opts);
  const ui = eventUi(isDark);
  const [view, setView] = useState<ImageView>('original');
  const [showPredictions, setShowPredictions] = useState(true);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState<AiEventActionType | null>(null);
  const [tab, setTab] = useState('details');

  useEffect(() => {
    if (!event) return;
    setTab('details');
    setView(event.original_url ? 'original' : 'processed');
    setShowPredictions(true);
    setFailedSrc(null);
    setComment('');
  }, [event?.ai_event_id]);

  const act = async (action: AiEventActionType) => {
    if (!event) return;
    setActing(action);
    try {
      await axios.post(`/api/logbooks/event/ai/${event.ai_event_id}/action`, { action, comment: comment.trim() || undefined });
      toast.success(a(`actionSuccess_${action}`));
      setComment('');
      await onActed();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? a('actionError'));
      // A conflict means someone else acted first; show their result.
      if (err?.response?.status === 409) await onActed();
    } finally {
      setActing(null);
    }
  };

  const fields: [string, React.ReactNode][] = event
    ? [
        [a('event'), event.event_label],
        [a('time'), new Date(event.event_time).toLocaleString()],
        [a('stream'), event.stream_id],
        ...(showCompany ? ([[a('company'), companyBadge(event)]] as [string, React.ReactNode][]) : []),
        [a('client'), event.client_name ?? '—'],
        [a('link'), linkBadge(event)],
        [a('detected'), event.class_name ?? '—'],
        [a('confidence'), event.confidence != null ? `${(event.confidence * 100).toFixed(1)}%` : '—'],
        [a('track'), event.track_id ?? '—'],
        [a('session'), event.session_id],
        [a('frame'), event.frame_number ?? '—'],
        [a('framesDetected'), event.frames_detected ?? '—'],
        [a('processingTime'), event.processing_time_ms != null ? `${event.processing_time_ms} ms` : '—'],
        [a('modelMode'), event.model_mode ?? '—'],
        [a('email'), a(`notify_${event.notify_status}`)],
        [a('status'), statusBadge(event)],
        ...(event.notified_emails.length ? ([[a('sentTo'), event.notified_emails.join(', ')]] as [string, React.ReactNode][]) : []),
      ]
    : [];

  // The original frame has nothing drawn on it, so the boxes are drawn here from the detections.
  // The AI-processed image already carries the model's own drawing.
  const showOriginal = view === 'original' && !!event?.original_url;
  const wantedSrc = showOriginal ? event?.original_url : (event?.snapshot_url ?? event?.original_url);
  // A link that fails to load is treated like no image, never shown as a broken icon.
  const src = wantedSrc && failedSrc !== wantedSrc ? wantedSrc : null;
  const size = event?.original_size;
  const drawBoxes = showOriginal && showPredictions && !!size && (event?.detections.length ?? 0) > 0;

  return (
    <Dialog open={!!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn('max-h-[90vh] max-w-3xl overflow-y-auto', ui.dialog)}>
        <DialogHeader>
          <DialogTitle>{event?.event_label}</DialogTitle>
        </DialogHeader>
        {event && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="details">{a('tabDetails')}</TabsTrigger>
              <TabsTrigger value="report">
                {a('tabReport')}
                {event.feedback && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-violet-500" />}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="report">
              <AiDetectionFeedback event={event} isDark={isDark} onSaved={onActed} />
            </TabsContent>
            <TabsContent value="details">
          <div className="space-y-4">
            {event.snapshot_url && event.original_url && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1">
                  {(['original', 'processed'] as const).map((v) => (
                    <Button
                      key={v}
                      size="sm"
                      variant={view === v ? 'default' : 'outline'}
                      className={cn('h-7 text-xs', view === v ? 'bg-violet-600 text-white hover:bg-violet-700' : ui.outlineBtn)}
                      onClick={() => setView(v)}
                    >
                      {a(v === 'processed' ? 'viewProcessed' : 'viewOriginal')}
                    </Button>
                  ))}
                </div>
                {showOriginal && event.detections.length > 0 && (
                  <label className={cn('flex cursor-pointer items-center gap-2 text-xs', ui.muted)}>
                    <Switch checked={showPredictions} onCheckedChange={setShowPredictions} />
                    {a('showPredictions')}
                  </label>
                )}
              </div>
            )}
            {src ? (
              <div className="space-y-1.5">
                <div className="relative overflow-hidden rounded-lg border">
                  {}
                  <img src={src} alt="" className="block w-full" onError={() => setFailedSrc(src)} />
                  {drawBoxes && size && (
                    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
                      {event.detections.map((d, i) => {
                        const main = d.track_id === event.track_id;
                        const color = main ? '#ef4444' : '#f59e0b';
                        const [x1, y1, x2, y2] = d.bounding_box;
                        const stroke = Math.max(2, size.width / 300);
                        const fs = Math.max(12, size.width / 55);
                        const label = `${d.class_name} ${Math.round(d.confidence * 100)}%`;
                        const labelW = label.length * fs * 0.6 + fs * 0.8;
                        const labelH = fs * 1.5;
                        // Above the box; inside it when the box touches the top edge.
                        const ly = y1 - labelH >= 0 ? y1 - labelH : y1;
                        return (
                          <g key={i}>
                            <rect x={x1} y={y1} width={Math.max(0, x2 - x1)} height={Math.max(0, y2 - y1)} fill="none" stroke={color} strokeWidth={stroke} />
                            <rect x={x1} y={ly} width={labelW} height={labelH} fill={color} />
                            <text x={x1 + fs * 0.4} y={ly + labelH * 0.72} fill="#fff" fontSize={fs} fontWeight={600} fontFamily="sans-serif">
                              {label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
                {drawBoxes && (
                  <div className={cn('flex flex-wrap gap-x-4 text-[11px]', ui.faint)}>
                    <span>
                      <span className="mr-1 text-red-500">■</span>
                      {a('legendMain')}
                    </span>
                    {event.detections.some((d) => d.track_id !== event.track_id) && (
                      <span>
                        <span className="mr-1 text-amber-500">■</span>
                        {a('legendOthers')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={cn('flex items-center gap-2 rounded-lg border p-4 text-xs', ui.panel, ui.muted)}>
                <ImageOff className="h-4 w-4" />
                {a(`snapshot_${wantedSrc ? 'failed' : event.snapshot_status}`)}
              </div>
            )}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              {fields.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b pb-1">
                  <dt className={ui.muted}>{k}</dt>
                  <dd className={cn('break-all text-right font-medium', ui.text)}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className={cn('space-y-3 rounded-lg border p-3', ui.divider)}>
              <div className={ui.label}>{a('actionsTitle')}</div>
              {event.actions.length === 0 ? (
                <div className={cn('text-xs', ui.faint)}>{a('noHistory')}</div>
              ) : (
                <ul className="space-y-2">
                  {event.actions.map((x) => (
                    <li key={x.action_id} className="text-xs">
                      <div className={cn('flex flex-wrap items-center gap-x-2', ui.muted)}>
                        <Badge className={STATUS_STYLE[x.action]}>{a(`status_${x.action}`)}</Badge>
                        <span>{a('byUser', { name: x.user_email })}</span>
                        <span className={ui.faint}>{new Date(x.created_at).toLocaleString()}</span>
                      </div>
                      {x.comment && <p className={cn('mt-1 whitespace-pre-wrap break-words', ui.text)}>{x.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {event.status !== 'resolved' && (
                <div className="space-y-2">
                  <div className={ui.label}>{a('commentLabel')}</div>
                  <Textarea
                    value={comment}
                    maxLength={1000}
                    rows={2}
                    disabled={!!acting}
                    onChange={(ev) => setComment(ev.target.value)}
                    placeholder={a('commentPlaceholder')}
                    className={cn('text-xs', ui.input)}
                  />
                  <div className="flex justify-end gap-2">
                    {event.status === 'open' && (
                      <Button size="sm" variant="outline" className={cn('h-8 gap-1.5 text-xs', ui.outlineBtn)} disabled={!!acting} onClick={() => act('acknowledged')}>
                        {acting === 'acknowledged' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        {a('acknowledge')}
                      </Button>
                    )}
                    <Button size="sm" className="h-8 gap-1.5 bg-violet-600 text-xs text-white hover:bg-violet-700" disabled={!!acting} onClick={() => act('resolved')}>
                      {acting === 'resolved' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                      {a('resolve')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {event.detections.length > 0 && (
              <div className="space-y-1.5">
                <div className={ui.label}>{a('detections')}</div>
                <div className={cn('overflow-hidden rounded-lg border', ui.divider)}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={cn('border-b text-left', ui.divider)}>
                        {[a('track'), a('detected'), a('confidence')].map((h) => (
                          <th key={h} className={cn('px-3 py-1.5', ui.label)}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {event.detections.map((d, i) => (
                        <tr key={i} className={cn('border-b last:border-0', ui.rowBorder, d.track_id === event.track_id && 'font-semibold')}>
                          <td className={cn('px-3 py-1.5', ui.text)}>
                            {d.track_id}
                            {d.track_id === event.track_id && <span className="ml-1 text-red-500">●</span>}
                          </td>
                          <td className={cn('px-3 py-1.5', ui.text)}>{d.class_name}</td>
                          <td className={cn('px-3 py-1.5', ui.muted)}>{(d.confidence * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-red-500/40 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => onDelete(event)}>
                <Trash2 className="h-3.5 w-3.5" />
                {a('delete')}
              </Button>
            </div>
          </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
