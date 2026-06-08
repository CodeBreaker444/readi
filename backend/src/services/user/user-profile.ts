import { prisma } from '@/lib/prisma';
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
  const user = await prisma.public_users.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      user_timezone: true,
      user_type: true,
      users_profile: {
        select: {
          profile_picture: true,
          user_signature: true,
          bio: true,
          address: true,
          city: true,
          state: true,
          postal_code: true,
        },
      },
    },
  });

  if (!user) throw new Error('Profile not found');

  const profile = user.users_profile ?? null;

  let avatarUrl: string | null = null;
  if (profile?.profile_picture) {
    const pic = profile.profile_picture;
    if (pic.startsWith('avatars/') || pic.startsWith('profiles/')) {
      try {
        avatarUrl = await getPresignedDownloadUrl(pic, 3600);
      } catch {
        avatarUrl = null;
      }
    } else {
      avatarUrl = pic;
    }
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return {
    fullName,
    email: user.email ?? '',
    phone: user.phone ?? '',
    user_timezone: user.user_timezone ?? 'IST',
    user_type: user.user_type ?? '',
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

  try {
    await prisma.public_users.update({
      where: { user_id: userId },
      data: {
        first_name: firstName,
        last_name: lastName,
        email: params.email,
        phone: params.phone,
        user_timezone: params.timezone,
      },
    });
  } catch (err: any) {
    return { success: false, message: `Failed to update user: ${err?.message ?? err}` };
  }

  let newAvatarUrl: string | null = null;
  if (avatarFile) {
    const oldProfile = await prisma.users_profile.findUnique({
      where: { fk_user_id: userId },
      select: { profile_picture: true },
    });

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

    try {
      await prisma.users_profile.upsert({
        where: { fk_user_id: userId },
        update: { profile_picture: s3Key },
        create: { fk_user_id: userId, profile_picture: s3Key },
      });
    } catch (err: any) {
      return {
        success: false,
        message: `Avatar uploaded but DB update failed: ${err?.message ?? err}`,
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
  const profile = await prisma.users_profile.findUnique({
    where: { fk_user_id: userId },
    select: { profile_picture: true },
  });

  if (!profile?.profile_picture) return null;

  const pic = profile.profile_picture;
  if (pic.startsWith('avatars/') || pic.startsWith('profiles/')) {
    try {
      return await getPresignedDownloadUrl(pic, 3600);
    } catch {
      return null;
    }
  }

  return pic;
}
