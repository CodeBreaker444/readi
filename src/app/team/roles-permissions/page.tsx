'use client';

import { useTheme } from '@/components/useTheme';
import { AccessLevel, FEATURE_SECTIONS, FeatureKey, MATRIX_ROLES } from '@/lib/auth/feature-permissions-types';
import { Role } from '@/lib/auth/roles';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type Matrix = Record<string, Partial<Record<FeatureKey, AccessLevel>>>;

const LOCKED_FULL_ACCESS_ROLES: Role[] = ['OPM', 'ADMIN'];

export default function RolesPermissionsPage() {
  const { isDark } = useTheme();
  const [matrix, setMatrix] = useState<Matrix>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/permissions/role-defaults');
      setMatrix(res.data?.data?.matrix ?? {});
    } catch {
      toast.error('Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (role: Role, key: FeatureKey) => {
    setMatrix((prev) => {
      const current = prev[role]?.[key];
      const next: AccessLevel = current === 'A' ? 'R' : 'A';
      return { ...prev, [role]: { ...prev[role], [key]: next } };
    });
    setDirty((prev) => new Set(prev).add(role));
  };

  const saveRole = async (role: Role) => {
    setSavingRole(role);
    try {
      await axios.patch('/api/permissions/role-defaults', { role, access: matrix[role] ?? {} });
      setDirty((prev) => { const next = new Set(prev); next.delete(role); return next; });
      toast.success(`${role} permissions saved`);
    } catch {
      toast.error(`Failed to save ${role} permissions`);
    } finally {
      setSavingRole(null);
    }
  };

  const columns = useMemo(() => [...MATRIX_ROLES, ...LOCKED_FULL_ACCESS_ROLES], []);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className={`border-b px-6 py-4 ${isDark ? 'bg-slate-900/80 border-slate-700/60' : 'bg-white/80 border-gray-200'}`}>
        <div className="mx-auto flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-violet-600" />
          <div>
            <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Roles & Permissions</h1>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Default read/full-access permissions per role. Users without a custom override follow this table.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 py-8 max-w-[1600px]">
        {loading ? (
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className={isDark ? 'bg-slate-800' : 'bg-slate-50'}>
                  <th className={`sticky left-0 z-10 text-left px-4 py-2 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <Skeleton className={`h-4 w-16 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  </th>
                  {columns.map((_, i) => (
                    <th key={i} className="px-3 py-2 text-center">
                      <Skeleton className={`h-4 w-12 mx-auto ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_SECTIONS.map((section, i) => (
                  <FragmentSectionSkeleton key={i} section={section} columns={columns} isDark={isDark} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`rounded-xl border overflow-x-auto ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className={isDark ? 'bg-slate-800' : 'bg-slate-50'}>
                  <th className={`sticky left-0 z-10 text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>Feature</th>
                  {columns.map((role) => (
                    <th key={role} className={`px-3 py-2 text-center font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span>{role}</span>
                        {!LOCKED_FULL_ACCESS_ROLES.includes(role) && dirty.has(role) && (
                          <button
                            onClick={() => saveRole(role)}
                            disabled={savingRole === role}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white cursor-pointer disabled:opacity-50"
                          >
                            {savingRole === role ? '…' : 'Save'}
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_SECTIONS.map((section) => (
                  <FragmentSection key={section.section} section={section} matrix={matrix} columns={columns} isDark={isDark} onToggle={toggle} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentSection({ section, matrix, columns, isDark, onToggle }: {
  section: typeof FEATURE_SECTIONS[number];
  matrix: Matrix;
  columns: Role[];
  isDark: boolean;
  onToggle: (role: Role, key: FeatureKey) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={columns.length + 1} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${isDark ? 'bg-slate-800/60 text-violet-400' : 'bg-violet-50 text-violet-700'}`}>
          {section.section}
        </td>
      </tr>
      {section.features.map((feature) => (
        <tr key={feature.key} className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <td className={`sticky left-0 px-4 py-1.5 whitespace-nowrap ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700'}`}>{feature.label}</td>
          {columns.map((role) => {
            const locked = LOCKED_FULL_ACCESS_ROLES.includes(role);
            if (locked) {
              return (
                <td key={role} className="px-3 py-1.5 text-center">
                  <ShieldCheck size={13} className={`mx-auto ${isDark ? 'text-emerald-500/60' : 'text-emerald-500/70'}`} />
                </td>
              );
            }
            const value = matrix[role]?.[feature.key];
            if (!value) {
              return (
                <td key={role} className="px-3 py-1.5 text-center">
                  <span className={`text-xs select-none ${isDark ? 'text-slate-700' : 'text-slate-300'}`} title="No access">—</span>
                </td>
              );
            }
            return (
              <td key={role} className="px-3 py-1.5 text-center">
                <button
                  type="button"
                  onClick={() => onToggle(role, feature.key)}
                  className={`w-9 h-6 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                    value === 'A'
                      ? 'bg-violet-600 text-white'
                      : isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                  title={value === 'A' ? 'Full access — click to set Read-only' : 'Read-only — click to set Full access'}
                >
                  {value === 'A' ? 'A' : 'R'}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function FragmentSectionSkeleton({ section, columns, isDark }: {
  section: typeof FEATURE_SECTIONS[number];
  columns: Role[];
  isDark: boolean;
}) {
  return (
    <>
      <tr>
        <td colSpan={columns.length + 1} className={`px-4 py-1.5 ${isDark ? 'bg-slate-800/60' : 'bg-violet-50'}`}>
          <Skeleton className={`h-4 w-24 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
        </td>
      </tr>
      {section.features.map((_, i) => (
        <tr key={i} className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <td className={`sticky left-0 px-4 py-1.5 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <Skeleton className={`h-4 w-32 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
          </td>
          {columns.map((role, j) => {
            const locked = LOCKED_FULL_ACCESS_ROLES.includes(role);
            return (
              <td key={j} className="px-3 py-1.5 text-center">
                {locked ? (
                  <Skeleton className={`h-4 w-4 mx-auto rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                ) : (
                  <Skeleton className={`h-6 w-9 mx-auto rounded-md ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
