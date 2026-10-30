import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

export const SUPPORT_ADMIN_EMAIL_DOMAIN = '@readicontrolcenter.com';
export const SUPPORT_ADMIN_RELATIONSHIP = 'SUPPORT_ADMIN';

/** Prisma filter that keeps the hidden per-company support admin out of user lists/counts/notifications. */
export const EXCLUDE_SUPPORT_ADMIN = {
    NOT: { email: { endsWith: SUPPORT_ADMIN_EMAIL_DOMAIN, mode: 'insensitive' as const } },
};

export const supportAdminEmail = (code: string) => `${code}${SUPPORT_ADMIN_EMAIL_DOMAIN}`;

async function generateUniqueSupportCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
        const code = String(randomInt(100000, 1000000));
        const taken = await prisma.owner.findFirst({ where: { support_access_code: code }, select: { owner_id: true } });
        if (!taken) return code;
    }
    throw new Error('Could not generate a unique support access code');
}

/**
 * Idempotent: makes sure the company has a 6-digit support code and a matching active ADMIN
 * login (email `<code>@readicontrolcenter.com`, password `<code>`). Returns the code.
 * The account uses `timezone` when given, otherwise the company's primary admin's timezone.
 */
export async function ensureSupportAdmin(ownerId: number, timezone?: string): Promise<string> {
    const owner = await prisma.owner.findUnique({
        where: { owner_id: ownerId },
        select: { support_access_code: true },
    });
    if (!owner) throw new Error('Company not found');

    let code = owner.support_access_code;
    if (!code) {
        code = await generateUniqueSupportCode();
        await prisma.owner.update({ where: { owner_id: ownerId }, data: { support_access_code: code } });
    }

    const email = supportAdminEmail(code);
    const existing = await prisma.public_users.findUnique({ where: { email }, select: { user_id: true } });
    if (existing) return code;

    const userTimezone = timezone ?? (await prisma.public_users.findFirst({
        where: { fk_owner_id: ownerId, user_role: 'ADMIN', ...EXCLUDE_SUPPORT_ADMIN },
        orderBy: { user_id: 'asc' },
        select: { user_timezone: true },
    }))?.user_timezone ?? 'IST';

    const user = await prisma.public_users.create({
        data: {
            username: `support_${code}`,
            email,
            password_hash: await bcrypt.hash(code, 10),
            first_name: 'Support',
            last_name: 'Admin',
            fk_owner_id: ownerId,
            user_type: 'ADMIN',
            user_role: 'ADMIN',
            user_active: 'Y',
            is_viewer: 'Y',
            is_manager: 'Y',
            user_timezone: userTimezone,
        },
    });

    await prisma.user_owner.create({
        data: {
            fk_user_id: user.user_id,
            fk_owner_id: ownerId,
            relationship_type: SUPPORT_ADMIN_RELATIONSHIP,
            role_in_organization: 'Support Administrator',
            is_primary: false,
            is_active: true,
        },
    });
    await prisma.users_profile.create({ data: { fk_user_id: user.user_id } });
    // Skip the forced "change your password" step at first login — the password must stay equal to the code.
    await prisma.user_settings.create({
        data: { fk_user_id: user.user_id, setting_key: 'password_changed', setting_value: 'true' },
    });

    return code;
}
