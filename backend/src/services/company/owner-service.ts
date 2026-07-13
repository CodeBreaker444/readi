import { env } from '@/backend/config/env';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { sendAdminPasswordChangedEmail, sendUserActivationEmail } from '../../../../lib/resend/mail';
import { generateActivationToken, generateUniqueCode } from '../user/user-management';
import { ALL_FEATURE_KEYS, DEFAULT_ROLE_FEATURE_ACCESS, MATRIX_ROLES } from '@/lib/auth/feature-permissions-types';

export interface OwnerData {
    owner_id: number;
    owner_code: string;
    owner_name: string;
    owner_address: string | null;
    owner_phone: string | null;
    owner_email: string;
    owner_website: string;
    owner_active: string;
    drone_atc_enabled: boolean;
    d_flight_enabled: boolean;
    flytrelay_enabled: boolean;
    email_notifications_enabled: boolean;
    easa_operator_code: string | null;
    created_at: string;
}

export interface AddOwnerWithAdminPayload {
    owner_code: string;
    owner_name: string;
    owner_legal_name?: string;
    owner_type?: string;
    owner_address?: string;
    owner_city?: string;
    owner_state?: string;
    owner_postal_code?: string;
    owner_phone?: string;
    owner_email: string;
    owner_website: string;
    owner_active: string;
    drone_atc_enabled?: boolean;
    d_flight_enabled?: boolean;
    flytrelay_enabled?: boolean;
    email_notifications_enabled?: boolean;
    easa_operator_code?: string;
    tax_id?: string;
    registration_number?: string;
    license_number?: string;
    license_expiry?: string;
    admin_username: string;
    admin_fullname: string;
    admin_email: string;
    admin_phone?: string;
    admin_timezone?: string;
}

export interface AddOwnerPayload {
    owner_code: string;
    owner_name: string;
    owner_address?: string;
    owner_phone?: string;
    owner_email: string;
    owner_website: string;
    owner_active: string;
}

export interface UpdateOwnerPayload {
    owner_name: string;
    owner_legal_name?: string | null;
    owner_type?: string | null;
    owner_address?: string | null;
    owner_city?: string | null;
    owner_state?: string | null;
    owner_postal_code?: string | null;
    owner_phone?: string | null;
    owner_email: string;
    owner_website: string;
    owner_active: string;
    drone_atc_enabled?: boolean;
    d_flight_enabled?: boolean;
    flytrelay_enabled?: boolean;
    email_notifications_enabled?: boolean;
    easa_operator_code?: string | null;
    tax_id?: string | null;
    registration_number?: string | null;
    license_number?: string | null;
    license_expiry?: string | null;
}

export interface OwnerMetrics {
    total_users: number;
    active_users: number;
    inactive_users: number;
    users_by_role: Record<string, number>;
    storage_bytes: number;
    storage_file_count: number;
}

export interface OwnerWithAdmin extends OwnerData {
    admin_user?: {
        user_id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        user_active: string;
    } | null;
}

export async function getOwners(): Promise<OwnerWithAdmin[]> {
    const owners = await prisma.owner.findMany({
        orderBy: { created_at: 'desc' },
        include: {
            user_owner: {
                where: { relationship_type: 'OWNER_ADMIN', is_primary: true },
                select: {
                    fk_owner_id: true,
                    users: {
                        select: {
                            user_id: true,
                            username: true,
                            email: true,
                            first_name: true,
                            last_name: true,
                            phone: true,
                            user_active: true,
                        },
                    },
                },
            },
        },
    });

    return owners.map((owner) => {
        const { user_owner, ...ownerData } = owner;
        const adminRel = user_owner[0];
        return {
            ...ownerData,
            created_at: ownerData.created_at?.toISOString() ?? '',
            admin_user: adminRel?.users
                ? {
                      user_id: adminRel.users.user_id,
                      username: adminRel.users.username ?? '',
                      email: adminRel.users.email ?? '',
                      first_name: adminRel.users.first_name ?? '',
                      last_name: adminRel.users.last_name ?? '',
                      phone: adminRel.users.phone ?? null,
                      user_active: adminRel.users.user_active ?? '',
                  }
                : null,
        } as unknown as OwnerWithAdmin;
    });
}

