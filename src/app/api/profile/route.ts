 
import { getProfile, updateProfile } from '@/backend/services/user/user-profile';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const updateProfileSchema = z.object({
  fullname: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Full name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(50, 'Phone number too long').optional().default(''),
  timezone: z
    .string()
    .max(64, 'Timezone too long')
    .optional()
    .default('Europe/Berlin'),
  easa_operator_code: z.string().max(100, 'EASA operator code too long').optional(),
});

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const user = await getProfile(session!.user.userId);

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const formData = await req.formData();

    const rawFields = {
      fullname: formData.get('fullname') as string | null,
      email: formData.get('email') as string | null,
      phone: formData.get('phone') as string | null,
      timezone: formData.get('timezone') as string | null,
      easa_operator_code: formData.get('easa_operator_code') as string | null,
    };

    const validated = updateProfileSchema.parse({
      fullname: rawFields.fullname ?? '',
      email: rawFields.email ?? '',
      phone: rawFields.phone ?? '',
      timezone: rawFields.timezone ?? 'Europe/Berlin',
      easa_operator_code: rawFields.easa_operator_code ?? undefined,
    });

    const avatarEntry = formData.get('avatar');
    let avatarFile: File | null = null;
    if (avatarEntry && avatarEntry instanceof File && avatarEntry.size > 0) {
      const maxSize = 10 * 1024 * 1024;  
      if (avatarEntry.size > maxSize) {
        return NextResponse.json(
          { success: false, message: 'Avatar file must be under 10MB' },
          { status: 400 },
        );
      }

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ];
      if (!allowedTypes.includes(avatarEntry.type)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Avatar must be JPEG, PNG, WebP, or GIF',
          },
          { status: 400 },
        );
      }

      avatarFile = avatarEntry;
    }

    const result = await updateProfile(
      session!.user.userId,
      session!.user.ownerId,
      validated,
      avatarFile,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      updateResult: true,
      avatarUrl: result.avatarUrl ?? null,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, errors: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return internalError(E.SV001, err);
  }
}