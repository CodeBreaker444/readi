'use client';

import { DroneToolData } from '@/components/tables/SystemColumn';
import { TablePagination } from '@/components/tables/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronRight, GitBranch } from 'lucide-react';
import { Fragment } from 'react';
import { useMemo, useState } from 'react';

function formatFlightTime(minutes: number): string {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(meters: number): string {
  if (!meters) return '0 m';
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

interface ComponentRow {
  tool_component_id: number;
  fk_tool_id: number | null;
  system_detached?: boolean;
  fk_parent_component_id?: number | null;
  component_type?: string | null;
  component_desc?: string | null;
  component_code?: string | null;
  component_name?: string | null;
  component_sn?: string | null;
  component_status?: string | null;
  current_maintenance_flights?: number;
  current_usage_hours?: number;
  current_maintenance_hours?: number;
  current_maintenance_days?: number;
}

interface SystemComponentsTableProps {
  systems: DroneToolData[];
  components: ComponentRow[];
  loading?: boolean;
  onViewSystem: (toolId: number) => void;
  onEditSystem: (tool: DroneToolData) => void;
  onDeleteSystem: (toolId: number) => void;
  onViewFiles: (tool: DroneToolData) => void;
  onViewComponent: (row: ComponentRow) => void;
  onEditComponent: (componentId: number) => void;
  onDeleteComponent: (componentId: number, componentName: string) => void;
  onLogComponent: (row: ComponentRow) => void;
  onFlightLogsComponent: (row: ComponentRow) => void;
  onOpenRelations: (toolId: number, toolCode: string) => void;
}

function StatusPill({ status }: { status?: string | null }) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>;
  const cls: Record<string, string> = {
    OPERATIONAL: 'bg-green-100 text-green-800',
    MAINTENANCE: 'bg-yellow-100 text-yellow-800',
    NOT_OPERATIONAL: 'bg-red-100 text-red-800',
    DECOMMISSIONED: 'bg-slate-200 text-slate-700',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}

export default function SystemComponentsTable({
  systems,
  components,
  loading = false,
  onViewSystem,
  onEditSystem,
  onDeleteSystem,
  onViewFiles,
  onViewComponent,
  onEditComponent,
  onDeleteComponent,
  onLogComponent,
  onFlightLogsComponent,
  onOpenRelations,
}: SystemComponentsTableProps) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const componentsBySystem = useMemo(() => {
    const map: Record<number, ComponentRow[]> = {};
    components.forEach((c) => {
      if (!c.fk_tool_id || c.system_detached) return;
      if (!map[c.fk_tool_id]) map[c.fk_tool_id] = [];
      map[c.fk_tool_id].push(c);
    });
    return map;
  }, [components]);

  const componentCountBySystem = useMemo(() => {
    const map: Record<number, number> = {};
    components.forEach((c) => {
      if (!c.fk_tool_id) return;
      map[c.fk_tool_id] = (map[c.fk_tool_id] ?? 0) + 1;
    });
    return map;
  }, [components]);

  const getHierarchy = (systemComponents: ComponentRow[]) => {
    const byId = new Map<number, ComponentRow>();
    systemComponents.forEach((c) => byId.set(c.tool_component_id, c));

    const roots: ComponentRow[] = [];
    systemComponents.forEach((c) => {
      const parentId = c.fk_parent_component_id ?? null;
      if (!parentId || !byId.has(parentId)) roots.push(c);
    });

    const childrenOf = (parentId: number) =>
      systemComponents.filter((c) => (c.fk_parent_component_id ?? null) === parentId);

    const ordered: Array<{ comp: ComponentRow; level: number }> = [];
    const walk = (node: ComponentRow, level: number) => {
      ordered.push({ comp: node, level });
      childrenOf(node.tool_component_id).forEach((child) => walk(child, level + 1));
    };

    roots.forEach((r) => walk(r, 0));
    return ordered;
  };

  const filteredSystems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return systems;
    return systems.filter((s) => {
      const ownMatch =
        s.tool_code?.toLowerCase().includes(q) ||
        s.client_name?.toLowerCase().includes(q) ||
        s.tool_desc?.toLowerCase().includes(q);
      if (ownMatch) return true;
      const compList = componentsBySystem[s.tool_id] ?? [];
      return compList.some((c) =>
        c.component_code?.toLowerCase().includes(q) ||
        c.component_name?.toLowerCase().includes(q) ||
        c.component_sn?.toLowerCase().includes(q),
      );
    });
  }, [search, systems, componentsBySystem]);

  const table = useReactTable({
    data: filteredSystems,
    columns: [
      {
        id: 'tool_id',
        accessorFn: (row: DroneToolData) => row.tool_id,
      },
    ],
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  const pagedSystems = table.getRowModel().rows.map((r) => r.original);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search system/client/component..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          table.setPageIndex(0);
        }}
        className="max-w-md"
      />

      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                {['System / Component', 'Client / Serial', 'Status', 'Actions'].map((h) => (
                  <th key={h} className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: table.getState().pagination.pageSize }).map((_, i) => (
                  <tr key={`s-${i}`} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <td className="px-3 py-3"><Skeleton className="h-8 w-full" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-8 w-full" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-8 w-24" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : pagedSystems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="h-24 text-center text-slate-400">No results.</td>
                </tr>
              ) : (
                pagedSystems.map((system) => {
                  const systemComps = componentsBySystem[system.tool_id] ?? [];
                  const totalComponentCount = componentCountBySystem[system.tool_id] ?? 0;
                  const hierarchyRows = getHierarchy(systemComps);
                  const parentIds = new Set(
                    systemComps
                      .map((c) => c.fk_parent_component_id)
                      .filter((id): id is number => typeof id === 'number' && id > 0),
                  );
                  const isOpen = !!expanded[system.tool_id];
                  return (
                    <Fragment key={system.tool_id}>
                      <tr
                        className={`border-t ${isDark ? 'border-slate-700 hover:bg-slate-700/40' : 'border-slate-200 hover:bg-slate-50'} cursor-pointer`}
                        onClick={() => setExpanded((prev) => ({ ...prev, [system.tool_id]: !prev[system.tool_id] }))}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            <ChevronRight className={`h-4 w-4 mt-0.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                            <div>
                              <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{system.tool_code}</p>
                              <p className="text-xs text-slate-400">{totalComponentCount} component{totalComponentCount === 1 ? '' : 's'}</p>
                              {system.tool_desc ? <p className="text-xs text-slate-400">{system.tool_desc}</p> : null}
                            </div>
                          </div>
                        </td>
                        <td className={`px-3 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          <div>{system.client_name || '—'}</div>
                          {(system.tot_mission > 0 || system.tot_flown_time > 0) && (
                            <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              <span>{system.tot_mission} flight{system.tot_mission === 1 ? '' : 's'}</span>
                              {system.tot_flown_time > 0 && <span>{formatFlightTime(system.tot_flown_time)}</span>}
                              {system.tot_flown_meter > 0 && <span>{formatDistance(system.tot_flown_meter)}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill status={system.tool_status} />
                        </td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => onViewSystem(system.tool_id)}>View</Button>
                            <Button size="sm" variant="outline" onClick={() => onEditSystem(system)}>Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => onViewFiles(system)}>Files</Button>
                            <Button size="sm" variant="outline" onClick={() => onOpenRelations(system.tool_id, system.tool_code)} className="gap-1">
                              <GitBranch size={13} /> Relations
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => onDeleteSystem(system.tool_id)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                      {isOpen &&
                        (hierarchyRows.length ? (
                          hierarchyRows.map(({ comp, level }) => (
                            <tr key={comp.tool_component_id} className={`border-t ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-100 bg-slate-50/70'}`}>
                              <td className="pr-3 py-2.5" style={{ paddingLeft: `${40 + level * 24}px` }}>
                                <div className="flex items-start gap-2">
                                  {parentIds.has(comp.tool_component_id) ? (
                                    <div className="w-1 h-6 shrink-0 rounded-full bg-violet-600" />
                                  ) : null}
                                  <div>
                                    <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                      {comp.component_name || comp.component_code || `#${comp.tool_component_id}`}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {level > 0 ? '↳ ' : ''}
                                      {comp.component_type || '—'}
                                    </p>
                                    {comp.component_desc ? <p className="text-xs text-slate-400 italic">{comp.component_desc}</p> : null}
                                  </div>
                                </div>
                              </td>
                              <td className={`px-3 py-2.5 text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{comp.component_sn || '—'}</td>
                              <td className="px-3 py-2.5"><StatusPill status={comp.component_status} /></td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => onViewComponent(comp)}>View</Button>
                                  <Button size="sm" variant="outline" onClick={() => onEditComponent(comp.tool_component_id)}>Edit</Button>
                                  <Button size="sm" variant="outline" onClick={() => onLogComponent(comp)}>Log</Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onFlightLogsComponent(comp)}
                                    className="gap-1 text-violet-600 border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                                  >
                                    Flights
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => onDeleteComponent(comp.tool_component_id, comp.component_code || comp.component_name || `#${comp.tool_component_id}`)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className={`border-t ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-100 bg-slate-50/70'}`}>
                            <td colSpan={4} className="px-10 py-3 text-xs text-slate-400">No components attached to this system.</td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className={`border-t px-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <TablePagination table={table} />
        </div>
      </div>
    </div>
  );
}
