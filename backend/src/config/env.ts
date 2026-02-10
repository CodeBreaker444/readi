import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });

export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ,
  JWT_SECRET: process.env.JWT_SECRET ,
};
 