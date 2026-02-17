import { env } from '@/backend/config/env';
import { supabase } from '@/backend/database/database';
import { sendUserActivationEmail } from 'lib/resend/mail';
import { generateActivationToken, generateUniqueCode } from '../user/user-management';

export interface OwnerData {
    owner_id: number;
    owner_code: string;
    owner_name: string;
    owner_address: string | null;
    owner_phone: string | null;
    owner_email: string;
    owner_website: string;
    owner_active: string;
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
    owner_address?: string;
    owner_phone?: string;
    owner_email: string;
    owner_website: string;
    owner_active: string;
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
    const { data: owners, error } = await supabase
        .from('owner')
        .select('owner_id, owner_code, owner_name, owner_legal_name, owner_type, owner_address, owner_city, owner_state, owner_postal_code, owner_phone, owner_email, owner_website, owner_active, tax_id, registration_number, license_number, license_expiry, created_at')
        .eq('owner_active', 'Y')
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const ownerIds = owners.map((o: any) => o.owner_id);

    const { data: adminRelations } = await supabase
        .from('user_owner')
        .select(`
      fk_owner_id,
      users:fk_user_id (
        user_id,
        username,
        email,
        first_name,
        last_name,
        phone,
        user_active
      )
    `)
        .in('fk_owner_id', ownerIds)
        .eq('relationship_type', 'OWNER_ADMIN')
        .eq('is_primary', true)
        .eq('is_active', true);

    const adminMap = new Map<number, any>();
    if (adminRelations) {
        for (const rel of adminRelations) {
            if (!adminMap.has(rel.fk_owner_id)) {
                adminMap.set(rel.fk_owner_id, rel.users);
            }
        }
    }

    return owners.map((owner: any) => ({
        ...owner,
        admin_user: adminMap.get(owner.owner_id) || null,
    }));
}



export async function updateOwner(id: string, payload: UpdateOwnerPayload) {
    const { data, error } = await supabase
        .from('owner')
        .update({
            owner_name: payload.owner_name,
            owner_address: payload.owner_address || null,
            owner_phone: payload.owner_phone || null,
            owner_email: payload.owner_email,
            owner_website: payload.owner_website,
            owner_active: payload.owner_active,
        })
        .eq('owner_id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as OwnerData;
}

export async function deleteOwner(id: string, deletedByUserId: number) {
    // Fetch full owner record
    const { data: owner, error: fetchError } = await supabase
        .from('owner')
        .select('*')
        .eq('owner_id', id)
        .single();

    if (fetchError || !owner) throw new Error('Organization not found');

    // Fetch all users belonging to this owner
    const { data: users } = await supabase
        .from('users')
        .select('user_id, username, email, first_name, last_name, phone, user_role, user_type, fk_owner_id, created_at')
        .eq('fk_owner_id', id);

    // Archive owner to deleted_owner
    const { error: archiveOwnerError } = await supabase
        .from('deleted_owner')
        .insert({
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
        });

    if (archiveOwnerError) throw new Error(archiveOwnerError.message);

    if (users && users.length > 0) {
        const deletedUsers = users.map((user: any) => ({
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
        }));

        const { error: archiveUsersError } = await supabase
            .from('deleted_user')
            .insert(deletedUsers);

        if (archiveUsersError) {
            console.error('Failed to archive users:', archiveUsersError);
        }

        // Soft-delete users, set user_active = 'N'
        const userIds = users.map((u: any) => u.user_id);

        const { error: deactivateUsersError } = await supabase
            .from('users')
            .update({ user_active: 'N' })
            .in('user_id', userIds);

        if (deactivateUsersError) {
            console.error('Failed to deactivate users:', deactivateUsersError);
        }

        // Deactivate user_owner relationships
        const { error: deactivateRelError } = await supabase
            .from('user_owner')
            .update({ is_active: false })
            .eq('fk_owner_id', id);

        if (deactivateRelError) {
            console.error('Failed to deactivate user_owner:', deactivateRelError);
        }
    }

    // Soft-delete owner, set owner_active = 'N'
    const { error: deactivateOwnerError } = await supabase
        .from('owner')
        .update({ owner_active: 'N' })
        .eq('owner_id', id);

    if (deactivateOwnerError) throw new Error(deactivateOwnerError.message);

    return true;
}


export async function addOwnerWithAdmin(payload: AddOwnerWithAdminPayload) {
    const { data: existing } = await supabase
        .from('owner')
        .select('owner_id')
        .eq('owner_code', payload.owner_code)
        .single();

    if (existing) throw new Error('Organization code already exists');

    const { data: existingUser } = await supabase
        .from('users')
        .select('user_id, email, username')
        .or(`email.ilike.${payload.admin_email},username.eq.${payload.admin_username}`)
        .maybeSingle();

    if (existingUser) {
        if (existingUser.email?.toLowerCase() === payload.admin_email.toLowerCase()) {
            throw new Error('Admin email is already registered');
        }
        if (existingUser.username === payload.admin_username) {
            throw new Error('Admin username is already taken');
        }
    }

    const { data: owner, error: ownerError } = await supabase
        .from('owner')
        .insert({
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
            tax_id: payload.tax_id || null,
            registration_number: payload.registration_number || null,
            license_number: payload.license_number || null,
            license_expiry: payload.license_expiry || null,
        })
        .select()
        .single();

    if (ownerError) throw new Error(ownerError.message);

    try {
        const uid = generateUniqueCode();
        const key = generateActivationToken(128);
        const nameParts = payload.admin_fullname.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const { data: adminUser, error: userError } = await supabase
            .from('users')
            .insert({
                username: payload.admin_username,
                email: payload.admin_email,
                password_hash: uid,
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
                _key_: key,
            })
            .select()
            .single();

        if (userError) throw new Error(userError.message);

        const { error: userOwnerError } = await supabase
            .from('user_owner')
            .insert({
                fk_user_id: adminUser.user_id,
                fk_owner_id: owner.owner_id,
                relationship_type: 'OWNER_ADMIN',
                role_in_organization: 'Administrator',
                is_primary: true,
                is_active: true,
            });

        if (userOwnerError) throw new Error(userOwnerError.message);

        const { error: profileError } = await supabase
            .from('users_profile')
            .insert({
                fk_user_id: adminUser.user_id,
                address: payload.owner_address || null,
            });

        if (profileError) throw new Error(profileError.message);

        const activationLink = `${env.APP_URL}/auth/activate?o=${owner.owner_id}&email=${payload.admin_email}&username=${payload.admin_username}&id=${key}`;

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
        await supabase.from('owner').delete().eq('owner_id', owner.owner_id);
        throw error;
    }
}