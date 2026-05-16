'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionUser } from '@/lib/auth/server-session';
import axios from 'axios';
import {
  Building2,
  Calendar,
  Camera,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../useTheme';

interface ClientInfo {
  client_name: string | null;
  client_legal_name: string | null;
  client_code: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_website: string | null;
  client_city: string | null;
  client_state: string | null;
  client_postal_code: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
}

export default function ClientProfilePage({ user }: { user: SessionUser }) {
  const { isDark } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [clientPhone, setClientPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios
      .get('/api/client-portal/profile')
      .then((res) => {
        if (res.data.success) {
          const u = res.data.user;
          setFullName(u.fullName || '');
          setEmail(u.email || '');
          if (u.avatar_url) setCurrentAvatarUrl(u.avatar_url);
        }
        if (res.data.client) {
          setClient(res.data.client);
          setClientPhone(res.data.client.client_phone || '');
        }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));

    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, or GIF allowed'); return;
    }
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('fullname', fullName);
    fd.append('email', email);
    fd.append('phone', '');
    fd.append('timezone', 'UTC');
    if (avatar) fd.append('avatar', avatar);
    try {
      const res = await axios.post('/api/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.updateResult) {
        toast.success('Profile updated');
        if (res.data.avatarUrl) { setCurrentAvatarUrl(res.data.avatarUrl); setAvatarPreview(null); setAvatar(null); }
        window.location.reload();
      } else {
        toast.error(res.data.message || 'Update failed');
      }
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhone(true);
    try {
      await axios.patch('/api/client-portal/profile', { client_phone: clientPhone.trim() });
      toast.success('Phone number updated');
      setClient((c) => c ? { ...c, client_phone: clientPhone.trim() } : c);
    } catch {
      toast.error('Failed to update phone number');
    } finally {
      setSavingPhone(false);
    }
  };

  const displayAvatar = avatarPreview || currentAvatarUrl;
  const sub = isDark ? 'text-slate-400' : 'text-slate-500';
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-1.5 rounded-md ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <Icon className={`h-3.5 w-3.5 ${sub}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-[10px] uppercase tracking-wider font-medium mb-0.5 ${sub}`}>{label}</p>
          <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b px-4 sm:px-6 py-4 flex items-center gap-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="w-1 h-6 rounded-full bg-violet-600" />
        <div>
          <h1 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>My Profile</h1>
          {!loading && <p className={`text-xs ${sub}`}>{fullName || email}</p>}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6 max-w-4xl">

        {/* Personal Info Card */}
        <Card className={card}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-violet-500" />
              <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((n) => (
                    <div key={n} className="space-y-1.5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSavePersonal} className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className={`w-20 h-20 rounded-full overflow-hidden border-2 shadow-md ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                      {displayAvatar ? (
                        <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <User className={`w-8 h-8 ${sub}`} />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md hover:bg-violet-700 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{fullName || user.username}</p>
                    <p className={`text-xs ${sub}`}>{email}</p>
                    <span className={`text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block font-medium ${isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                      Client
                    </span>
                  </div>
                </div>

                <Separator className={isDark ? 'bg-slate-700' : ''} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className={isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : ''}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      className={`opacity-60 cursor-not-allowed ${isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : ''}`}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card className={card}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-violet-500" />
              <CardTitle className="text-sm font-semibold">Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={user.username}
                  readOnly
                  disabled
                  className={`opacity-60 cursor-not-allowed font-mono ${isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : ''}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input
                  value="Client"
                  readOnly
                  disabled
                  className={`opacity-60 cursor-not-allowed ${isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : ''}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organisation Card */}
        {(loading || client) && (
          <Card className={card}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-500" />
                <CardTitle className="text-sm font-semibold">Organisation</CardTitle>
              </div>
              <p className={`text-xs mt-0.5 ${sub}`}>Managed by your ReADI administrator</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="flex items-start gap-3">
                      <Skeleton className="w-7 h-7 rounded-md shrink-0" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-2.5 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : client ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <InfoRow icon={Building2} label="Company Name" value={client.client_name} />
                    {client.client_legal_name && (
                      <InfoRow icon={Building2} label="Legal Name" value={client.client_legal_name} />
                    )}
                    {client.client_code && (
                      <InfoRow icon={Building2} label="Client Code" value={client.client_code} />
                    )}
                    <InfoRow icon={Mail} label="Contact Email" value={client.client_email} />
                    <InfoRow icon={Globe} label="Website" value={client.client_website} />
                    {(client.client_city || client.client_state) && (
                      <InfoRow
                        icon={MapPin}
                        label="Location"
                        value={[client.client_city, client.client_state, client.client_postal_code].filter(Boolean).join(', ')}
                      />
                    )}
                    {client.contract_start_date && (
                      <InfoRow
                        icon={Calendar}
                        label="Contract Period"
                        value={[
                          new Date(client.contract_start_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
                          client.contract_end_date
                            ? `→ ${new Date(client.contract_end_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}`
                            : null,
                        ].filter(Boolean).join(' ')}
                      />
                    )}
                  </div>

                  <Separator className={isDark ? 'bg-slate-700' : ''} />

                  {/* Editable phone */}
                  <form onSubmit={handleSavePhone}>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="clientPhone" className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> Contact Phone
                        </Label>
                        <Input
                          id="clientPhone"
                          type="tel"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+1 555 000 0000"
                          className={isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : ''}
                        />
                      </div>
                      <Button type="submit" disabled={savingPhone} className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shrink-0">
                        {savingPhone && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingPhone ? 'Saving…' : 'Update'}
                      </Button>
                    </div>
                  </form>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
