import { addCommunicationGeneral } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { buildS3Url, uploadFileToS3 } from "@/lib/s3Client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const formData = await request.formData();
const sentByUserId = formData.get("sent_by_user_id") 
      ? Number(formData.get("sent_by_user_id")) 
      : session!.user.userId;
    const message = formData.get("message") as string | null;
    const communicationLevel = (formData.get("communication_level") as string) || "info";
    const fkClientId = formData.get("fk_client_id") as string | null;
    const fkPlanningId = formData.get("fk_planning_id") as string | null;
    const fkEvaluationId = formData.get("fk_evaluation_id") as string | null;
    const communicationTo = formData.getAll("communication_to[]").map((id) => Number(id));
    const file = formData.get("communication_file") as File | null;

    if (!message?.trim()) {
      return NextResponse.json({ code: 0, message: "Message is required" }, { status: 400 });
    }
    if (communicationTo.length === 0) {
      return NextResponse.json({ code: 0, message: "At least one recipient is required" }, { status: 400 });
    }

    let fileName: string | null = null;
    let fileKey: string | null = null;
    let fileUrl: string | null = null;

    if (file && file.size > 0) {
      const ext = file.name.split(".").pop() ?? "bin";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      fileKey = `communication/${session!.user.ownerId}/${Date.now()}_${safeName}`;
      fileName = file.name;

      await uploadFileToS3(fileKey, file);
      fileUrl = buildS3Url(fileKey);
    }

   const commId = await addCommunicationGeneral({
      fk_owner_id: session!.user.ownerId,
      subject: message.substring(0, 100), 
      message,
      communication_type: "mission",
      communication_level: communicationLevel,
      priority: communicationLevel === "danger" ? "high" : communicationLevel === "warning" ? "medium" : "normal",
      status: "sent",
      sent_by_user_id: sentByUserId, 
      recipients: communicationTo,
      fk_client_id: fkClientId ? Number(fkClientId) : null,
      fk_planning_id: fkPlanningId ? Number(fkPlanningId) : null,
      fk_evaluation_id: fkEvaluationId ? Number(fkEvaluationId) : null,
      communication_to: communicationTo,
      communication_file_name: fileName,
      communication_file_key: fileKey,
      communication_file_url: fileUrl,
    });

    return NextResponse.json({ code: 1, message: "Sent successfully", data: { communication_id: commId } });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
  }
}