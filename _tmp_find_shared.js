require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const groups = await prisma.training_attendance.groupBy({
    by: ['fk_training_id'],
    _count: { attendance_id: true },
    having: {
      attendance_id: { _count: { gt: 1 } },
    },
  });

  console.log(`Found ${groups.length} training_id groups with >1 attendance row`);

  for (const g of groups) {
    const rows = await prisma.training_attendance.findMany({
      where: { fk_training_id: g.fk_training_id },
      select: {
        attendance_id: true,
        fk_training_id: true,
        fk_user_id: true,
        certification_number: true,
        training_session_date: true,
        users: { select: { first_name: true, last_name: true } },
      },
    });
    const training = await prisma.training.findUnique({
      where: { training_id: g.fk_training_id },
      select: { training_id: true, training_name: true, training_type: true, certificate_type: true, fk_owner_id: true },
    });
    console.log('---');
    console.log('training:', training);
    console.log('attendance rows:', rows.map(r => ({
      attendance_id: r.attendance_id,
      user: `${r.users?.first_name ?? ''} ${r.users?.last_name ?? ''}`.trim(),
      user_id: r.fk_user_id,
      session_code: r.certification_number,
    })));
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
