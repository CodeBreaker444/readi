import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';

export interface OwnerData {
  owner_id: number;
  owner_code: string;
  owner_name: string;
  owner_legal_name: string | null;
  owner_type: string | null;
  owner_address: string | null;
  owner_city: string | null;
  owner_state: string | null;
  owner_postal_code: string | null;
  owner_phone: string | null;
  owner_email: string;
  owner_website: string;
  owner_active: string;
  tax_id: string | null;
  registration_number: string | null;
  license_number: string | null;
  license_expiry: string | null;
  created_at: string;
  admin_user?: {
    user_id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    user_active: string;
  } | null;
}

interface OwnerColumnActions {
  onView: (owner: OwnerData) => void;
  onEdit: (owner: OwnerData) => void;
  onDelete: (owner: OwnerData) => void;
}

export const ownerColumns = ({ onView, onEdit, onDelete }: OwnerColumnActions): ColumnDef<OwnerData>[] => [
  {
    header: 'Code',
    accessorKey: 'owner_code',
  },
  {
    header: 'Name',
    accessorKey: 'owner_name',
  },
  {
    header: 'Email',
    accessorKey: 'owner_email',
  },
  {
    header: 'Phone',
    accessorKey: 'owner_phone',
    cell: ({ row }) => row.original.owner_phone || '—',
  },
  {
    header: 'Admin',
    id: 'admin_user',
    cell: ({ row }) => {
      const admin = row.original.admin_user;
      if (!admin) return <span className="text-muted-foreground text-xs">No admin</span>;
      return (
        <div className="text-xs">
          <p className="font-medium">{admin.first_name} {admin.last_name}</p>
          <p className="text-muted-foreground">{admin.email}</p>
        </div>
      );
    },
  },
  {
    header: 'Status',
    accessorKey: 'owner_active',
    cell: ({ row }) => (
      <span
        className={`rounded px-2 py-1 text-xs ${
          row.original.owner_active === 'Y'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {row.original.owner_active === 'Y' ? 'Active' : 'Disabled'}
      </span>
    ),
  },
  {
    header: 'Actions',
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" className="bg-black text-white hover:bg-black/80" onClick={() => onView(row.original)}>
          View
        </Button>
        <Button size="sm" className="bg-black text-white hover:bg-black/80" onClick={() => onEdit(row.original)}>
          Edit
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(row.original)}>
          Delete
        </Button>
      </div>
    ),
  },
];