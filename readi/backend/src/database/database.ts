import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

if(!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY){
  throw('supabase env is missing')
}

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});