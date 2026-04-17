'use client';
import { SessionUser } from '@/lib/auth/server-session';
import axios from 'axios';
import { Award, Camera, Loader2, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface Qualification {
  qualification_id: number;
  qualification_name: string;
  qualification_type: string;
  description: string | null;
  start_date: string | null;
  expiry_date: string | null;
  status: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  userData: SessionUser | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  isDark,
  userData,
}) => {
  const { t } = useTranslation();
  const canEditEmail =
    userData?.role === 'ADMIN' || userData?.role === 'SUPERADMIN';

  const [formData, setFormData] = useState({
    fullName: userData?.fullname || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    timezone: '',
    department: 'Global',
    client: '',
    profile: '',
    type: '',
    signature: '',
  });
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(
    userData?.avatar ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    }
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [isOpen]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, qualsRes] = await Promise.all([
        axios.get('/api/profile'),
        userData?.userId
          ? axios
              .get(
                `/api/team/user/qualifications?user_id=${userData.userId}`
              )
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      const data = profileRes.data;
      if (data.success) {
        setFormData({
          fullName: data.user.fullName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          timezone: data.user.user_timezone || 'IST',
          department: 'Global',
          client: '',
          profile: '',
          type: data.user.user_type || '',
          signature: data.user.users_profile?.user_signature || '',
        });
        if (data.user.avatar_url) {
          setCurrentAvatarUrl(data.user.avatar_url);
        }
      }

      if (qualsRes?.data?.data) {
        setQualifications(qualsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(t('profile.errors.load'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('profile.errors.avatarSize'));
        return;
      }
      if (
        !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
          file.type
        )
      ) {
        toast.error(t('profile.errors.avatarFormat'));
        return;
      }

      setAvatar(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const formDataToSend = new FormData();
    formDataToSend.append('fullname', formData.fullName);
    formDataToSend.append('email', formData.email);
    formDataToSend.append('phone', formData.phone);
    formDataToSend.append('timezone', formData.timezone);

    if (avatar) {
      formDataToSend.append('avatar', avatar);
    }

    try {
      const response = await axios.post('/api/profile', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data;

      if (result.updateResult) {
        toast.success(t('profile.success.updated'));
        if (result.avatarUrl) {
          setCurrentAvatarUrl(result.avatarUrl);
          setAvatarPreview(null);
          setAvatar(null);
        }
        onClose();
        window.location.reload();
      } else {
        toast.error(result.message || t('profile.errors.update'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('profile.errors.update'));
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarPreview || currentAvatarUrl;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-6xl lg:max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b">
          <DialogTitle className="text-base sm:text-lg font-semibold truncate">
            {t('profile.title')}:{' '}
            {userData?.fullname || userData?.username || t('profile.unknownUser')}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                <div className="flex flex-row md:flex-col items-center gap-4 md:gap-3 md:pt-2 shrink-0">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-muted shadow-md">
                      {displayAvatar ? (
                        <img
                          src={displayAvatar}
                          alt={t('profile.avatarAlt')}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              'none';
                            (
                              e.target as HTMLImageElement
                            ).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`${displayAvatar ? 'hidden' : ''} w-full h-full flex items-center justify-center bg-muted`}
                      >
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                    />
                  </div>
                  <div className="text-left md:text-center min-w-0">
                    <p className="text-sm font-medium truncate">
                      {formData.fullName || t('profile.userFallback')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formData.email}
                    </p>
                    {avatar && (
                      <span className="text-xs text-muted-foreground truncate block mt-1">
                        {avatar.name}
                      </span>
                    )}
                  </div>
                </div>

                <Separator className="md:hidden" />
                <Separator orientation="vertical" className="hidden md:block h-auto" />

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">{t('profile.fields.fullName')}</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder={t('profile.placeholders.fullName')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t('profile.fields.email')}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={t('profile.placeholders.email')}
                      disabled={!canEditEmail}
                      readOnly={!canEditEmail}
                      className={!canEditEmail ? 'opacity-60 cursor-not-allowed' : ''}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t('profile.fields.phone')}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={t('profile.placeholders.phone')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="timezone">{t('profile.fields.timezone')}</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(val) => handleSelectChange('timezone', val)}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder={t('profile.placeholders.timezone')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="EST">EST</SelectItem>
                        <SelectItem value="PST">PST</SelectItem>
                        <SelectItem value="IST">IST</SelectItem>
                        <SelectItem value="CET">CET</SelectItem>
                        <SelectItem value="GMT">GMT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="department">{t('profile.fields.department')}</Label>
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder={t('profile.placeholders.department')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="type">{t('profile.fields.type')}</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(val) => handleSelectChange('type', val)}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder={t('profile.placeholders.type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t('profile.types.admin')}</SelectItem>
                        <SelectItem value="user">{t('profile.types.user')}</SelectItem>
                        <SelectItem value="operator">{t('profile.types.operator')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label htmlFor="signature">{t('profile.fields.signature')}</Label>
                    <Input
                      id="signature"
                      name="signature"
                      value={formData.signature}
                      onChange={handleInputChange}
                      placeholder={t('profile.placeholders.signature')}
                    />
                  </div>

                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <Button
                      onClick={handleSubmit}
                      disabled={saving}
                      className="w-full bg-violet-600 hover:bg-violet-700 cursor-pointer"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {saving ? t('profile.actions.updating') : t('profile.actions.update')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{t('profile.qualifications.title')}</CardTitle>
                </div>
                <Badge variant="secondary">{qualifications.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <Skeleton className="h-4 w-32 sm:w-40" />
                      <Skeleton className="h-4 w-20 sm:w-24" />
                      <Skeleton className="h-4 w-16 sm:w-20" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : qualifications.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('profile.qualifications.empty')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {qualifications.map((q) => {
                      const today = new Date();
                      const expired = q.expiry_date
                        ? new Date(q.expiry_date) < today
                        : false;
                      const isActive = q.status === 'Active' && !expired;

                      return (
                        <div
                          key={q.qualification_id}
                          className="rounded-lg border p-3.5 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {q.qualification_name}
                              </p>
                              {q.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {q.description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={isActive ? 'default' : 'destructive'}
                              className={
                                isActive
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0'
                                  : 'shrink-0'
                              }
                            >
                              {expired ? t('profile.qualifications.expired') : q.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                q.qualification_type === 'Certification'
                                  ? 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'
                                  : 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300'
                              }
                            >
                              {q.qualification_type}
                            </Badge>
                            {q.start_date && (
                              <span className="text-xs text-muted-foreground">
                                {t('profile.qualifications.from')}: {formatDate(q.start_date)}
                              </span>
                            )}
                            {q.expiry_date && (
                              <span
                                className={`text-xs ${
                                  expired
                                    ? 'text-destructive font-medium'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {t('profile.qualifications.expires')}: {formatDate(q.expiry_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden md:block rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('profile.qualifications.headers.qualification')}</TableHead>
                          <TableHead>{t('profile.qualifications.headers.type')}</TableHead>
                          <TableHead>{t('profile.qualifications.headers.startDate')}</TableHead>
                          <TableHead>{t('profile.qualifications.headers.expiryDate')}</TableHead>
                          <TableHead className="text-right">{t('profile.qualifications.headers.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {qualifications.map((q) => {
                          const today = new Date();
                          const expired = q.expiry_date
                            ? new Date(q.expiry_date) < today
                            : false;
                          const isActive = q.status === 'Active' && !expired;

                          return (
                            <TableRow key={q.qualification_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">
                                    {q.qualification_name}
                                  </p>
                                  {q.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {q.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    q.qualification_type === 'Certification'
                                      ? 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'
                                      : 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300'
                                  }
                                >
                                  {q.qualification_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {q.start_date ? formatDate(q.start_date) : t('profile.qualifications.none')}
                              </TableCell>
                              <TableCell
                                className={`text-sm ${
                                  expired
                                    ? 'text-destructive font-medium'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {q.expiry_date
                                  ? formatDate(q.expiry_date)
                                  : t('profile.qualifications.none')}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant={isActive ? 'default' : 'destructive'}
                                  className={
                                    isActive
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : ''
                                  }
                                >
                                  {expired ? t('profile.qualifications.expired') : q.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;