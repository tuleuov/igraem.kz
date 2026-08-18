import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Clean Database Seeding (3 official users only)...');

  const password_hash = await bcrypt.hash('password123', 10);
  const fixedCreatedAt = new Date('2026-01-01T00:00:00.000Z');

  const targetUsers = [
    {
      iin: '890918350184',
      phone_number: '+77715269538',
      full_name: 'Ивкин Антон Витальевич',
      role: 'admin',
      birth_date: new Date('1989-09-18'),
      gender: 'male',
    },
    {
      iin: '890820350058',
      phone_number: '+77085965198',
      full_name: 'Бердников Дмитрий Николаевич',
      role: 'client',
      birth_date: new Date('1989-08-20'),
      gender: 'male',
    },
    {
      iin: '930615350124',
      phone_number: '+77771234567',
      full_name: 'Ивкин Александр Витальевич',
      role: 'client',
      birth_date: new Date('1993-06-15'),
      gender: 'male',
    },
  ];

  const targetIINs = targetUsers.map((u) => u.iin);

  // Clean up any test users not in the target list
  const unwantedUsers = await prisma.user.findMany({
    where: { iin: { notIn: targetIINs } },
    select: { id: true },
  });

  const unwantedIds = unwantedUsers.map((u) => u.id);

  if (unwantedIds.length > 0) {
    console.log(`🧹 Removing ${unwantedIds.length} obsolete test user(s)...`);
    await prisma.bookingGuest.deleteMany({ where: { user_id: { in: unwantedIds } } });
    await prisma.lockLog.deleteMany({ where: { user_id: { in: unwantedIds } } });
    await prisma.userBan.deleteMany({ where: { user_id: { in: unwantedIds } } });
    await prisma.booking.deleteMany({ where: { host_user_id: { in: unwantedIds } } });
    await prisma.user.deleteMany({ where: { id: { in: unwantedIds } } });
  }

  // Upsert target users with fixed created_at = 2026-01-01T00:00:00.000Z
  for (const userDef of targetUsers) {
    await prisma.user.upsert({
      where: { iin: userDef.iin },
      update: {
        phone_number: userDef.phone_number,
        full_name: userDef.full_name,
        role: userDef.role,
        created_at: fixedCreatedAt,
        is_banned: false,
        banned_until: null,
        is_blocked: false,
      },
      create: {
        iin: userDef.iin,
        phone_number: userDef.phone_number,
        full_name: userDef.full_name,
        birth_date: userDef.birth_date,
        gender: userDef.gender,
        role: userDef.role,
        password_hash,
        created_at: fixedCreatedAt,
      },
    });
  }

  // Sports Grounds for School #11
  const footballGround = await prisma.ground.upsert({
    where: { qr_code_token: 'QR_SCHOOL11_FOOTBALL' },
    update: {
      latitude: 50.060371,
      longitude: 72.993374,
      rating: 0.0,
      is_school_court: true,
      school_days: 'VACATION',
      school_hours_start: '08:00',
      school_hours_end: '15:00',
    },
    create: {
      name: 'Спортивная площадка Школа №11 (Футбольное поле)',
      type: 'football',
      address: 'Школа №11',
      latitude: 50.060371,
      longitude: 72.993374,
      operating_schedule: '08:00 - 23:00',
      cost_per_hour: 10000,
      rating: 0.0,
      is_school_court: true,
      school_days: 'VACATION',
      school_hours_start: '08:00',
      school_hours_end: '15:00',
      qr_code_token: 'QR_SCHOOL11_FOOTBALL',
      ttlock_lock_id: 'LOCK_SCHOOL11_FOOTBALL_101',
      ttlock_mac_address: 'AA:BB:CC:DD:11:01',
    },
  });

  const basketballGround = await prisma.ground.upsert({
    where: { qr_code_token: 'QR_SCHOOL11_BASKETBALL' },
    update: {
      latitude: 50.060371,
      longitude: 72.993374,
      rating: 0.0,
      is_school_court: true,
      school_days: 'VACATION',
      school_hours_start: '08:00',
      school_hours_end: '15:00',
    },
    create: {
      name: 'Спортивная площадка Школа №11 (Баскетбольная площадка)',
      type: 'basketball',
      address: 'Школа №11',
      latitude: 50.060371,
      longitude: 72.993374,
      operating_schedule: '08:00 - 23:00',
      cost_per_hour: 8000,
      rating: 0.0,
      is_school_court: true,
      school_days: 'VACATION',
      school_hours_start: '08:00',
      school_hours_end: '15:00',
      qr_code_token: 'QR_SCHOOL11_BASKETBALL',
      ttlock_lock_id: 'LOCK_SCHOOL11_BASKETBALL_102',
      ttlock_mac_address: 'AA:BB:CC:DD:11:02',
    },
  });

  // Wi-Fi Gateways
  await prisma.gateway.upsert({
    where: { ttlock_gateway_id: 'GW_SCHOOL11_FOOTBALL_01' },
    update: { ground_id: footballGround.id },
    create: {
      ground_id: footballGround.id,
      gateway_name: 'TTLock Gateway #1 (Школа №11 - Футбол)',
      ttlock_gateway_id: 'GW_SCHOOL11_FOOTBALL_01',
      status: 'online',
    },
  });

  await prisma.gateway.upsert({
    where: { ttlock_gateway_id: 'GW_SCHOOL11_BASKETBALL_02' },
    update: { ground_id: basketballGround.id },
    create: {
      ground_id: basketballGround.id,
      gateway_name: 'TTLock Gateway #2 (Школа №11 - Баскетбол)',
      ttlock_gateway_id: 'GW_SCHOOL11_BASKETBALL_02',
      status: 'online',
    },
  });

  console.log('🎉 Seeding completed! Database contains only Anton, Dmitriy, Aleksandr.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

