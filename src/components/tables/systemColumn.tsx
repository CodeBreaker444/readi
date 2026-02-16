// src/components/system/drone-tool/columns.tsx
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';

export interface DroneToolData {
  tool_id: number;
  tool_code: string;
  tool_serialnumber: string;
  factory_model: string;
  factory_type: string;
  client_name: string;
  tool_status: string;
  tot_mission: number;
  tot_flown_time: number;
  tot_flown_meter: number;
  active: string;
}

interface ColumnActions {
  onView: (toolId: number) => void;
  onUpdateStatus: (toolId: number) => void;
  onDelete: (toolId: number) => void;
}

export const systemCreateColumns = ({ onView, onUpdateStatus, onDelete }: ColumnActions): ColumnDef<DroneToolData>[] => [
  {
    header: 'Tool Code',
    accessorKey: 'tool_code',
  },
  {
    header: 'Serial Number',
    accessorKey: 'tool_serialnumber',
  },
  {
    header: 'Model',
    accessorKey: 'factory_model',
  },
  {
    header: 'Manufacturer',
    accessorKey: 'factory_type',
  },
  {
    header: 'Client',
    accessorKey: 'client_name',
  },
  {
    header: 'Status',
    accessorKey: 'tool_status',
    cell: ({ row }) => (
      <span className={`px-2 py-1 rounded text-xs ${
        row.original.tool_status === 'OPERATIONAL' ? 'bg-green-100 text-green-800' :
        row.original.tool_status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
        row.original.tool_status === 'NOT_OPERATIONAL' ? 'bg-red-100 text-red-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {row.original.tool_status}
      </span>
    ),
  },
  {
    header: 'Total Missions',
    accessorKey: 'tot_mission',
  },
  {
    header: 'Flight Time (min)',
    accessorKey: 'tot_flown_time',
    cell: ({ row }) => Math.round(row.original.tot_flown_time / 60),
  },
  {
    header: 'Distance (km)',
    accessorKey: 'tot_flown_meter',
    cell: ({ row }) => (row.original.tot_flown_meter / 1000).toFixed(2),
  },
  {
    header: 'Active',
    accessorKey: 'active',
    cell: ({ row }) => (
      <span className={`px-2 py-1 rounded text-xs ${
        row.original.active === 'Y' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {row.original.active === 'Y' ? 'Yes' : 'No'}
      </span>
    ),
  },
  {
    header: 'Actions',
    accessorKey: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onView(row.original.tool_id)}
        >
          View
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdateStatus(row.original.tool_id)}
        >
          Status
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(row.original.tool_id)}
        >
          Delete
        </Button>
      </div>
    ),
  },
];