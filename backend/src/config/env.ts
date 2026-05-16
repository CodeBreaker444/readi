import fs from "fs";
import path from "path";
import "server-only";

const flytrelayPublicKey = fs.readFileSync(
  path.join(process.cwd(), "backend/src/config/keys/flytrelay-public.pem"),
  "utf-8"
);

export const env = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET: process.env.JWT_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  APP_URL: process.env.APP_URL,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  FLYTBASE_TOKEN_ENCRYPTION_KEY: process.env.FLYTBASE_TOKEN_ENCRYPTION_KEY,
  FLYTBASE_URL: process.env.FLYTBASE_URL,
  READI_DRONE_PRIVATE_KEY: process.env.READI_DRONE_PRIVATE_KEY,
  FLYTRELAY_PUBLIC_KEY: flytrelayPublicKey,
  FLYTRELAY_BASE_URL: process.env.FLYTRELAY_BASE_URL,
  OPENSKY_USERNAME: process.env.OPENSKY_USERNAME,
  OPENSKY_PASSWORD: process.env.OPENSKY_PASSWORD,
  OPENAIP_API_KEY: process.env.OPENAIP_API_KEY,
  OPENAIP_BASE: process.env.OPENAIP_BASE
};
