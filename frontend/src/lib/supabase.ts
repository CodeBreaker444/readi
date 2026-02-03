import { createBrowserClient } from '@supabase/ssr'
import { serverEnv } from '../config/environ'

export const supabase = createBrowserClient(
  serverEnv.SUPABASE_URL!,
  serverEnv.SUPABASE_ANON_KEY!
)