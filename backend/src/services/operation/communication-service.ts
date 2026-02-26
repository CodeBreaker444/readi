import { supabase } from '@/backend/database/database';
import {
    buildS3Url,
    uploadFileToS3
} from '@/lib/s3Client';


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

 
function buildCommS3Key(
  procedureName: string,
  contextId: number,
  filename: string
): string {
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

  const { data: commRecord, error: commErr } = await supabase
    .from('communication_general')
    .insert({
      fk_owner_id:       params.ownerId,
      subject:           `[${params.procedureName.toUpperCase()}] Message`,
      message:           params.communicationMessage,
      communication_type: params.procedureName,
      priority:          params.communicationLevel === 'danger'
                           ? 'HIGH'
                           : params.communicationLevel === 'warning'
                           ? 'MEDIUM'
                           : 'LOW',
      status:            'SENT',
      sent_by_user_id:   params.userId,
      recipients:        params.communicationTo,   // stored as JSONB array of user_ids
      attachments: attachmentPath
        ? [{
            filename: attachmentFilename,
            path:     attachmentPath,
            size:     attachmentSize,
          }]
        : null,
      sent_at: new Date().toISOString(),
    })
    .select('communication_id')
    .single();

  if (commErr) {
    throw new Error(`Failed to save communication: ${commErr.message}`);
  }

  const newId = commRecord.communication_id as number;

  if (params.communicationTo.length > 0) {
    const notifications = params.communicationTo.map((recipientId) => ({
      fk_user_id:           recipientId,
      notification_type:    'COMMUNICATION',
      notification_title:   `New ${params.procedureName.replace(/_/g, ' ')} message`,
      notification_message: params.communicationMessage.slice(0, 200),
      notification_data: {
        communication_id: newId,
        procedure:        params.procedureName,
        level:            params.communicationLevel,
        from_user_id:     params.userId,
        fk_evaluation_id: params.fkEvaluationId || null,
        fk_planning_id:   params.fkPlanningId   || null,
        fk_mission_id:    params.fkMissionId    || null,
      },
      priority: params.communicationLevel === 'danger'
        ? 'HIGH'
        : params.communicationLevel === 'warning'
        ? 'MEDIUM'
        : 'LOW',
      is_read: false,
    }));

    const { error: notifErr } = await supabase
      .from('notification')
      .insert(notifications);

    if (notifErr) {
      console.warn('[communicationService] Failed to create notifications:', notifErr.message);
    }
  }

  const userComms = params.communicationTo.map((recipientId) => ({
    fk_user_id:          recipientId,
    fk_owner_id:         params.ownerId,
    communication_code:  `COMM-${newId}`,
    communication_desc:  params.communicationMessage.slice(0, 255),
    communication_json: {
      communication_id:   newId,
      procedure:          params.procedureName,
      level:              params.communicationLevel,
      from_user_id:       params.userId,
      from_email:         params.userEmail,
      fk_evaluation_id:   params.fkEvaluationId || null,
      fk_planning_id:     params.fkPlanningId   || null,
      fk_mission_id:      params.fkMissionId    || null,
      fk_vehicle_id:      params.fkVehicleId    || null,
      fk_client_id:       params.fkClientId     || null,
      attachment_path:    attachmentPath,
    },
    communication_ver:    1,
    communication_active: 'Y',
  }));

  if (userComms.length > 0) {
    const { error: ucErr } = await supabase.from('communication').insert(userComms);
    if (ucErr) {
      console.warn('[communicationService] Failed to insert user comms:', ucErr.message);
    }
  }

  return { newId };
}

export async function fetchUsers(ownerId:number) {
     const { data, error } = await supabase
      .from('users')
      .select('user_id, first_name, last_name, email, user_role')
      .eq('fk_owner_id', ownerId)
      .eq('user_active', 'Y')
      .order('first_name');

    if (error) throw error;
    return data
}