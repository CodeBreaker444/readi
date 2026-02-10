import { config } from 'dotenv';
import { resolve } from 'path';
import "server-only";

config({ path: resolve(__dirname, '../../../.env') });

export const env = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ,
  JWT_SECRET: process.env.JWT_SECRET ,
};
 