export async function getOwnerById(id: string): Promise<OwnerWithAdmin | null> {
    const ownerId = parseInt(id);

    const owner = await prisma.owner.findUnique({
        where: { owner_id: ownerId },
        include: {
            user_owner: {
                where: { relationship_type: 'OWNER_ADMIN', is_primary: true },
                select: {
                    users: {
                        select: {
                            user_id: true,
                            username: true,
                            email: true,
                            first_name: true,
                            last_name: true,
                            phone: true,
                            user_active: true,
                        },
                    },
                },
                take: 1,
            },
        },
    });

    if (!owner) return null;

    const { user_owner, ...ownerData } = owner;
    const adminRel = user_owner[0];

    return {
        ...ownerData,
        created_at: ownerData.created_at?.toISOString() ?? '',
        admin_user: adminRel?.users
            ? {
                  user_id: adminRel.users.user_id,
                  username: adminRel.users.username ?? '',
                  email: adminRel.users.email ?? '',
                  first_name: adminRel.users.first_name ?? '',
                  last_name: adminRel.users.last_name ?? '',
                  phone: adminRel.users.phone ?? null,
                  user_active: adminRel.users.user_active ?? '',
              }
            : null,
    } as unknown as OwnerWithAdmin;
}

export async function getOwnerMetrics(id: string): Promise<OwnerMetrics> {
    const ownerId = parseInt(id);

    const users = await prisma.public_users.findMany({
        where: { fk_owner_id: ownerId },
        select: { user_id: true, user_active: true, user_role: true },
    });

    const total_users = users.length;
    const active_users = users.filter((u) => u.user_active === 'Y').length;
    const inactive_users = total_users - active_users;

    const users_by_role: Record<string, number> = {};
    for (const u of users) {
        if (u.user_role) {
            users_by_role[u.user_role] = (users_by_role[u.user_role] ?? 0) + 1;
        }
    }

    const [lucAgg, evalAgg, maintAgg, repoAgg] = await Promise.all([
        // LUC document revisions 
        prisma.luc_document_rev.aggregate({
            where: { luc_document: { fk_owner_id: ownerId, document_active: 'Y' } },
            _sum: { file_size: true },
            _count: { revision_id: true },
        }),

        // Evaluation files  
        prisma.evaluation_file.aggregate({
            where: { evaluation: { fk_owner_id: ownerId } },
            _sum: { file_size: true },
            _count: { file_id: true },
        }),

        // Maintenance ticket attachments  
        prisma.maintenance_ticket_attachment.aggregate({
            where: { maintenance_ticket: { fk_owner_id: ownerId } },
            _sum: { file_size: true },
            _count: { attachment_id: true },
        }),

        // Repository files 
        prisma.repository_file.aggregate({
            where: { fk_owner_id: ownerId },
            _sum: { file_size: true },
            _count: { file_id: true },
        }),
    ]);

    const storage_bytes =
        Number(lucAgg._sum.file_size ?? 0) +
        Number(evalAgg._sum.file_size ?? 0) +
        Number(maintAgg._sum.file_size ?? 0) +
        Number(repoAgg._sum.file_size ?? 0);

    const storage_file_count =
        (lucAgg._count.revision_id ?? 0) +
        (evalAgg._count.file_id ?? 0) +
        (maintAgg._count.attachment_id ?? 0) +
        (repoAgg._count.file_id ?? 0);

    return { total_users, active_users, inactive_users, users_by_role, storage_bytes, storage_file_count };
}

export async function updateOwner(id: string, payload: UpdateOwnerPayload) {
    const ownerId = parseInt(id);

    const current = await prisma.owner.findUnique({
        where: { owner_id: ownerId },
        select: { owner_active: true },
    });

    const updated = await prisma.owner.update({
        where: { owner_id: ownerId },
        data: {
            owner_name: payload.owner_name,
            owner_legal_name: payload.owner_legal_name ?? null,
            owner_type: payload.owner_type ?? null,
            owner_address: payload.owner_address ?? null,
            owner_city: payload.owner_city ?? null,
            owner_state: payload.owner_state ?? null,
            owner_postal_code: payload.owner_postal_code ?? null,
            owner_phone: payload.owner_phone ?? null,
            owner_email: payload.owner_email,
            owner_website: payload.owner_website,
            owner_active: payload.owner_active,
            drone_atc_enabled: payload.drone_atc_enabled ?? false,
            d_flight_enabled: payload.d_flight_enabled ?? false,
            flytrelay_enabled: payload.flytrelay_enabled ?? false,
            email_notifications_enabled: payload.email_notifications_enabled ?? false,
            easa_operator_code: payload.easa_operator_code ?? null,
            tax_id: payload.tax_id ?? null,
            registration_number: payload.registration_number ?? null,
            license_number: payload.license_number ?? null,
            license_expiry: payload.license_expiry ? new Date(payload.license_expiry) : null,
        },
    });

    // Reactivate all company users when transitioning from disabled to active
    if (current?.owner_active === 'N' && payload.owner_active === 'Y') {
        await Promise.all([
            prisma.public_users.updateMany({
                where: { fk_owner_id: ownerId },
                data: { user_active: 'Y' },
            }),
            prisma.user_owner.updateMany({
                where: { fk_owner_id: ownerId },
                data: { is_active: true },
            }),
        ]);
    }

    return updated as unknown as OwnerData;
}

