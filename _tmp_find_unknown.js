require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const rows = await prisma.public_users.findMany({
    where: { user_role: 'Unknown' },
    select: { user_id: true, username: true, email: true, fk_user_profile_id: true, fk_owner_id: true, first_name: true, last_name: true },
  });
  console.log(JSON.stringify(rows, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
