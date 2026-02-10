import { clientEnv } from '@/config/environ';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

if(!clientEnv.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY){
  throw('supabase env is missing')
}

export const supabase = createClient(clientEnv.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});