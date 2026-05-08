'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateInTz } from '@/lib/utils';
import axios from 'axios';
import { Camera, CheckCircle2, Clock, GraduationCap, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useTimezone } from '../../components/TimezoneProvider';
import { useTheme } from '../../components/useTheme';

interface TrainingCurriculumRecord {
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

function CurriculumTable({
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

export default function ProfilePage() {
  const { t } = useTranslation();
  const { timezone } = useTimezone();
  const { isDark } = useTheme();
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    timezone: 'Europe/Berlin',
    department: 'Global',
    client: '',
    profile: '',
    type: '',
    signature: '',
    easaOperatorCode: '',
    role: '',
  });
  const [curriculum, setCurriculum] = useState<TrainingCurriculumRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [canEditEmail, setCanEditEmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserProfile();
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, curriculumRes] = await Promise.all([
        axios.get('/api/profile'),
        axios.get('/api/training/curriculum').catch(() => null),
      ]);

      const data = profileRes.data;
      if (data.success) {
        setFormData({
          fullName: data.user.fullName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          timezone: data.user.user_timezone || 'Europe/Berlin',
          department: 'Global',
          client: '',
          profile: '',
          type: data.user.user_type || '',
          signature: data.user.users_profile?.user_signature || '',
          easaOperatorCode: data.user.easa_operator_code || '',
          role: data.user.role || '',
        });
        setCanEditEmail(['ADMIN', 'SUPERADMIN'].includes(data.user.role));
        if (data.user.avatar_url) setCurrentAvatarUrl(data.user.avatar_url);
      }

      if (curriculumRes?.data?.data) setCurriculum(curriculumRes.data.data);
    } catch {
      toast.error(t('profile.errors.load'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) { toast.error(t('profile.errors.avatarSize')); return; }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast.error(t('profile.errors.avatarFormat')); return;
      }
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('fullname', formData.fullName);
    fd.append('email', formData.email);
    fd.append('phone', formData.phone);
    fd.append('timezone', formData.timezone);
    fd.append('easa_operator_code', formData.easaOperatorCode);
    if (avatar) fd.append('avatar', avatar);

    try {
      const response = await axios.post('/api/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const result = response.data;
      if (result.updateResult) {
        toast.success(t('profile.success.updated'));
        if (result.avatarUrl) { setCurrentAvatarUrl(result.avatarUrl); setAvatarPreview(null); setAvatar(null); }
        window.location.reload();
      } else {
        toast.error(result.message || t('profile.errors.update'));
      }
    } catch {
      toast.error(t('profile.errors.update'));
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarPreview || currentAvatarUrl;
  const formatDate = (dateStr: string) => formatDateInTz(dateStr, timezone);

  return (
    <div className={`min-h-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Page header */}
      <div className={`top-0 z-10 border-b px-4 sm:px-6 py-4 flex items-center gap-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="w-1 h-6 rounded-full bg-violet-600" />
        <div>
          
          <h1 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('profile.title')}</h1>
          {!loading && (
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{formData.fullName || formData.email}</p>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6 mx-auto">
        <Card>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
             <div className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-row items-center gap-4 md:gap-3 md:pt-2 shrink-0">
            <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          <Separator className="md:hidden" />
          <Separator orientation="vertical" className="hidden md:block h-auto" />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
            ) : (
              <div className="flex flex-col gap-6 md:gap-8">
                {/* Avatar */}
                <div className="flex flex-row items-center gap-4 md:gap-3 md:pt-2 shrink-0">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-muted shadow-md">
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={t('profile.avatarAlt')} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                      ) : null}
                      <div className={`${displayAvatar ? 'hidden' : ''} w-full h-full flex items-center justify-center bg-muted`}>
                        <User className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" />
                  </div>
                  <div className="text-left md:text-center min-w-0">
                    <p className="text-sm font-medium truncate">{formData.fullName || t('profile.userFallback')}</p>
                    <p className="text-xs text-muted-foreground truncate">{formData.email}</p>
                    {avatar && <span className="text-xs text-muted-foreground truncate block mt-1">{avatar.name}</span>}
                  </div>
                </div>

                <Separator className="md:hidden" />
                <Separator orientation="vertical" className="hidden md:block h-auto" />

                {/* Form fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">{t('profile.fields.fullName')}</Label>
                    <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder={t('profile.placeholders.fullName')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t('profile.fields.email')}</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange}
                      placeholder={t('profile.placeholders.email')} disabled={!canEditEmail} readOnly={!canEditEmail}
                      className={!canEditEmail ? 'opacity-60 cursor-not-allowed' : ''} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t('profile.fields.phone')}</Label>
                    <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder={t('profile.placeholders.phone')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="timezone">{t('profile.fields.timezone')}</Label>
                    <Select value={formData.timezone} onValueChange={(val) => handleSelectChange('timezone', val)}>
                      <SelectTrigger id="timezone"><SelectValue placeholder={t('profile.placeholders.timezone')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Berlin">Central Europe (CET/CEST)</SelectItem>
                        <SelectItem value="Europe/London">UK / Ireland (GMT/BST)</SelectItem>
                        <SelectItem value="Europe/Paris">France / Belgium (CET/CEST)</SelectItem>
                        <SelectItem value="Europe/Rome">Italy / Spain (CET/CEST)</SelectItem>
                        <SelectItem value="Europe/Helsinki">Finland / Estonia (EET/EEST)</SelectItem>
                        <SelectItem value="Europe/Moscow">Moscow (MSK)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">US Eastern (EST/EDT)</SelectItem>
                        <SelectItem value="America/Chicago">US Central (CST/CDT)</SelectItem>
                        <SelectItem value="America/Denver">US Mountain (MST/MDT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">US Pacific (PST/PDT)</SelectItem>
                        <SelectItem value="America/Sao_Paulo">Brazil (BRT)</SelectItem>
                        <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                        <SelectItem value="Asia/Dubai">Gulf (GST)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Japan (JST)</SelectItem>
                        <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                        <SelectItem value="Asia/Shanghai">China (CST)</SelectItem>
                        <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                        <SelectItem value="Pacific/Auckland">New Zealand (NZST/NZDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="department">{t('profile.fields.department')}</Label>
                    <Input id="department" name="department" value={formData.department} onChange={handleInputChange} placeholder={t('profile.placeholders.department')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="type">{t('profile.fields.type')}</Label>
                    <Select value={formData.type} onValueChange={(val) => handleSelectChange('type', val)}>
                      <SelectTrigger id="type"><SelectValue placeholder={t('profile.placeholders.type')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t('profile.types.admin')}</SelectItem>
                        <SelectItem value="user">{t('profile.types.user')}</SelectItem>
                        <SelectItem value="operator">{t('profile.types.operator')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="signature">{t('profile.fields.signature')}</Label>
                    <Input id="signature" name="signature" value={formData.signature} onChange={handleInputChange} placeholder={t('profile.placeholders.signature')} />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="easaOperatorCode">{t('profile.fields.easaOperatorCode')}</Label>
                    <Input id="easaOperatorCode" name="easaOperatorCode" value={formData.easaOperatorCode} onChange={handleInputChange} placeholder={t('profile.placeholders.easaOperatorCode')} />
                  </div>

                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <Button onClick={handleSubmit} disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700 cursor-pointer">
                      {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {saving ? t('profile.actions.updating') : t('profile.actions.update')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training curriculum card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{t('profile.curriculum.title')}</CardTitle>
              </div>
              <Badge variant="secondary">{curriculum.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <Skeleton className="h-4 w-32 sm:w-40" />
                    <Skeleton className="h-4 w-20 sm:w-24" />
                    <Skeleton className="h-4 w-16 sm:w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : curriculum.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('profile.curriculum.empty')}</p>
              </div>
            ) : (
              <>
                {curriculum.filter((r) => r.status === 'VALID' || r.status === null).length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('profile.curriculum.active')}</p>
                    </div>
                    <CurriculumTable rows={curriculum.filter((r) => r.status === 'VALID' || r.status === null)} formatDate={formatDate} t={t} />
                  </div>
                )}
                {curriculum.filter((r) => r.status === 'EXPIRED').length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('profile.curriculum.history')}</p>
                    </div>
                    <CurriculumTable rows={curriculum.filter((r) => r.status === 'EXPIRED')} formatDate={formatDate} t={t} muted />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
