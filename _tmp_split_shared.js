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

  console.log(`Splitting ${groups.length} shared training groups...`);

  for (const g of groups) {
    const training = await prisma.training.findUnique({ where: { training_id: g.fk_training_id } });
    const rows = await prisma.training_attendance.findMany({
      where: { fk_training_id: g.fk_training_id },
      orderBy: { attendance_id: 'asc' },
    });

    // Keep the original training row attached to the first attendance record;
    // clone a fresh training row for every other attendee in the group.
    const [keep, ...rest] = rows;
    console.log(`training_id ${g.fk_training_id} ("${training.training_name}"): keeping attendance_id ${keep.attendance_id} as-is, cloning for ${rest.map(r => r.attendance_id).join(', ')}`);

    for (const r of rest) {
      const cloned = await prisma.training.create({
        data: {
          fk_owner_id: training.fk_owner_id,
          training_code: training.training_code,
          training_name: training.training_name,
          training_description: training.training_description,
          training_type: training.training_type,
          training_duration: training.training_duration,
          training_cost: training.training_cost,
          trainer_user_id: training.trainer_user_id,
          training_active: training.training_active,
        },
        select: { training_id: true },
      });

      await prisma.training_attendance.update({
        where: { attendance_id: r.attendance_id },
        data: { fk_training_id: cloned.training_id },
      });

      console.log(`  attendance_id ${r.attendance_id} -> new training_id ${cloned.training_id}`);
    }
  }

  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
