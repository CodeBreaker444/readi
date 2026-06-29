'use client';

import { FlytbaseFlights } from '@/components/control-center/FlytbaseFlights';
import { FlytrelayFlights } from '@/components/control-center/FlytrelayFlights';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

type Tab = 'flytbase' | 'flytrelay';
type FilterMode = 'window' | 'latest';

export interface Organization {
  id: number;
  name: string;
  orgId: string;
}

export function FlightsTabs({ flytrelayAccess }: { flytrelayAccess: boolean }) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('flytbase');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgPage, setOrgPage] = useState(1);
  const orgPageSize = 8;
  const [window, setWindow] = useState(1440);
  const [filterMode, setFilterMode] = useState<FilterMode>('window');

  const WINDOWS = [
    { value: 60 },
    { value: 360 },
    { value: 720 },
    { value: 1440 },
  ];

  const fetchOrganizations = useCallback(async () => {
    setOrgLoading(true);
    try {
      const res = await axios.get('/api/flytbase/my-organizations');
      setOrganizations(res.data.organizations || []);
      if (res.data.organizations && res.data.organizations.length > 0) {
        setSelectedOrganization(res.data.organizations[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setOrgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const bg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const card = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const skeletonClass = isDark ? 'bg-slate-800' : 'bg-slate-200';

  const totalOrgPages = Math.max(1, Math.ceil(organizations.length / orgPageSize));
  const orgStart = (orgPage - 1) * orgPageSize;
  const orgEnd = orgStart + orgPageSize;
  const pagedOrganizations = organizations.slice(orgStart, orgEnd);

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${bg}`}>
      {/* Header */}
      <div className={`border-b ${card}`}>
        <div className="mx-auto max-w-[1800px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`font-semibold text-base tracking-tight ${textPrimary}`}>
                Flights
              </h1>
              <p className={`text-xs ${textSecondary}`}>
                Recent flight logs
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('flytbase')}
                className={`px-3 py-1.5 cursor-pointer rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'flytbase'
                    ? 'bg-violet-600 text-white'
                    : isDark
                    ? 'text-slate-400 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                C2
              </button>
              {flytrelayAccess && (
                <button
                  onClick={() => setActiveTab('flytrelay')}
                  className={`px-3 py-1.5 cursor-pointer rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'flytrelay'
                      ? 'bg-violet-600 text-white'
                      : isDark
                      ? 'text-slate-400 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  FlytRelay
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
        <div className="mx-auto max-w-[1800px] h-full flex gap-4">
          {/* Org listing card */}
          <div className={`rounded-xl border flex-shrink-0 w-56 flex flex-col h-full ${card}`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Organizations
              </span>
            </div>
            
     

            <div className="p-3 flex-1 overflow-y-auto">
              {orgLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className={`h-8 w-full ${skeletonClass}`} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {pagedOrganizations.map((org) => {
                    const isSelected = selectedOrganization?.id === org.id;
                    return (
                      <button
                        key={org.id}
                        onClick={() => setSelectedOrganization(org)}
                        className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600 text-white'
                            : isDark
                            ? 'text-slate-400 hover:bg-slate-800'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {org.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {totalOrgPages > 1 && (
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => setOrgPage(Math.max(1, orgPage - 1))}
                    disabled={orgPage === 1}
                    className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                      orgPage === 1
                        ? 'opacity-50 cursor-not-allowed'
                        : isDark
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Prev
                  </button>
                  <span className={`text-[11px] ${textSecondary}`}>
                    {orgPage} / {totalOrgPages}
                  </span>
                  <button
                    onClick={() => setOrgPage(Math.min(totalOrgPages, orgPage + 1))}
                    disabled={orgPage >= totalOrgPages}
                    className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                      orgPage >= totalOrgPages
                        ? 'opacity-50 cursor-not-allowed'
                        : isDark
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Flights content */}
          <div className="flex-1 min-w-0 h-full">
            {activeTab === 'flytbase' && (
              <FlytbaseFlights
                isActive={true}
                selectedOrganization={selectedOrganization}
                organizations={organizations}
                setSelectedOrganization={setSelectedOrganization}
                orgLoading={orgLoading}
                window={window}
                filterMode={filterMode}
              />
            )}
            {flytrelayAccess && activeTab === 'flytrelay' && (
              <FlytrelayFlights
                token={null}
                isActive={true}
                selectedOrganization={selectedOrganization}
                organizations={organizations}
                setSelectedOrganization={setSelectedOrganization}
                orgLoading={orgLoading}
                window={window}
                filterMode={filterMode}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
