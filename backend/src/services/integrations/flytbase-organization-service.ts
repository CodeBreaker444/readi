'use server';

import { prisma } from '@/lib/prisma';
import { verifyFlytbaseTokenAndGetUser } from './flytbase-service';

export interface FlytbaseOrganization {
  id: number;
  name: string;
  org_id: string;
  api_token: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserFlytbaseAccess {
  id: number;
  user_id: number;
  organization_id: number;
  created_at: Date;
  organization?: FlytbaseOrganization;
}

/**
 * Create a new FlytBase organization
 */
export async function createFlytbaseOrganization(
  name: string,
  orgId: string,
  apiToken: string,
  companyId: number,
): Promise<FlytbaseOrganization> {
  if (!companyId || companyId <= 0) {
    throw new Error('Invalid company ID: must be a positive number');
  }

  await verifyFlytbaseTokenAndGetUser(apiToken, orgId);

  const organization = await prisma.flytbase_organizations.create({
    data: {
      name: name.trim(),
      org_id: orgId.trim(),
      api_token: apiToken.trim(),
      fk_owner_id: companyId,
    },
  });

  return organization;
}

/**
 * Get all FlytBase organizations for a company
 */
export async function getAllFlytbaseOrganizations(companyId: number): Promise<FlytbaseOrganization[]> {
  return prisma.flytbase_organizations.findMany({
    where: { fk_owner_id: companyId },
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Get a specific FlytBase organization by ID
 */
export async function getFlytbaseOrganizationById(
  id: number,
): Promise<FlytbaseOrganization | null> {
  return prisma.flytbase_organizations.findUnique({
    where: { id },
  });
}

/**
 * Update a FlytBase organization
 */
export async function updateFlytbaseOrganization(
  id: number,
  name?: string,
  orgId?: string,
  apiToken?: string,
): Promise<FlytbaseOrganization> {
  const updateData: any = {};
  
  if (name !== undefined) updateData.name = name.trim();
  if (orgId !== undefined) updateData.org_id = orgId.trim();
  if (apiToken !== undefined) {
    // Verify the token before updating
    await verifyFlytbaseTokenAndGetUser(apiToken, orgId || updateData.org_id);
    updateData.api_token = apiToken.trim();
  }

  return prisma.flytbase_organizations.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete a FlytBase organization
 */
export async function deleteFlytbaseOrganization(id: number): Promise<void> {
  await prisma.flytbase_organizations.delete({
    where: { id },
  });
}

/**
 * Get organizations accessible to a user
 */
export async function getUserFlytbaseOrganizations(
  userId: number,
  companyId: number,
): Promise<FlytbaseOrganization[]> {
  const accessRecords = await prisma.user_flytbase_access.findMany({
    where: { 
      user_id: userId,
      organization: {
        fk_owner_id: companyId,
      },
    },
   include: {
    organization: true,  
  },
  });

  return accessRecords.map((record) => record.organization);
}

/**
 * Grant a user access to an organization
 */
export async function grantUserFlytbaseAccess(
  userId: number,
  organizationId: number,
): Promise<UserFlytbaseAccess> {
  const organization = await prisma.flytbase_organizations.findUnique({
    where: { id: organizationId },
    select: { fk_owner_id: true },
  });

  if (!organization) {
    throw new Error('FlytBase organization not found');
  }

  return prisma.user_flytbase_access.create({
    data: {
      user_id: userId,
      organization_id: organizationId,
      fk_owner_id: organization.fk_owner_id!,
    },
    include: {
      organization: true,
    },
  });
}

/**
 * Revoke a user's access to an organization
 */
export async function revokeUserFlytbaseAccess(
  userId: number,
  organizationId: number,
): Promise<void> {
  await prisma.user_flytbase_access.deleteMany({
    where: {
      user_id: userId,
      organization_id: organizationId,
    },
  });
}

/**
 * Get all users with their FlytBase organization access for a company
 */
export async function getAllUsersWithFlytbaseAccess(companyId: number): Promise<
  Array<{ user_id: number; fullname: string; email: string; role: string; organizations: FlytbaseOrganization[] }>
> {
  const users = await prisma.public_users.findMany({
    where: { 
      fk_owner_id: companyId,
      user_role: { not: 'CLIENT' },
    },
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      email: true,
      user_role: true,
    },
  });

  const accessRecords = await prisma.user_flytbase_access.findMany({
    where: {
      user_id: { in: users.map(u => u.user_id) },
      organization: {
        fk_owner_id: companyId,
      },
    },
    include: {
      organization: true,
    },
  });

  const accessByUser = new Map<number, FlytbaseOrganization[]>();
  for (const record of accessRecords) {
    if (record.organization) {
      const existing = accessByUser.get(record.user_id) ?? [];
      existing.push(record.organization);
      accessByUser.set(record.user_id, existing);
    }
  }

  return users.map((user) => ({
    user_id: user.user_id,
    fullname: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || `User ${user.user_id}`,
    email: user.email ?? '',
    role: user.user_role ?? 'USER',
    organizations: accessByUser.get(user.user_id) ?? [],
  }));
}
/**
 * Get FlytBase credentials for a specific organization
 */
export async function getOrganizationCredentials(
  organizationId: number,
): Promise<{ token: string; orgId: string } | null> {
  const organization = await prisma.flytbase_organizations.findUnique({
    where: { id: organizationId },
    select: { api_token: true, org_id: true },
  });

  if (!organization) return null;

  return {
    token: organization.api_token,
    orgId: organization.org_id,
  };
}

/**
 * Get FlytBase credentials for a user (from their accessible organizations)
 * Returns the first available organization's credentials
 */
export async function getUserFlytbaseCredentials(
  userId: number,
): Promise<{ token: string; orgId: string; organizationId: number } | null> {
  const accessRecord = await prisma.user_flytbase_access.findFirst({
    where: { user_id: userId },
    include: {
      organization: true,
    },
  });

  if (!accessRecord || !accessRecord.organization) return null;

  return {
    token: accessRecord.organization.api_token,
    orgId: accessRecord.organization.org_id,
    organizationId: accessRecord.organization.id,
  };
}

/**
 * Get all FlytBase credentials for a user (all accessible organizations)
 * Returns an array of all organization credentials the user has access to
 * based on user_flytbase_access table assignments
 */
export async function getAllUserFlytbaseCredentials(
  userId: number,
): Promise<Array<{ orgName: string; token: string; orgId: string; organizationId: number }>> {
  const accessRecords = await prisma.user_flytbase_access.findMany({
    where: { user_id: userId },
    include: {
      organization: true,
    },
  });

  return accessRecords
    .filter((record) => record.organization)
    .map((record) => ({
      orgName: record.organization.name,
      token: record.organization.api_token,
      orgId: record.organization.org_id,
      organizationId: record.organization.id,
    }));
}
