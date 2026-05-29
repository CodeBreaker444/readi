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
  muted = false,
}: {
  rows: TrainingCurriculumRecord[];
  formatDate: (d: string) => string;
  t: (key: string) => string;
  muted?: boolean;
}) {
  return (
    <div className={`rounded-md border overflow-hidden ${muted ? 'opacity-60' : ''}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('profile.curriculum.headers.course')}</TableHead>
            <TableHead>{t('profile.curriculum.headers.certificate')}</TableHead>
            <TableHead>{t('profile.curriculum.headers.completionDate')}</TableHead>
            <TableHead>{t('profile.curriculum.headers.expiryDate')}</TableHead>
            <TableHead className="text-right">{t('profile.curriculum.headers.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.attendance_id}>
              <TableCell>
                <p className="font-medium text-sm">{r.training_name}</p>
                {r.training_type && (
                  <p className="text-xs text-muted-foreground mt-0.5">{r.training_type}</p>
                )}
              </TableCell>
              <TableCell>
                {r.certificate_type ? (
                  <Badge
                    variant="outline"
                    className={
                      r.certificate_type === 'QUALIFICATION'
                        ? 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300'
                        : 'border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-300'
                    }
                  >
                    {CERT_TYPE_LABELS[r.certificate_type] ?? r.certificate_type}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.completion_date ? formatDate(r.completion_date) : '—'}
              </TableCell>
              <TableCell className={`text-sm ${r.status === 'EXPIRED' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {r.expiry_date ? formatDate(r.expiry_date) : '—'}
              </TableCell>
              <TableCell className="text-right">
                {r.status === 'VALID' ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
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