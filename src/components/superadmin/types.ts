// Type-only re-export — erased at compile time, so the backend/prisma module
// this points at is never bundled into client code.
export type { SuperAdminOverview, SuperAdminCompanyRow } from '@/backend/services/superadmin/superadmin-service';
