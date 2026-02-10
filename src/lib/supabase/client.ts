'use client'

import { clientEnv } from '@/config/environ'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    clientEnv.SUPABASE_URL!,
    clientEnv.SUPABASE_ANON_KEY!
  )
}

export const supabase = createClient()