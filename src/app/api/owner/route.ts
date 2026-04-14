import { logEvent } from "@/backend/services/auditLog/audit-log";
import { addOwnerWithAdmin, getOwners } from "@/backend/services/company/owner-service";
import { getUserSession } from "@/lib/auth/server-session";
import { internalError, unauthorized, forbidden } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextResponse } from "next/server";
import z from "zod";

const GET = async () => {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);

        if (session.user.role !== 'SUPERADMIN') {
            return forbidden(E.PX004);
        }

        const owners = await getOwners();
        return NextResponse.json({ code: 1, data: owners });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}

const ownerValidation = z.object({
    owner_code: z.string().min(2, "Organization code must be at least 2 characters"),
    owner_name: z.string().min(2, "Organization name must be at least 2 characters"),
    owner_email: z.string().email("Invalid email format"),
    owner_website: z.string().url("Invalid website URL"),   
});

const POST = async (req: Request) => {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);

        if (session.user.role !== 'SUPERADMIN') {
            return forbidden(E.PX004);
        }

        const body = await req.json();

        const validation = ownerValidation.safeParse(body);

        if (!validation.success) {
            const errorMessages = validation.error.issues.map((e) => e.message).join(', ');
            return NextResponse.json({ code: 0, message: errorMessages }, { status: 400 });
        }

        const result = await addOwnerWithAdmin(body);


        logEvent({
            eventType: 'CREATE',
            entityType: 'company',
            entityId: result.owner.owner_id,
            description: `Created company '${result.owner.owner_name}' (${result.owner.owner_code})`,
            userId: session.user.userId,
            userName: session.user.fullname,
            userEmail: session.user.email,
            userRole: session.user.role,
            ownerId: session.user.ownerId,
            metadata: { owner_code: result.owner.owner_code },
        });

        return NextResponse.json({
            code: 1,
            message: 'Organization and admin created',
            data: result.owner,
            newCode: result.owner.owner_code,
            admin: {
                userId: result.admin.userId,
                emailSent: result.admin.emailSent,
            },
        });

    } catch (err) {
        return internalError(E.SV001, err);
    }
}

export { GET, POST };
