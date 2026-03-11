import { updateToolStatus } from "@/backend/services/system/tool/tool-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ToolStatusSchema = z.object({
    tool_status: z.enum(['OPERATIONAL', 'NON_OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED']),
    notes: z.string().optional(),
});
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getUserSession();
        if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
            return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const parsedData = ToolStatusSchema.safeParse(body);

        if (!parsedData.success) {
            return NextResponse.json(
                {
                    code: 0,
                    status: "ERROR",
                    message: "Invalid input",
                    errors: parsedData.error.flatten(),
                },
                { status: 400 }
            );
        }

        const result = await updateToolStatus(Number(id), parsedData.data);

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { code: 0, status: 'ERROR', message: error.message },
            { status: 500 }
        );
    }
}