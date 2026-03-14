import { SystemFile } from '@/components/system/FilesDownloadModal';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { FileDown, Paperclip } from 'lucide-react';

export interface DroneToolData {
    tool_id: number;
    tool_code: string;
    client_name: string;
    tool_status: string;
    tot_mission: number;
    tot_flown_time: number;
    tot_flown_meter: number;
    active: string;
    files: SystemFile[];
    file_count: number;
    file_download_url?: string | null;
}

interface ColumnActions {
    onView: (toolId: number) => void;
    onDelete: (toolId: number) => void;
    onEditSystem: (tool: DroneToolData) => void;
    onViewFiles: (tool: DroneToolData) => void;
    isDark: boolean;
}


export const systemCreateColumns = ({
    onView,
    onDelete,
    onEditSystem,
    onViewFiles,
    isDark,
}: ColumnActions): ColumnDef<DroneToolData>[] => {
    const textClass = isDark ? 'text-gray-200' : 'text-black';

    return [
        {
            header: () => <span className={isDark ? 'text-gray-100' : ''}>Tool Code</span>,
            accessorKey: 'tool_code',
            cell: ({ getValue }) => (
                <span className={textClass}>{getValue() as string}</span>
            ),
        },
        {
            header: () => <span className={isDark ? 'text-gray-100' : ''}>Client</span>,
            accessorKey: 'client_name',
            cell: ({ getValue }) => (
                <span className={textClass}>{getValue() as string}</span>
            ),
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
                    <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                            statusStyles[status] || 'bg-gray-100 text-gray-800'
                        }`}
                    >
                        {status}
                    </span>
                );
            },
        },
        {
            header: () => (
                <span className={isDark ? 'text-gray-100' : ''}>Total Missions</span>
            ),
            accessorKey: 'tot_mission',
            cell: ({ getValue }) => (
                <span className={textClass}>{getValue() as number}</span>
            ),
        },
        {
            header: () => <span className={isDark ? 'text-gray-100' : ''}>Active</span>,
            accessorKey: 'active',
            cell: ({ row }) => {
                const isActive = row.original.active === 'Y';
                const activeClass = isDark
                    ? isActive
                        ? 'bg-green-950 text-green-400 border border-green-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    : isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800';
                return (
                    <span
                        className={`px-2 py-1 rounded text-xs font-medium ${activeClass}`}
                    >
                        {isActive ? 'Yes' : 'No'}
                    </span>
                );
            },
        },

        {
            id: 'files',
            header: () => <span className={isDark ? 'text-gray-100' : ''}>Files</span>,
            cell: ({ row }) => {
                const count = row.original.file_count ?? 0;
                const hasFiles = count > 0;

                return (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewFiles(row.original)}
                        className={`h-7 px-2.5 text-xs gap-1.5 ${
                            isDark
                                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                                : hasFiles
                                ? 'border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100'
                                : 'border-gray-200 text-gray-400'
                        }`}
                    >
                        {hasFiles ? (
                            <FileDown className="w-3 h-3" />
                        ) : (
                            <Paperclip className="w-3 h-3 opacity-40" />
                        )}
                        {hasFiles ? (
                            <>
                                Files{' '}
                                <span
                                    className={`inline-flex items-center justify-center rounded-full w-4 h-4 text-[10px] font-semibold ${
                                        isDark
                                            ? 'bg-slate-600 text-slate-200'
                                            : 'bg-violet-200 text-violet-800'
                                    }`}
                                >
                                    {count}
                                </span>
                            </>
                        ) : (
                            'No files'
                        )}
                    </Button>
                );
            },
        },

        {
            id: 'actions',
            header: () => (
                <span className={isDark ? 'text-gray-100' : ''}>Actions</span>
            ),
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className={
                            isDark
                                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                                : ''
                        }
                        onClick={() => onView(row.original.tool_id)}
                    >
                        View
                    </Button>
                    
                    <Button
                        size="sm"
                        variant="outline"
                        className={
                            isDark
                                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                                : ''
                        }
                        onClick={() => onEditSystem(row.original)}
                    >
                        Edit
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


interface ModelColumnProps {
  isDark: boolean;
  onEdit: (id: number) => void;
  onDelete: (id: number, name: string) => void;
}

export const getModelColumns = ({ isDark, onEdit, onDelete }: ModelColumnProps): ColumnDef<any>[] => {
  const text = isDark ? 'text-gray-200' : 'text-black';
  const hd = isDark ? 'text-gray-100' : '';

  return [
    {
      header: () => <span className={hd}>Manufacturer</span>,
      accessorKey: 'factory_type',
      cell: ({ getValue }) => <span className={text}>{getValue() as string}</span>,
    },
    {
      header: () => <span className={hd}>Model Code</span>,
      accessorKey: 'factory_serie',
      cell: ({ getValue }) => <span className={text}>{getValue() as string}</span>,
    },
    {
      header: () => <span className={hd}>Model Name</span>,
      accessorKey: 'factory_model',
      cell: ({ getValue }) => <span className={text}>{getValue() as string}</span>,
    },
    {
      header: () => <span className={hd}>Type</span>,
      accessorKey: 'model_type',
      cell: ({ getValue }) => {
        const val = getValue() as string;
        return val ? (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{val}</span>
        ) : <span className="text-slate-400 text-xs">—</span>;
      },
    },
    {
      id: 'actions',
      header: () => <span className={hd}>Actions</span>,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline"
            className={isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
            onClick={() => onEdit(row.original.tool_model_id)}>
            Edit
          </Button>
          <Button size="sm" variant="destructive"
            onClick={() => onDelete(row.original.tool_model_id, `${row.original.factory_type} ${row.original.factory_model}`)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];
};

interface ComponentColumnProps {
  isDark: boolean;
  toolCodeMap: Record<number, string>;
  onEdit: (id: number) => void;
  onDelete: (id: number, name: string) => void;
}

export const getComponentColumns = ({ isDark, toolCodeMap, onEdit, onDelete }: ComponentColumnProps): ColumnDef<any>[] => {
  const text = isDark ? 'text-gray-200' : 'text-black';
  const hd = isDark ? 'text-gray-100' : '';

  return [
    {
      header: () => <span className={hd}>Type</span>,
      accessorKey: 'component_type',
      cell: ({ getValue }) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
          {getValue() as string}
        </span>
      ),
    },
    {
      header: () => <span className={hd}>Code</span>,
      accessorKey: 'component_code',
      cell: ({ getValue }) => <span className={text}>{(getValue() as string) || '—'}</span>,
    },
    {
      header: () => <span className={hd}>Name</span>,
      accessorKey: 'component_name',
      cell: ({ getValue }) => <span className={text}>{(getValue() as string) || '—'}</span>,
    },
    {
      header: () => <span className={hd}>Serial No.</span>,
      accessorKey: 'component_sn',
      cell: ({ getValue }) => <span className={text}>{(getValue() as string) || '—'}</span>,
    },
    {
      header: () => <span className={hd}>System</span>,
      accessorKey: 'fk_tool_id',
      cell: ({ getValue }) => {
        const code = toolCodeMap[getValue() as number];
        return code ? (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-violet-900/40 text-violet-300' : 'bg-violet-50 text-violet-700'}`}>{code}</span>
        ) : <span className="text-slate-400 text-xs">—</span>;
      },
    },
    {
      header: () => <span className={hd}>Status</span>,
      accessorKey: 'component_status',
      cell: ({ getValue }) => {
        const s = getValue() as string;
        const cls: Record<string, string> = {
          OPERATIONAL: isDark ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-green-100 text-green-800',
          MAINTENANCE: isDark ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' : 'bg-yellow-100 text-yellow-800',
          NOT_OPERATIONAL: isDark ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-red-100 text-red-800',
          DECOMMISSIONED: isDark ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-600',
        };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls[s] || ''}`}>{s}</span>;
      },
    },
    {
      id: 'actions',
      header: () => <span className={hd}>Actions</span>,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline"
            className={isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
            onClick={() => onEdit(row.original.tool_component_id)}>
            Edit
          </Button>
          <Button size="sm" variant="destructive"
            onClick={() => onDelete(
              row.original.tool_component_id,
              row.original.component_code || row.original.component_name || `#${row.original.tool_component_id}`
            )}>
            Delete
          </Button>
        </div>
      ),
    },
  ];
};