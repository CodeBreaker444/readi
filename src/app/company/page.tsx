'use client';

import AddOwnerModal from '@/components/company/AddOwnerModal';
import DeleteOwnerDialog from '@/components/company/DeleteOwnerDialog';
import EditOwnerModal from '@/components/company/EditOwnerModal';
import ViewOwnerModal from '@/components/company/ViewOwnerModal';
import DataTable from '@/components/system/DataTable';
import { ownerColumns, OwnerData } from '@/components/tables/OwnerColumn';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

export default function OwnersPage() {
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
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Company</h1>
        <Button
          className="bg-black text-white hover:bg-black/80"
          onClick={() => setAddOpen(true)}
        >
          + Add Company
        </Button>
      </div>

      <DataTable columns={columns} data={data} loading={loading} />

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