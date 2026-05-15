'use client';

import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { CheckCircle2, MapPin, Navigation, PlaneTakeoff, Send, User } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'] as const;
type Priority = (typeof PRIORITY_OPTIONS)[number];

interface FormState {
  mission_type: string;
  target: string;
  start_datetime: string;
  priority: Priority | '';
  notes: string;
  operator: string;
  loc_highway: string;
  loc_carriageway: string;
  loc_km_start: string;
  loc_km_end: string;
  wp_lat: string;
  wp_lng: string;
  wp_alt: string;
}

const EMPTY_FORM: FormState = {
  mission_type: '',
  target: '',
  start_datetime: '',
  priority: '',
  notes: '',
  operator: '',
  loc_highway: '',
  loc_carriageway: '',
  loc_km_start: '',
  loc_km_end: '',
  wp_lat: '',
  wp_lng: '',
  wp_alt: '',
};

function SectionHeader({ icon, title, isDark }: { icon: React.ReactNode; title: string; isDark: boolean }) {
  return (
    <div
      className="flex items-center gap-2 pb-3 border-b border-dashed"
      style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}
    >
      <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-800')}>{title}</p>
    </div>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-xs font-medium mb-1.5 text-slate-500 uppercase tracking-wide">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

export default function RequestFlightPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const inputBase = cn(
    'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors',
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-violet-500 focus:bg-white/[0.08]'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100',
  );

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.mission_type.trim() && !form.target.trim()) {
      toast.error(t('clientPortal.requestValidation', 'Please fill in at least Mission Type or Target.'));
      return;
    }

    // Build localization object only if any field is filled
    const hasLoc = form.loc_highway || form.loc_carriageway || form.loc_km_start || form.loc_km_end;
    const localization = hasLoc
      ? {
          ...(form.loc_highway ? { highway: form.loc_highway.trim() } : {}),
          ...(form.loc_carriageway ? { carriageway: form.loc_carriageway.trim() } : {}),
          ...(form.loc_km_start !== '' ? { kmStart: Number(form.loc_km_start) } : {}),
          ...(form.loc_km_end !== '' ? { kmEnd: Number(form.loc_km_end) } : {}),
        }
      : undefined;

    // Build waypoint object only if lat/lng are filled
    const hasWp = form.wp_lat !== '' && form.wp_lng !== '';
    const waypoint = hasWp
      ? {
          coordinates: [
            Number(form.wp_lng),
            Number(form.wp_lat),
            form.wp_alt !== '' ? Number(form.wp_alt) : undefined,
          ].filter((v) => v !== undefined) as number[],
        }
      : undefined;

    setSubmitting(true);
    try {
      await axios.post('/api/client-portal/request-flight', {
        mission_type: form.mission_type.trim() || undefined,
        target: form.target.trim() || undefined,
        start_datetime: form.start_datetime || undefined,
        priority: form.priority || undefined,
        notes: form.notes.trim() || undefined,
        operator: form.operator.trim() || undefined,
        localization,
        waypoint,
      });
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? t('clientPortal.requestFailed', 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  };

  const priorityColor = (p: Priority) => {
    const selected = form.priority === p;
    if (p === 'HIGH')
      return selected
        ? 'bg-rose-500 border-rose-500 text-white'
        : isDark
        ? 'bg-white/5 border-white/10 text-slate-300 hover:border-rose-500/50'
        : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300';
    if (p === 'MEDIUM')
      return selected
        ? 'bg-amber-500 border-amber-500 text-white'
        : isDark
        ? 'bg-white/5 border-white/10 text-slate-300 hover:border-amber-500/50'
        : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300';
    return selected
      ? 'bg-emerald-500 border-emerald-500 text-white'
      : isDark
      ? 'bg-white/5 border-white/10 text-slate-300 hover:border-emerald-500/50'
      : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300';
  };

  const priorityLabel = (p: Priority) => {
    if (p === 'HIGH') return t('clientPortal.priorityHigh', 'High');
    if (p === 'MEDIUM') return t('clientPortal.priorityMedium', 'Medium');
    return t('clientPortal.priorityLow', 'Low');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div
        className={cn(
          'top-0 z-10 backdrop-blur-md transition-colors px-4 sm:px-6 py-4 mb-6',
          isDark
            ? 'bg-slate-900/80 border-b border-slate-800 text-white'
            : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-violet-600 shrink-0" />
          <div>
            <h1 className={cn('font-semibold text-base tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {t('clientPortal.requestFlightTitle', 'Request New Flight')}
            </h1>
            <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
              {t('clientPortal.requestFlightSubtitle', 'Submit a new flight request to the operations team')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-12 w-full">
        {submitted ? (
          <div
            className={cn(
              'rounded-2xl border p-10 flex flex-col items-center gap-4 text-center',
              isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
            )}
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <p className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                {t('clientPortal.requestSubmitted', 'Request Submitted!')}
              </p>
              <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {t(
                  'clientPortal.requestSubmittedDesc',
                  'Your flight request has been received. The operations team will review and respond shortly.',
                )}
              </p>
            </div>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              {t('clientPortal.requestAnother', 'Request Another Flight')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── Flight Details ── */}
            <div
              className={cn(
                'rounded-2xl border p-6 space-y-5',
                isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
              )}
            >
              <SectionHeader
                icon={<PlaneTakeoff className="w-4 h-4 text-violet-500" />}
                title={t('clientPortal.flightDetails', 'Flight Details')}
                isDark={isDark}
              />

              <div>
                <FieldLabel label={t('clientPortal.fieldMissionType', 'Mission Type')} required />
                <input
                  type="text"
                  value={form.mission_type}
                  onChange={set('mission_type')}
                  placeholder={t('clientPortal.missionTypePlaceholder', 'e.g. Surveillance, Inspection, Delivery…')}
                  className={inputBase}
                />
              </div>

              <div>
                <FieldLabel label={t('clientPortal.fieldTarget', 'Target / Area')} />
                <input
                  type="text"
                  value={form.target}
                  onChange={set('target')}
                  placeholder={t('clientPortal.targetPlaceholder', 'Location or area description')}
                  className={inputBase}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label={t('clientPortal.fieldStartDatetime', 'Preferred Start Time')} />
                  <input
                    type="datetime-local"
                    value={form.start_datetime}
                    onChange={set('start_datetime')}
                    className={cn(inputBase, isDark ? '[color-scheme:dark]' : '')}
                  />
                </div>
                <div>
                  <FieldLabel label={t('clientPortal.fieldPriority', 'Priority')} />
                  <div className="flex gap-1.5 h-[42px]">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, priority: f.priority === p ? '' : p }))}
                        className={cn(
                          'flex-1 rounded-lg border text-xs font-medium transition-colors',
                          priorityColor(p),
                        )}
                      >
                        {priorityLabel(p)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel label={t('clientPortal.fieldNotes', 'Notes')} />
                <textarea
                  value={form.notes}
                  onChange={set('notes')}
                  rows={3}
                  placeholder={t('clientPortal.notesPlaceholder', 'Any additional information or special requirements…')}
                  className={cn(inputBase, 'resize-none')}
                />
              </div>
            </div>

            {/* ── Operator ── */}
            <div
              className={cn(
                'rounded-2xl border p-6 space-y-5',
                isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
              )}
            >
              <SectionHeader
                icon={<User className="w-4 h-4 text-violet-500" />}
                title={t('clientPortal.operatorSection', 'Operator')}
                isDark={isDark}
              />
              <div>
                <FieldLabel label={t('clientPortal.fieldOperator', 'Operator Name')} />
                <input
                  type="text"
                  value={form.operator}
                  onChange={set('operator')}
                  placeholder={t('clientPortal.operatorPlaceholder', 'Company or person responsible for this request')}
                  className={inputBase}
                />
              </div>
            </div>

            {/* ── Localization ── */}
            <div
              className={cn(
                'rounded-2xl border p-6 space-y-5',
                isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
              )}
            >
              <SectionHeader
                icon={<MapPin className="w-4 h-4 text-violet-500" />}
                title={t('clientPortal.localizationSection', 'Localization')}
                isDark={isDark}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label={t('clientPortal.fieldHighway', 'Highway')} />
                  <input
                    type="text"
                    value={form.loc_highway}
                    onChange={set('loc_highway')}
                    placeholder="e.g. A1, M25"
                    className={inputBase}
                  />
                </div>
                <div>
                  <FieldLabel label={t('clientPortal.fieldCarriageway', 'Carriageway')} />
                  <input
                    type="text"
                    value={form.loc_carriageway}
                    onChange={set('loc_carriageway')}
                    placeholder="e.g. North, South"
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label={t('clientPortal.fieldKmStart', 'Km Start')} />
                  <input
                    type="number"
                    value={form.loc_km_start}
                    onChange={set('loc_km_start')}
                    placeholder="0"
                    className={inputBase}
                  />
                </div>
                <div>
                  <FieldLabel label={t('clientPortal.fieldKmEnd', 'Km End')} />
                  <input
                    type="number"
                    value={form.loc_km_end}
                    onChange={set('loc_km_end')}
                    placeholder="0"
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* ── Waypoint ── */}
            <div
              className={cn(
                'rounded-2xl border p-6 space-y-5',
                isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
              )}
            >
              <SectionHeader
                icon={<Navigation className="w-4 h-4 text-violet-500" />}
                title={t('clientPortal.waypointSection', 'Waypoint')}
                isDark={isDark}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FieldLabel label={t('clientPortal.fieldLatitude', 'Latitude')} />
                  <input
                    type="number"
                    step="any"
                    value={form.wp_lat}
                    onChange={set('wp_lat')}
                    placeholder="e.g. 41.9028"
                    className={inputBase}
                  />
                </div>
                <div>
                  <FieldLabel label={t('clientPortal.fieldLongitude', 'Longitude')} />
                  <input
                    type="number"
                    step="any"
                    value={form.wp_lng}
                    onChange={set('wp_lng')}
                    placeholder="e.g. 12.4964"
                    className={inputBase}
                  />
                </div>
                <div>
                  <FieldLabel label={t('clientPortal.fieldAltitude', 'Altitude (m)')} />
                  <input
                    type="number"
                    step="any"
                    value={form.wp_alt}
                    onChange={set('wp_alt')}
                    placeholder="e.g. 120"
                    className={inputBase}
                  />
                </div>
              </div>

              {form.wp_lat !== '' && form.wp_lng !== '' && (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-mono',
                    isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500',
                  )}
                >
                  <Navigation className="w-3 h-3 text-violet-400 shrink-0" />
                  <span>
                    {Number(form.wp_lat).toFixed(6)}, {Number(form.wp_lng).toFixed(6)}
                    {form.wp_alt !== '' ? ` · alt ${form.wp_alt} m` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
                submitting
                  ? 'bg-violet-500/50 text-white/60 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20',
              )}
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('clientPortal.submitting', 'Submitting…')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('clientPortal.submitRequest', 'Submit Flight Request')}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
