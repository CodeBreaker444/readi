'use client';

import AddOwnerModal from '@/components/company/AddOwnerModal';
import DeleteOwnerDialog from '@/components/company/DeleteOwnerDialog';
import EditOwnerModal from '@/components/company/EditOwnerModal';
import ViewOwnerModal from '@/components/company/ViewOwnerModal';
import DataTable from '@/components/system/DataTable';
import { ownerColumns, OwnerData } from '@/components/tables/OwnerColumn';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';

export default function OwnersPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<OwnerData[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  const columns = useMemo(
    () =>
      ownerColumns({
        onView: (owner) => {
          setSelectedOwner(owner);
          setViewOpen(true);
        },
        onEdit: (owner) => {
          setSelectedOwner(owner);
          setEditOpen(true);
        },
        onDelete: (owner) => {
          setSelectedOwner(owner);
          setDeleteOpen(true);
        },
      }),
    []
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
            onClick={() => setAddOpen(true)}
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
        <DataTable columns={columns} data={data} loading={loading} exportFilename="companies" />
      </div>

      <AddOwnerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={fetchOwners}
      />

      <ViewOwnerModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setSelectedOwner(null);
        }}
        owner={selectedOwner}
      />

      <EditOwnerModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedOwner(null);
        }}
        onSuccess={fetchOwners}
        owner={selectedOwner}
      />

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