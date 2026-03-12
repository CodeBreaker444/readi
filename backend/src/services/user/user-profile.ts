import { supabase } from '@/backend/database/database';
import { BUCKET, deleteFileFromS3, getPresignedDownloadUrl, s3 } from '@/lib/s3Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';

function buildAvatarS3Key(ownerId: number, userId: number, originalName: string): string {
  const ext = originalName.split('.').pop() ?? 'png';
  return `avatars/${ownerId}/${userId}/${Date.now()}.${ext}`;
}

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  user_timezone: string;
  user_type: string;
  avatar_url: string | null;
  users_profile: {
    user_signature: string | null;
    bio: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    profile_picture: string | null;
    profile_picture_s3_key: string | null;
  } | null;
}

export interface UpdateProfileParams {
  fullname: string;
  email: string;
  phone: string;
  timezone: string;
}

export async function getProfile(userId: number): Promise<ProfileData> {
  const { data, error } = await supabase
    .from('users')
    .select(
      `
      user_id,
      first_name,
      last_name,
      email,
      phone,
      user_timezone,
      user_type,
      users_profile!fk_user_id (
        profile_picture,
        user_signature,
        bio,
        address,
        city,
        state,
        postal_code
      )
    `,
    )
    .eq('user_id', userId)
    .single();

  if (error || !data) throw new Error('Profile not found');

  const profile = Array.isArray(data.users_profile)
    ? data.users_profile[0]
    : data.users_profile;

  let avatarUrl: string | null = null;
  if (profile?.profile_picture) {
    const pic = profile.profile_picture;
    if (pic.startsWith('avatars/') || pic.startsWith('profiles/')) {
      try {
        avatarUrl = await getPresignedDownloadUrl(pic, 3600); // 1 hour
      } catch {
        avatarUrl = null;
      }
    } else {
      avatarUrl = pic;
    }
  }

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');

  return {
    fullName,
    email: data.email ?? '',
    phone: data.phone ?? '',
    user_timezone: data.user_timezone ?? 'IST',
    user_type: data.user_type ?? '',
    avatar_url: avatarUrl,
    users_profile: profile
      ? {
          user_signature: profile.user_signature ?? null,
          bio: profile.bio ?? null,
          address: profile.address ?? null,
          city: profile.city ?? null,
          state: profile.state ?? null,
          postal_code: profile.postal_code ?? null,
          profile_picture: profile.profile_picture ?? null,
          profile_picture_s3_key: profile.profile_picture?.startsWith('avatars/')
            ? profile.profile_picture
            : null,
        }
      : null,
  };
}

export async function updateProfile(
  userId: number,
  ownerId: number,
  params: UpdateProfileParams,
  avatarFile?: File | null,
): Promise<{ success: boolean; message?: string; avatarUrl?: string | null }> {
  const nameParts = params.fullname.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || null;

  const { error: userErr } = await supabase
    .from('users')
    .update({
      first_name: firstName,
      last_name: lastName,
      email: params.email,
      phone: params.phone,
      user_timezone: params.timezone,
    })
    .eq('user_id', userId);

  if (userErr) {
    return { success: false, message: `Failed to update user: ${userErr.message}` };
  }

  let newAvatarUrl: string | null = null;
  if (avatarFile) {
    const { data: oldProfile } = await supabase
      .from('users_profile')
      .select('profile_picture')
      .eq('fk_user_id', userId)
      .single();

    if (oldProfile?.profile_picture?.startsWith('avatars/')) {
      try {
        await deleteFileFromS3(oldProfile.profile_picture);
      } catch {
        // Non-fatal: old file may already be gone
      }
    }

    const s3Key = buildAvatarS3Key(ownerId, userId, avatarFile.name);
    const buffer = Buffer.from(await avatarFile.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: avatarFile.type || 'image/png',
        ServerSideEncryption: 'AES256',
      }),
    );

    const { error: profileErr } = await supabase
      .from('users_profile')
      .upsert(
        {
          fk_user_id: userId,
          profile_picture: s3Key,
        },
        { onConflict: 'fk_user_id' },
      );

    if (profileErr) {
      return {
        success: false,
        message: `Avatar uploaded but DB update failed: ${profileErr.message}`,
      };
    }

    try {
      newAvatarUrl = await getPresignedDownloadUrl(s3Key, 3600);
    } catch {
      newAvatarUrl = null;
    }
  }

  return { success: true, avatarUrl: newAvatarUrl };
}

export async function getAvatarPresignedUrl(
  userId: number,
): Promise<string | null> {
  const { data } = await supabase
    .from('users_profile')
    .select('profile_picture')
    .eq('fk_user_id', userId)
    .single();

  if (!data?.profile_picture) return null;

  const pic = data.profile_picture;
  if (pic.startsWith('avatars/') || pic.startsWith('profiles/')) {
    try {
      return await getPresignedDownloadUrl(pic, 3600);
    } catch {
      return null;
    }
  }

  return pic;
}