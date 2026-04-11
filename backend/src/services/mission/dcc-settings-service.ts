import 'server-only';
import { supabase } from '@/backend/database/database';

export interface DccIntegration {
  id: number;
  fk_owner_id: number;
  display_name: string;
  callback_url: string;
  created_at: string;
  updated_at: string;
}

export async function getDccIntegration(ownerId: number): Promise<DccIntegration | null> {
  const { data, error } = await supabase
    .from('dcc_integrations')
    .select('*')
    .eq('fk_owner_id', ownerId)
    .single();

  if (error || !data) return null;
  return data as DccIntegration;
}

export async function upsertDccIntegration(
  ownerId: number,
  displayName: string,
  callbackUrl: string,
): Promise<void> {
  const { error } = await supabase
    .from('dcc_integrations')
    .upsert(
      {
        fk_owner_id: ownerId,
        display_name: displayName,
        callback_url: callbackUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'fk_owner_id' },
    );

  if (error) throw new Error(`upsertDccIntegration: ${error.message}`);
}

export async function getDccCallbackUrl(ownerId: number): Promise<string | null> {
  const integration = await getDccIntegration(ownerId);
  return integration?.callback_url ?? null;
}
