'use client';

import { AccessLevel, FEATURE_SECTIONS, FeatureKey } from '@/lib/auth/feature-permissions-types';

interface UserPermissionMatrixProps {
  isDark: boolean;
  disabled?: boolean;
  values: Partial<Record<FeatureKey, AccessLevel>>;
  onChange: (key: FeatureKey, value: AccessLevel) => void;
}

/** Single-column R/A checkbox grid for customizing one user's permissions, grouped like the role matrix. */
export function UserPermissionMatrix({ isDark, disabled, values, onChange }: UserPermissionMatrixProps) {
  return (
    <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
      <table className="w-full text-sm border-collapse">
        <tbody>
          {FEATURE_SECTIONS.map((section) => (
            <SectionRows key={section.section} section={section} isDark={isDark} disabled={disabled} values={values} onChange={onChange} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionRows({ section, isDark, disabled, values, onChange }: {
  section: typeof FEATURE_SECTIONS[number];
  isDark: boolean;
  disabled?: boolean;
  values: Partial<Record<FeatureKey, AccessLevel>>;
  onChange: (key: FeatureKey, value: AccessLevel) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={2} className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${isDark ? 'bg-slate-800/60 text-violet-400' : 'bg-violet-50 text-violet-700'}`}>
          {section.section}
        </td>
      </tr>
      {section.features.map((feature) => {
        const value = values[feature.key];
        const active = value === 'A';
        return (
          <tr key={feature.key} className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <td className={`px-3 py-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{feature.label}</td>
            <td className="px-3 py-1.5 w-24 text-right">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(feature.key, active ? 'R' : 'A')}
                className={`w-9 h-6 rounded-md text-[10px] font-bold transition-colors ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                  active
                    ? 'bg-violet-600 text-white'
                    : isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {active ? 'A' : 'R'}
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );
}
