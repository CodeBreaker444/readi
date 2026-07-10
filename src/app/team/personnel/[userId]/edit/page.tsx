'use client';

import { UserForm } from '@/components/user/UserForm';
import { useTheme } from '@/components/useTheme';
import { getUserSession } from '@/lib/auth/server-session';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);
  const { isDark } = useTheme();
  const [clients, setClients] = useState<{ client_id: number; client_name: string }[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canEditEmail, setCanEditEmail] = useState(true);
  const [sessionRole, setSessionRole] = useState<string | undefined>(undefined);
  const [flytrelayEnabled, setFlytrelayEnabled] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getUserSession();
      if (!session) return;
      const superAdmin = session.user.role === 'SUPERADMIN';
      setIsSuperAdmin(superAdmin);
      setCanEditEmail(session.user.role === 'ADMIN' || superAdmin);
      setSessionRole(session.user.role);
      setFlytrelayEnabled(session.user.flytrelayEnabled);

      try {
        const clientsRes = await axios.get('/api/client/list');
        if (clientsRes.data.code === 1 && clientsRes.data.data) setClients(clientsRes.data.data);
      } catch { /* non-critical */ }

      try {
        const listRes = await fetch('/api/team/user/list', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
        });
        const listData = await listRes.json();
        const found = (listData.data ?? []).find((u: any) => u.user_id === userId);
        if (!found) {
          toast.error('User not found');
          router.replace('/team/personnel');
          return;
        }
        setUserData(found);
      } catch {
        toast.error('Failed to load user');
        router.replace('/team/personnel');
        return;
      }

      setReady(true);
    })();
  }, [userId]);

  const handleSubmit = async (formData: any) => {
    try {
      const res = await axios.post('/api/team/user/update', {
        user_id: formData.user_id,
        fullname: formData.fullname,
        email: formData.email,
        phone: formData.phone,
        fk_user_profile_id: formData.fk_user_profile_id,
        fk_client_id: formData.fk_client_id || null,
        user_type: formData.user_type,
        active: formData.active,
        is_manager: formData.is_manager,
        flytrelay_access: formData.flytrelay_access,
      });
      const data = res.data;
      if (data.code !== 1) {
        toast.error(data.error || 'Failed to update user');
        return;
      }

      if (formData.permissions) {
        try {
          await axios.patch(`/api/permissions/user/${formData.user_id}`, formData.permissions);
        } catch {
          toast.warning('User updated but permissions could not be saved.');
        }
      }

      toast.success('User updated successfully');
      router.push('/team/personnel');
    } catch {
      toast.error('Failed to update user');
    }
  };

  if (!ready || !userData) return null;

  return (
    <UserForm
      mode="edit"
      clients={clients}
      isSuperAdmin={isSuperAdmin}
      userData={userData}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/team/personnel')}
      isDark={isDark}
      canEditEmail={canEditEmail}
      sessionRole={sessionRole}
      companyFlytrelayEnabled={flytrelayEnabled}
    />
  );
}
