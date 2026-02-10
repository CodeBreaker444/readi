const  SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  
const  SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET


export const serverEnv = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    JWT_SECRET
}