export async function updateCompanyEasaCode(ownerId: number, easaCode: string | null): Promise<void> {
    await prisma.owner.update({
        where: { owner_id: ownerId },
        data: { easa_operator_code: easaCode ?? null },
    });
}

export async function deleteOwner(id: string, deletedByUserId: number) {
    const ownerId = parseInt(id);

    const owner = await prisma.owner.findUnique({ where: { owner_id: ownerId } });
    if (!owner) throw new Error('Organization not found');

    const users = await prisma.public_users.findMany({
        where: { fk_owner_id: ownerId },
        select: {
            user_id: true,
            username: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            user_role: true,
            user_type: true,
            fk_owner_id: true,
            created_at: true,
        },
    });

    await prisma.deleted_owner.create({
        data: {
            owner_id: owner.owner_id,
            owner_code: owner.owner_code,
            owner_name: owner.owner_name,
            owner_legal_name: owner.owner_legal_name,
            owner_type: owner.owner_type,
            owner_address: owner.owner_address,
            owner_city: owner.owner_city,
            owner_state: owner.owner_state,
            owner_postal_code: owner.owner_postal_code,
            fk_country_id: owner.fk_country_id,
            owner_phone: owner.owner_phone,
            owner_email: owner.owner_email,
            owner_website: owner.owner_website,
            owner_logo: owner.owner_logo,
            owner_active: owner.owner_active,
            tax_id: owner.tax_id,
            registration_number: owner.registration_number,
            license_number: owner.license_number,
            license_expiry: owner.license_expiry,
            original_created_at: owner.created_at,
            deleted_by_user_id: deletedByUserId,
        },
    });

    if (users.length > 0) {
        await prisma.deleted_user.createMany({
            data: users.map((user) => ({
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                user_role: user.user_role,
                user_type: user.user_type,
                fk_owner_id: user.fk_owner_id,
                owner_code: owner.owner_code,
                owner_name: owner.owner_name,
                original_created_at: user.created_at,
                deleted_by_user_id: deletedByUserId,
            })),
            skipDuplicates: true,
        }).catch((e) => console.error('Failed to archive users:', e));

        const userIds = users.map((u) => u.user_id);

        await Promise.all([
            prisma.public_users.updateMany({
                where: { user_id: { in: userIds } },
                data: { user_active: 'N' },
            }).catch((e) => console.error('Failed to deactivate users:', e)),

            prisma.user_owner.updateMany({
                where: { fk_owner_id: ownerId },
                data: { is_active: false },
            }).catch((e) => console.error('Failed to deactivate user_owner:', e)),
        ]);
    }

    await prisma.owner.update({
        where: { owner_id: ownerId },
        data: { owner_active: 'N' },
    });

    return true;
}

/** Seeds the default per-role feature permission matrix for a newly created company. */
export async function seedDefaultRolePermissions(ownerId: number): Promise<void> {
    const rows = MATRIX_ROLES.flatMap((role) =>
        ALL_FEATURE_KEYS
            .filter((feature_key) => DEFAULT_ROLE_FEATURE_ACCESS[role]?.[feature_key] !== undefined)
            .map((feature_key) => ({
                fk_owner_id: ownerId,
                role,
                feature_key,
                access: DEFAULT_ROLE_FEATURE_ACCESS[role]![feature_key]!,
            })),
    );

    await prisma.role_feature_permission.createMany({
        data: rows,
        skipDuplicates: true,
    });
}

