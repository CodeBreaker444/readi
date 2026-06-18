import { prisma } from '@/lib/prisma';
import { sendNotificationEmail } from '../../../../lib/resend/mail';
import { buildS3Url, uploadFileToS3 } from '@/lib/s3Client';


export interface SendCommunicationParams {
  ownerId: number;
  userId: number;
  userEmail: string;
  procedureName: string;
  fkEvaluationId: number;
  fkPlanningId: number;
  fkMissionId: number;
  fkVehicleId: number;
  fkClientId: number;
  communicationLevel: string;
  communicationMessage: string;
  communicationTo: number[];
  file: File | null;
}

export interface SendCommunicationResult {
  newId: number;
}

function buildCommS3Key(procedureName: string, contextId: number, filename: string): string {
  const sanitized = filename.replace(/[^a-z0-9._-]/gi, '_');
  return `communication/${procedureName}/${contextId}/${Date.now()}_${sanitized}`;
}

function resolveContextId(params: SendCommunicationParams): number {
  switch (params.procedureName) {
    case 'evaluation':      return params.fkEvaluationId;
    case 'planning':        return params.fkPlanningId;
    case 'mission':
    case 'mission_plan':
    case 'mission_emergency':
    case 'vehicle':         return params.fkMissionId;
    case 'operation':
    default:                return params.fkMissionId || params.userId;
  }
}


export async function sendGeneralCommunication(
  params: SendCommunicationParams
): Promise<SendCommunicationResult> {
  let attachmentPath: string | null = null;
  let attachmentFilename: string | null = null;
  let attachmentSize: number | null = null;

  if (params.file) {
    const contextId = resolveContextId(params);
    const key = buildCommS3Key(params.procedureName, contextId, params.file.name);
    await uploadFileToS3(key, params.file);
    attachmentPath = buildS3Url(key);
    attachmentFilename = params.file.name;
    attachmentSize = params.file.size;
  }

  const priority =
    params.communicationLevel === 'danger' ? 'HIGH' :
    params.communicationLevel === 'warning' ? 'MEDIUM' : 'LOW';

  const commRecord = await prisma.communication_general.create({
    data: {
      fk_owner_id: params.ownerId,
      subject: `[${params.procedureName.toUpperCase()}] Message`,
      message: params.communicationMessage,
      communication_type: params.procedureName,
      priority,
      status: 'SENT',
      sent_by_user_id: params.userId,
      recipients: params.communicationTo,
      attachments: attachmentPath
        ? [{ filename: attachmentFilename, path: attachmentPath, size: attachmentSize }]
        : undefined,
      sent_at: new Date(),
    },
    select: { communication_id: true },
  });

  const newId = commRecord.communication_id;

  if (params.communicationTo.length > 0) {
    await prisma.notification.createMany({
      data: params.communicationTo.map((recipientId) => ({
        fk_user_id: recipientId,
        notification_type: 'COMMUNICATION',
        notification_title: `New ${params.procedureName.replace(/_/g, ' ')} message`,
        notification_message: params.communicationMessage.slice(0, 200),
        notification_data: {
          communication_id: newId,
          procedure: params.procedureName,
          level: params.communicationLevel,
          from_user_id: params.userId,
          fk_evaluation_id: params.fkEvaluationId || null,
          fk_planning_id: params.fkPlanningId || null,
          fk_mission_id: params.fkMissionId || null,
        },
        priority,
        is_read: false,
      })),
    });

    const ownerRow = await prisma.owner.findUnique({
      where: { owner_id: params.ownerId },
      select: { email_notifications_enabled: true },
    });

    if (ownerRow?.email_notifications_enabled) {
      const recipientUsers = await prisma.public_users.findMany({
        where: { user_id: { in: params.communicationTo }, user_active: 'Y' },
        select: { email: true },
      });

      const emails = recipientUsers.map((u) => u.email).filter(Boolean) as string[];
      if (emails.length) {
        const emailTitle = `New ${params.procedureName.replace(/_/g, ' ')} message`;
        sendNotificationEmail(emails, emailTitle, params.communicationMessage, params.procedureName.toUpperCase(), null);
      }
    }

    if (params.communicationTo.length > 0) {
      await prisma.communication.createMany({
        data: params.communicationTo.map((recipientId) => ({
          fk_user_id: recipientId,
          fk_owner_id: params.ownerId,
          communication_code: `COMM-${newId}`,
          communication_desc: params.communicationMessage.slice(0, 255),
          communication_json: {
            communication_id: newId,
            procedure: params.procedureName,
            level: params.communicationLevel,
            from_user_id: params.userId,
            from_email: params.userEmail,
            fk_evaluation_id: params.fkEvaluationId || null,
            fk_planning_id: params.fkPlanningId || null,
            fk_mission_id: params.fkMissionId || null,
            fk_vehicle_id: params.fkVehicleId || null,
            fk_client_id: params.fkClientId || null,
            attachment_path: attachmentPath,
          },
          communication_ver: 1,
          communication_active: 'Y',
        })),
      }).catch((err) => {
        console.warn('[communicationService] Failed to insert user comms:', err.message);
      });
    }
  }

  return { newId };
}

export async function fetchUsers(ownerId: number) {
  const data = await prisma.public_users.findMany({
    where: { fk_owner_id: ownerId, user_active: 'Y' },
    orderBy: { first_name: 'asc' },
    select: { user_id: true, first_name: true, last_name: true, email: true, user_role: true },
  });

  return data;
}
