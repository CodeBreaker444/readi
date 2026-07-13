'use client';

import { UserForm } from '@/components/user/UserForm';
import { useTheme } from '@/components/useTheme';
import { getUserSession } from '@/lib/auth/server-session';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CreateUserPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [clients, setClients] = useState<{ client_id: number; client_name: string }[]>([]);
  const [owners, setOwners] = useState<{ owner_id: number; owner_name: string }[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canEditEmail, setCanEditEmail] = useState(true);
  const [sessionRole, setSessionRole] = useState<string | undefined>(undefined);
  const [flytrelayEnabled, setFlytrelayEnabled] = useState(false);
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
        const res = await axios.get('/api/client/list');
        if (res.data.code === 1 && res.data.data) setClients(res.data.data);
      } catch { /* non-critical */ }

      if (superAdmin) {
        try {
          const res = await axios.get('/api/owner');
          if (res.data.code === 1 && res.data.data) setOwners(res.data.data);
        } catch { /* non-critical */ }
      }

      setReady(true);
    })();
  }, []);

  const handleSubmit = async (formData: any) => {
    try {
      const res = await axios.post('/api/team/user/add', {
        username: formData.username,
        fullname: formData.fullname,
        email: formData.email,
        phone: formData.phone || '',
        fk_client_id: formData.fk_client_id,
        profile: formData.fk_user_profile_id,
        ownerTerritorialUnit: 0,
        user_type: formData.user_type,
        user_manager: formData.is_manager,
        timezone: 'Europe/Berlin',
        flytrelay_access: formData.flytrelay_access,
        ...(isSuperAdmin && { owner_id: formData.owner_id }),
      });
      const data = res.data;
      if (data.code !== 1) {
        toast.error(data.error || 'Failed to create user');
        return;
      }

      if (formData.permissions?.useCustom && data.newId) {
        try {
          await axios.patch(`/api/permissions/user/${data.newId}`, formData.permissions);
        } catch {
          toast.warning('User created but custom permissions could not be saved. You can set them from the edit page.');
        }
      }
      if (formData.ccToken && formData.ccOrgId && data.newId) {
        try {
          await axios.post('/api/team/user/control-center-token', {
            user_id: data.newId,
            token: formData.ccToken,
            orgId: formData.ccOrgId,
            tokenName: formData.ccTokenName || undefined,
          });
        } catch {
          toast.warning('User created but Control Center token could not be linked.');
        }
      }
      if (formData.grant_pic_technician && data.newId) {
        try {
          await axios.post('/api/team/user/subrole', {
            user_id: data.newId,
            subrole: 'PIC_TECHNICIAN',
            action: 'grant',
          });
        } catch {
          toast.warning('User created but PIC-Technician sub-role could not be granted.');
        }
      }

      toast.success('User created successfully');
      router.push('/team/personnel');
    } catch (err: any) {
      const responseData = err?.response?.data;
      if (responseData?.status === 'PENDING_ACTIVATION') {
        toast.error(responseData.error_list?.[0] || responseData.message, {
          description: 'Find the user in the list and click the resend invite button.',
          duration: 6000,
        });
        return;
      }
      const msg = responseData?.error_list?.[0] || responseData?.message || 'Failed to create user';
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('email')) return { fieldErrors: { email: msg } as Record<string, string> };
      if (lowerMsg.includes('username')) return { fieldErrors: { username: msg } as Record<string, string> };
      toast.error(msg);
    }
  };

  if (!ready) return null;

  return (
    <UserForm
      mode="add"
      clients={clients}
      owners={owners}
      isSuperAdmin={isSuperAdmin}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/team/personnel')}
      isDark={isDark}
      canEditEmail={canEditEmail}
      sessionRole={sessionRole}
      companyFlytrelayEnabled={flytrelayEnabled}
    />
  );
}
