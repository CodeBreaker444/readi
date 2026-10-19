import {
  DEFAULT_ROLE_FEATURE_ACCESS,
  FEATURE_SECTIONS,
  MATRIX_ROLES,
  featureToLegacyPermission,
  type AccessLevel,
  type FeatureKey,
} from '@/lib/auth/feature-permissions-types';
import { roleHasPermission, type Role } from '@/lib/auth/roles';

/**
 * Features where a read-only (R) role can still add new records, because the "add" endpoint
 * checks 'create' (any granted access) instead of 'edit'. Keep in sync with requireFeatureAccess(key, 'create').
 */
const CREATE_WITH_READ: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
  'compliance_general_audit_plan',
  'compliance_requirements_evidence',
  'document_repository',
  'mission_category',
  'mission_result',
  'mission_status',
  'mission_type',
  'operation_calendar',
  'org_assignments',
  'org_checklist',
  'org_communication',
  'planning_new_evaluation',
  'safety_spi_kpi_definitions',
  'systems_maintenance_tickets',
  'systems_manage',
  'team_client',
  'team_personnel',
]);

/** Roles that are not in the editable matrix: fixed full access, or the legacy view-based fallback. */
const FULL_ACCESS_LABEL = 'ADMIN / OPM / SUPERADMIN';
const LEGACY_ROLES: Role[] = ['RM', 'SLA'];

function cellFor(access: AccessLevel | null, key: FeatureKey): string {
  if (access === 'A') return 'R · W · D*';
  if (access === 'R') return CREATE_WITH_READ.has(key) ? 'R · W¹' : 'R';
  return '–';
}

function accessFor(role: Role, key: FeatureKey): AccessLevel | null {
  if (MATRIX_ROLES.includes(role)) return DEFAULT_ROLE_FEATURE_ACCESS[role]?.[key] ?? null;
  return roleHasPermission(role, featureToLegacyPermission(key)) ? 'A' : null;
}

const th = 'border border-fd-border px-2 py-1.5 text-center text-xs font-semibold whitespace-nowrap';
const td = 'border border-fd-border px-2 py-1.5 text-center text-xs whitespace-nowrap';

/**
 * Default read / write-edit / delete access per role for one or more permission sections.
 * Built from the same tables the platform enforces, so it cannot drift from the code.
 */
export function PermissionsTable({ section }: { section: string | string[] }) {
  const names = Array.isArray(section) ? section : [section];
  const features = FEATURE_SECTIONS.filter((s) => names.includes(s.section)).flatMap((s) => s.features);
  if (features.length === 0) return null;

  return (
    <div className="my-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} text-left`}>Feature</th>
              <th className={th}>{FULL_ACCESS_LABEL} †</th>
              {MATRIX_ROLES.map((r) => (
                <th key={r} className={th}>
                  {r}
                </th>
              ))}
              {LEGACY_ROLES.map((r) => (
                <th key={r} className={th}>
                  {r} †
                </th>
              ))}
              <th className={th}>CLIENT †</th>
              <th className={th}>Customisable in role permissions editor</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.key}>
                <td className={`${td} text-left font-medium`}>{f.label}</td>
                <td className={td}>R · W · D*</td>
                {MATRIX_ROLES.map((r) => (
                  <td key={r} className={td}>
                    {cellFor(accessFor(r, f.key), f.key)}
                  </td>
                ))}
                {LEGACY_ROLES.map((r) => (
                  <td key={r} className={td}>
                    {cellFor(accessFor(r, f.key), f.key)}
                  </td>
                ))}
                <td className={td}>–</td>
                <td className={td}>{MATRIX_ROLES.some((r) => accessFor(r, f.key)) ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PermissionsLegend />
    </div>
  );
}

export function PermissionsLegend() {
  return (
    <div className="mt-2 space-y-1 text-xs text-fd-muted-foreground">
      <p>
        <strong>R</strong> = read, <strong>W</strong> = write / edit, <strong>D</strong> = delete. – = no access.
      </p>
      <p>
        * Delete also requires the user&apos;s <strong>Manager</strong> flag. ¹ Can add new records but cannot edit existing ones.
      </p>
      <p>
        † Fixed, not editable: ADMIN, OPM and SUPERADMIN always have full access; RM and SLA follow built-in rules; CLIENT only uses the Client Portal. For
        the other roles, <strong>Yes</strong> means the access level can be switched between read-only (R) and full (R · W · D) in{' '}
        <strong>Team → Roles &amp; Permissions</strong>, which only ADMIN, OPM and SUPERADMIN can open. A role with no access (–) cannot be changed there. A
        user with individual custom permissions follows those instead of their role.
      </p>
    </div>
  );
}
