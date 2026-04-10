import { supabase } from '@/backend/database/database';

type MissionTaskContainer = {
  tasks?: any[];
};

function normalizeJson(value: unknown): MissionTaskContainer {
  if (!value) return { tasks: [] };
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return { tasks: [] };
    }
  }
  if (typeof value === 'object') return value as MissionTaskContainer;
  return { tasks: [] };
}

function recomputeTaskCompleted(task: any): any {
  const sections = ['checklist', 'assignment', 'communication'] as const;

  let allDone = true;
  for (const section of sections) {
    const items = Array.isArray(task?.[section]) ? task[section] : [];
    for (const item of items) {
      const key = `${section}_completed`;
      if (String(item?.[key] ?? '').toUpperCase() !== 'Y') {
        allDone = false;
        break;
      }
    }
    if (!allDone) break;
  }

  if (allDone) {
    task.task_completed = true;
    task.task_completed_date = new Date().toISOString().slice(0, 10);
  } else {
    task.task_completed = false;
    task.task_completed_date = null;
  }

  return task;
}

export async function updateMissionChecklistTask(params: {
  missionId: number;
  ownerId: number;
  checklistCode: string;
  checklistData: Record<string, unknown>;
  userId: number;
  userFullname: string;
  userRole: string;
}) {
  const { data: mission, error } = await supabase
    .from('pilot_mission')
    .select('pilot_mission_id, fk_owner_id, mission_json')
    .eq('pilot_mission_id', params.missionId)
    .eq('fk_owner_id', params.ownerId)
    .single();

  if (error || !mission) throw new Error('Mission not found');

  const missionJson = normalizeJson((mission as any).mission_json);

  for (const task of missionJson.tasks ?? []) {
    if (!Array.isArray(task.checklist)) continue;

    for (const item of task.checklist) {
      if (item?.checklist_code === params.checklistCode) {
        item.checklist_completed = 'Y';
        item.checklist_completed_date = new Date().toISOString().slice(0, 10);
        item.checklist_signature_username = params.userFullname;
        item.checklist_signature_user_id = params.userId;
        item.checklist_signature_user_profile = params.userRole;
        item.checklist_data = params.checklistData;
      }
    }

    recomputeTaskCompleted(task);
  }

  const { error: updateError } = await supabase
    .from('pilot_mission')
    .update({ mission_json: missionJson })
    .eq('pilot_mission_id', params.missionId)
    .eq('fk_owner_id', params.ownerId);

  if (updateError) throw new Error(updateError.message);
  return { updated: true };
}

export async function updateMissionCommunicationTask(params: {
  missionId: number;
  ownerId: number;
  taskId: number;
  communicationId: number;
  communicationMessage: string;
  toUserId: number;
  userId: number;
  userEmail: string;
}) {
  const { data: mission, error } = await supabase
    .from('pilot_mission')
    .select('pilot_mission_id, fk_owner_id, mission_json')
    .eq('pilot_mission_id', params.missionId)
    .eq('fk_owner_id', params.ownerId)
    .single();

  if (error || !mission) throw new Error('Mission not found');

  const missionJson = normalizeJson((mission as any).mission_json);

  for (const task of missionJson.tasks ?? []) {
    if (Number(task?.task_id) !== Number(params.taskId)) continue;
    if (!Array.isArray(task.communication)) continue;

    for (const comm of task.communication) {
      if (Number(comm?.communication_id) === Number(params.communicationId)) {
        comm.communication_completed = 'Y';
        comm.communication_completed_date = new Date().toISOString().slice(0, 10);
        comm.communication_message = params.communicationMessage;
        comm.communication_to = params.toUserId;
      }
    }

    recomputeTaskCompleted(task);
  }

  const { error: updateError } = await supabase
    .from('pilot_mission')
    .update({ mission_json: missionJson })
    .eq('pilot_mission_id', params.missionId)
    .eq('fk_owner_id', params.ownerId);

  if (updateError) throw new Error(updateError.message);

  await supabase.from('notification').insert({
    fk_user_id: params.toUserId,
    notification_type: 'COMMUNICATION',
    notification_title: 'New mission task communication',
    notification_message: params.communicationMessage.slice(0, 200),
    is_read: false,
    priority: 'MEDIUM',
  });

  return { updated: true };
}

export async function getMissionTaskData(params: { missionId: number; ownerId: number }) {
  const { data, error } = await supabase
    .from('pilot_mission')
    .select('*')
    .eq('pilot_mission_id', params.missionId)
    .eq('fk_owner_id', params.ownerId)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Mission not found');

  const missionJson = normalizeJson((data as any).mission_json ?? null);
  return {
    mission_id: (data as any).pilot_mission_id as number,
    tasks: Array.isArray(missionJson.tasks) ? missionJson.tasks : [],
  };
}
