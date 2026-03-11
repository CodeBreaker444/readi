import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';

export interface DroneToolData {
  tool_id: number;
  tool_code: string;
  client_name: string;
  tool_status: string;
  tot_mission: number;
  tot_flown_time: number;
  tot_flown_meter: number;
  active: string;
  file_download_url?: string | null;
}

interface ColumnActions {
  onView: (toolId: number) => void;
  onUpdateStatus: (toolId: number) => void;
  onDelete: (toolId: number) => void;
  isDark: boolean;
}

export const systemCreateColumns = ({ 
  onView, 
  onUpdateStatus, 
  onDelete, 
  isDark 
}: ColumnActions): ColumnDef<DroneToolData>[] => {
  const textClass = isDark ? 'text-gray-200' : 'text-black';

  return [
    {
      header: () => <span className={isDark ? 'text-gray-100' : ''}>Tool Code</span>,
      accessorKey: 'tool_code',
      cell: ({ getValue }) => <span className={textClass}>{getValue() as string}</span>,
    },
    {
      header: () => <span className={isDark ? 'text-gray-100' : ''}>Client</span>,
      accessorKey: 'client_name',
      cell: ({ getValue }) => <span className={textClass}>{getValue() as string}</span>,
    },
    {
      header: () => <span className={isDark ? 'text-gray-100' : ''}>Status</span>,
      accessorKey: 'tool_status',
      cell: ({ row }) => {
        const status = row.original.tool_status;
        
        const statusStyles: Record<string, string> = {
          OPERATIONAL: isDark 
            ? 'bg-green-950 text-green-400 border border-green-800' 
            : 'bg-green-100 text-green-800',
          MAINTENANCE: isDark 
            ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' 
            : 'bg-yellow-100 text-yellow-800',
          NOT_OPERATIONAL: isDark 
            ? 'bg-red-950 text-red-400 border border-red-800' 
            : 'bg-red-100 text-red-800',
        };

        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        );
      },
    },
    {
      header: () => <span className={isDark ? 'text-gray-100' : ''}>Total Missions</span>,
      accessorKey: 'tot_mission',
      cell: ({ getValue }) => <span className={textClass}>{getValue() as number}</span>,
    },
    {
      header: () => <span className={isDark ? 'text-gray-100' : ''}>Flight Time (min)</span>,
      accessorKey: 'tot_flown_time',
      cell: ({ row }) => (
        <span className={textClass}>
          {Math.round(row.original.tot_flown_time / 60)}
        </span>
      ),
    },
    {
      header: () => <span className={isDark ? 'text-gray-100' : ''}>Distance (km)</span>,
      accessorKey: 'tot_flown_meter',
      cell: ({ row }) => (
        <span className={textClass}>
          {(row.original.tot_flown_meter / 1000).toFixed(2)}
        </span>
      ),
    },
    {
      header: () => <span className={isDark ? 'text-gray-100' : ''}>Active</span>,
      accessorKey: 'active',
      cell: ({ row }) => {
        const isActive = row.original.active === 'Y';
        const activeClass = isDark
          ? isActive ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-red-950 text-red-400 border border-red-800'
          : isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${activeClass}`}>
            {isActive ? 'Yes' : 'No'}
          </span>
        );
      },
    },
    {
      header: () => <span className={isDark ? 'text-gray-100' : ''}>File</span>,
      accessorKey: 'file_download_url',
      cell: ({ row }) => {
        const url = row.original.file_download_url;
        if (!url) return <span className="text-xs text-gray-400">—</span>;
        return (
          <Button
            size="sm"
            variant="outline"
            className={isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
            onClick={() => window.open(url, '_blank')}
          >
            Download
          </Button>
        );
      },
    },
    {
      header: () => <span className={isDark ? 'text-gray-100' : ''}>Actions</span>,
      accessorKey: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className={isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
            onClick={() => onView(row.original.tool_id)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
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
};