'use client';

import DeleteOwnerDialog from '@/components/company/DeleteOwnerDialog';
import DataTable from '@/components/system/DataTable';
import { ownerColumns, OwnerData } from '@/components/tables/OwnerColumn';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function OwnersPage() {
  const { isDark } = useTheme();
  const router = useRouter();

  const [data, setData] = useState<OwnerData[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerData | null>(null);

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/owner');
      const json = res.data;
      if (json.code === 1) setData(json.data);
    } catch (err) {
      console.error('Failed to fetch owners', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleActivate = async (owner: OwnerData) => {
    try {
      const res = await axios.put(`/api/owner/${owner.owner_id}`, {
        owner_name: owner.owner_name,
        owner_legal_name: owner.owner_legal_name,
        owner_type: owner.owner_type,
        owner_address: owner.owner_address,
        owner_city: owner.owner_city,
        owner_state: owner.owner_state,
        owner_postal_code: owner.owner_postal_code,
        owner_phone: owner.owner_phone,
        owner_email: owner.owner_email,
        owner_website: owner.owner_website,
        owner_active: 'Y',
        drone_atc_enabled: owner.drone_atc_enabled,
        email_notifications_enabled: owner.email_notifications_enabled,
        easa_operator_code: owner.easa_operator_code,
        tax_id: owner.tax_id,
        registration_number: owner.registration_number,
        license_number: owner.license_number,
        license_expiry: owner.license_expiry,
      });
      if (res.data.code === 1) {
        toast.success(`${owner.owner_name} activated`);
        fetchOwners();
      } else {
        toast.error(res.data.message || 'Failed to activate company');
      }
    } catch {
      toast.error('Failed to activate company');
    }
  };

  const columns = useMemo(
    () =>
      ownerColumns({
        onOpen: (owner) => router.push(`/company/${owner.owner_id}`),
        onDelete: (owner) => {
          setSelectedOwner(owner);
          setDeleteOpen(true);
        },
        onActivate: handleActivate,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  );

  return (
    <div className="space-y-4">
      <div
        className={`top-0 z-10 backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-slate-900/80 border-b border-slate-800'
            : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
        } px-6 py-4`}
      >
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1
                className={`font-semibold text-base tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Company
              </h1>
              <p
                className={`text-xs ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Manage companies and their owners
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push('/company/new')}
            className={`h-8 gap-1.5 text-xs font-semibold shadow-sm ${
              isDark
                ? 'bg-white hover:bg-white/90 text-black'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            <Plus size={14} />
            <span>Add Company</span>
          </Button>
        </div>
      </div>

      <div className="px-6">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          exportFilename="companies"
        />
      </div>

      <DeleteOwnerDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedOwner(null);
        }}
        onSuccess={fetchOwners}
        owner={selectedOwner}
      />
    </div>
  );
}
