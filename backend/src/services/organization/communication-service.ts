import { supabase } from "@/backend/database/database";
import { AddCommunicationPayload, Communication, CommunicationListResponse, DeleteCommunicationPayload } from "@/config/types/communication";
 

export async function fetchCommunicationList(
  ownerId: number
): Promise<CommunicationListResponse> {

  const { data, error, count } = await supabase
    .from("communication")
    .select("*", { count: "exact" })
    .eq("fk_owner_id", ownerId)
    .order("communication_id", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch communications: ${error.message}`);
  }

  return {
    code: 1,
    message: "OK",
    dataRows: count ?? data?.length ?? 0,
    data: (data as Communication[]) ?? [],
  };
}


export async function addCommunication(
  payload: AddCommunicationPayload,
  ownerId: number,
  userId: number
): Promise<Communication> {

  let parsedJson: object | null = null;
  if (payload.communication_json?.trim()) {
    try {
      parsedJson = JSON.parse(payload.communication_json);
    } catch {
      throw new Error("Invalid JSON format for communication_json.");
    }
  }

  const { data, error } = await supabase
    .from("communication")
    .insert({
      fk_user_id: userId,            
      fk_owner_id: ownerId,
      communication_code: payload.communication_code,
      communication_desc: payload.communication_desc,
      communication_ver: payload.communication_ver,
      communication_active: payload.communication_active,
      communication_json: parsedJson,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Code "${payload.communication_code}" already exists for this owner.`);
    }
    throw new Error(`Failed to add communication: ${error.message}`);
  }

  return data as Communication;
}


export async function deleteCommunication(
  payload: DeleteCommunicationPayload,ownerId: number
): Promise<{ code: number; message: string }> {

  const { data: existing, error: fetchError } = await supabase
    .from("communication")
    .select("communication_id, communication_active")
    .eq("communication_id", payload.communication_id)
    .eq("fk_owner_id", ownerId)
    .single();

  if (fetchError || !existing) {
    return { code: 0, message: "Communication not found." };
  }

  if (existing.communication_active === "Y") {
    return {
      code: 0,
      message: "Cannot delete an active communication. Set it to inactive first.",
    };
  }

  const { error } = await supabase
    .from("communication")
    .delete()
    .eq("communication_id", payload.communication_id)
    .eq("fk_owner_id", ownerId);

  if (error) {
    throw new Error(`Failed to delete communication: ${error.message}`);
  }

  return { code: 1, message: "Communication deleted successfully." };
}
export async function updateCommunication(
  communicationId: number,
  ownerId: number,
  payload: {
    communication_code: string;
    communication_desc: string;
    communication_ver: string;
    communication_active: "Y" | "N";
    communication_json?: string;
  }
): Promise<{ code: number; message: string; data?: Communication }> {

  const { data: existing, error: fetchError } = await supabase
    .from("communication")
    .select("communication_id")
    .eq("communication_id", communicationId)
    .eq("fk_owner_id", ownerId)
    .single();

  if (fetchError || !existing) {
    return { code: 0, message: "Communication not found." };
  }

  let parsedJson: object | null = null;
  if (payload.communication_json?.trim()) {
    try {
      parsedJson = JSON.parse(payload.communication_json);
    } catch {
      return { code: 0, message: "Invalid JSON format for communication_json." };
    }
  }

  const { data, error } = await supabase
    .from("communication")
    .update({
      communication_code: payload.communication_code,
      communication_desc: payload.communication_desc,
      communication_ver: payload.communication_ver,
      communication_active: payload.communication_active,
      communication_json: parsedJson,
    })
    .eq("communication_id", communicationId)
    .eq("fk_owner_id", ownerId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        code: 0,
        message: `Code "${payload.communication_code}" already exists for this owner.`,
      };
    }
    throw new Error(`Failed to update communication: ${error.message}`);
  }

  return { code: 1, message: "Communication updated successfully.", data: data as Communication };
}