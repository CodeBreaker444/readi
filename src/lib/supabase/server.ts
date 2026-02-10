'use server';
import { clientEnv } from '@/config/environ';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

 
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    clientEnv.SUPABASE_URL!,
    clientEnv.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
           if (process.env.NODE_ENV === 'development') {
              console.warn(
                'Supabase tried to set cookies from a Server Component. ' +
                'This is expected and will be handled by middleware.'
              )
            }
            
            // don't use throw - middleware will handle session refresh
          }
        },
      },
    }
  )
}