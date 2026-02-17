import { addOwnerWithAdmin, getOwners } from "@/backend/services/company/owner-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextResponse } from "next/server";
import z from "zod";

const GET = async () => {
    try {
        const session = await getUserSession();
        if (!session) return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });

        if (session.user.role !== 'SUPERADMIN') {
            return NextResponse.json({ code: 0, message: "Forbidden" }, { status: 403 });
        }

        const owners = await getOwners();
        return NextResponse.json({ code: 1, data: owners });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
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
        if (!session) return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });

        if (session.user.role !== 'SUPERADMIN') {
            return NextResponse.json({ code: 0, message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();

        const validation = ownerValidation.safeParse(body);

        if (!validation.success) {
            const errorMessages = validation.error;
            return NextResponse.json({ code: 0, message: `Validation error: ${errorMessages}` }, { status: 400 });
        }

        const result = await addOwnerWithAdmin(body);


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

    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 400 });
    }
}

export { GET, POST };
