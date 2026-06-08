import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface TrainingCurriculumRecord {
  attendance_id: number;
  training_name: string;
  training_type: string | null;
  certificate_type: string | null;
  session_code: string | null;
  completion_date: string | null;
  expiry_date: string | null;
  status: 'VALID' | 'EXPIRED' | null;
}

const CERT_TYPE_LABELS: Record<string, string> = {
  PARTICIPATION: 'Certificate of Participation',
  QUALIFICATION: 'Qualification',
};

export function CurriculumTable({
  rows,
  formatDate,
  t,
  isDark = false,
  muted = false,
}: {
  rows: TrainingCurriculumRecord[];
  formatDate: (d: string) => string;
  t: (key: string) => string;
  isDark?: boolean;
  muted?: boolean;
}) {
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const headClass = isDark ? 'text-slate-400 bg-slate-800/50' : 'text-slate-500 bg-slate-50';
  const rowClass = isDark ? 'border-slate-700 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50';
  const cellText = isDark ? 'text-slate-200' : 'text-slate-800';
  const cellMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`rounded-md border overflow-hidden ${borderClass} ${muted ? 'opacity-60' : ''}`}>
      <Table>
        <TableHeader>
          <TableRow className={`${borderClass} ${headClass}`}>
            <TableHead className={cellMuted}>{t('profile.curriculum.headers.course')}</TableHead>
            <TableHead className={cellMuted}>{t('profile.curriculum.headers.certificate')}</TableHead>
            <TableHead className={cellMuted}>{t('profile.curriculum.headers.completionDate')}</TableHead>
            <TableHead className={cellMuted}>{t('profile.curriculum.headers.expiryDate')}</TableHead>
            <TableHead className={`text-right ${cellMuted}`}>{t('profile.curriculum.headers.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.attendance_id} className={rowClass}>
              <TableCell>
                <p className={`font-medium text-sm ${cellText}`}>{r.training_name}</p>
                {r.training_type && (
                  <p className={`text-xs mt-0.5 ${cellMuted}`}>{r.training_type}</p>
                )}
              </TableCell>
              <TableCell>
                {r.certificate_type ? (
                  <Badge
                    variant="outline"
                    className={
                      r.certificate_type === 'QUALIFICATION'
                        ? isDark
                          ? 'border-amber-700 text-amber-300'
                          : 'border-amber-300 text-amber-700'
                        : isDark
                          ? 'border-teal-700 text-teal-300'
                          : 'border-teal-300 text-teal-700'
                    }
                  >
                    {CERT_TYPE_LABELS[r.certificate_type] ?? r.certificate_type}
                  </Badge>
                ) : (
                  <span className={`text-xs ${cellMuted}`}>—</span>
                )}
              </TableCell>
              <TableCell className={`text-sm ${cellMuted}`}>
                {r.completion_date ? formatDate(r.completion_date) : '—'}
              </TableCell>
              <TableCell className={`text-sm ${r.status === 'EXPIRED' ? 'text-red-400 font-medium' : cellMuted}`}>
                {r.expiry_date ? formatDate(r.expiry_date) : '—'}
              </TableCell>
              <TableCell className="text-right">
                {r.status === 'VALID' ? (
                  <Badge className={isDark ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/40' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                    {t('profile.curriculum.valid')}
                  </Badge>
                ) : r.status === 'EXPIRED' ? (
                  <Badge variant="destructive">{t('profile.curriculum.expired')}</Badge>
                ) : (
                  <Badge variant="secondary">{t('profile.curriculum.noExpiry')}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
