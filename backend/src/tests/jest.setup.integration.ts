import * as dotenv from 'dotenv';
import path from 'path';

// .env.test.local explicitly and let it win so TEST_ADMIN_EMAIL /
// TEST_ADMIN_PASSWORD / TEST_OWNER_ID actually reach the integration suite.
dotenv.config({ path: path.resolve(process.cwd(), '.env.test.local'), override: true });
