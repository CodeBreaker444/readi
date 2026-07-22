import { getUserSession } from '@/lib/auth/server-session';
import { apiError, forbidden, internalError, unauthorized } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { id } = await params;
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return apiError(E.VL001);
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return apiError(E.VL001);
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            return apiError(E.VL001);
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory if it doesn't exist
        const uploadDir = join(process.cwd(), 'public', 'company-logos');
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${id}-${timestamp}${file.name.substring(file.name.lastIndexOf('.'))}`;
        const filepath = join(uploadDir, filename);

        // Write file
        await writeFile(filepath, buffer);

        // Return URL
        const url = `/company-logos/${filename}`;

        return NextResponse.json({ code: 1, url });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