export async function addOwnerWithAdmin(payload: AddOwnerWithAdminPayload) {
    const existing = await prisma.owner.findFirst({
        where: { owner_code: payload.owner_code },
        select: { owner_id: true },
    });
    if (existing) throw new Error('Organization code already exists');

    const existingUser = await prisma.public_users.findFirst({
        where: {
            OR: [
                { email: { equals: payload.admin_email, mode: 'insensitive' } },
                { username: payload.admin_username },
            ],
        },
        select: { user_id: true, email: true, username: true },
    });

    if (existingUser) {
        if (existingUser.email?.toLowerCase() === payload.admin_email.toLowerCase()) {
            throw new Error('Admin email is already registered');
        }
        if (existingUser.username === payload.admin_username) {
            throw new Error('Admin username is already taken');
        }
    }

    const owner = await prisma.owner.create({
        data: {
            owner_code: payload.owner_code,
            owner_name: payload.owner_name,
            owner_legal_name: payload.owner_legal_name || null,
            owner_type: payload.owner_type || null,
            owner_address: payload.owner_address || null,
            owner_city: payload.owner_city || null,
            owner_state: payload.owner_state || null,
            owner_postal_code: payload.owner_postal_code || null,
            owner_phone: payload.owner_phone || null,
            owner_email: payload.owner_email,
            owner_website: payload.owner_website,
            owner_active: payload.owner_active,
            drone_atc_enabled: payload.drone_atc_enabled ?? false,
            d_flight_enabled: payload.d_flight_enabled ?? false,
            flytrelay_enabled: payload.flytrelay_enabled ?? false,
            email_notifications_enabled: payload.email_notifications_enabled ?? false,
            tax_id: payload.tax_id || null,
            registration_number: payload.registration_number || null,
            license_number: payload.license_number || null,
            license_expiry: payload.license_expiry ? new Date(payload.license_expiry) : null,
        },
    });

    try {
        await seedDefaultRolePermissions(owner.owner_id);

        const uid = generateUniqueCode();
        const key = generateActivationToken(128);
        const nameParts = payload.admin_fullname.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const hashedPasscode = await bcrypt.hash(uid, 10);
        const userName = payload.admin_username.toLocaleLowerCase();

        const adminUser = await prisma.public_users.create({
            data: {
                username: userName,
                email: payload.admin_email,
                password_hash: hashedPasscode,
                first_name: firstName,
                last_name: lastName,
                phone: payload.admin_phone || null,
                fk_owner_id: owner.owner_id,
                user_type: 'ADMIN',
                user_active: 'N',
                user_role: 'ADMIN',
                is_viewer: 'Y',
                is_manager: 'Y',
                user_timezone: payload.admin_timezone || 'IST',
                user_unique_code: uid,
                key_: key,
            },
        });

        await prisma.user_owner.create({
            data: {
                fk_user_id: adminUser.user_id,
                fk_owner_id: owner.owner_id,
                relationship_type: 'OWNER_ADMIN',
                role_in_organization: 'Administrator',
                is_primary: true,
                is_active: true,
            },
        });

        await prisma.users_profile.create({
            data: {
                fk_user_id: adminUser.user_id,
                address: payload.owner_address || null,
            },
        });

        const activationLink = `${env.APP_URL}/auth/activate?o=${owner.owner_id}&email=${encodeURIComponent(payload.admin_email)}&username=${encodeURIComponent(payload.admin_username)}&id=${key}`;

        const emailResult = await sendUserActivationEmail(
            payload.admin_email,
            payload.admin_fullname,
            {
                organization: payload.owner_name,
                username: payload.admin_username,
                passcode: uid,
                loginlink: activationLink,
            }
        );

        return {
            owner,
            admin: {
                userId: adminUser.user_id,
                activationKey: key,
                emailSent: emailResult.message,
            },
        };
    } catch (error) {
        await prisma.owner.delete({ where: { owner_id: owner.owner_id } }).catch(() => {});
        throw error;
    }
}

export async function updateAdminPassword(ownerId: string, adminUserId: number, newPassword: string) {
    const ownerIdNum = parseInt(ownerId);

    const user = await prisma.public_users.findFirst({
        where: { user_id: adminUserId, fk_owner_id: ownerIdNum },
        select: { user_id: true, email: true, username: true, first_name: true, last_name: true, fk_owner_id: true },
    });
    if (!user) throw new Error('Admin user not found for this company');

    const owner = await prisma.owner.findUnique({
        where: { owner_id: ownerIdNum },
        select: { owner_name: true },
    });
    if (!owner) throw new Error('Company not found');

    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.public_users.update({
        where: { user_id: adminUserId },
        data: { password_hash },
    });

    const fullname = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || '';

    await sendAdminPasswordChangedEmail(
        user.email ?? '',
        fullname,
        user.username ?? '',
        newPassword,
        owner.owner_name
    );

    return { message: 'Password updated successfully' };
}
