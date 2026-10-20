import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Raahat database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Admin Dispatcher
  const admin = await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: {},
    create: {
      phone: '9999999999',
      password: passwordHash,
      name: 'Central Control Dispatcher',
      role: 'ADMIN',
      verified: true,
      verificationStatus: 'APPROVED',
    },
  });

  // 2. Driver
  const driver = await prisma.user.upsert({
    where: { phone: '9888888888' },
    update: {},
    create: {
      phone: '9888888888',
      password: passwordHash,
      name: 'Ramesh Singh',
      role: 'DRIVER',
      vehicleNumber: 'DL-01-AMB-108',
      verified: true,
      verificationStatus: 'APPROVED',
    },
  });

  // 3. Officers stationed along Ring Road Corridor (Delhi demo coordinates)
  const officersData = [
    { name: 'Officer Vikramaditya', phone: '9777777701', badge: 'TP-101', lat: 28.6139, lng: 77.2090 },
    { name: 'Officer Neha Sharma', phone: '9777777702', badge: 'TP-102', lat: 28.6210, lng: 77.2150 },
    { name: 'Officer Rajesh Verma', phone: '9777777703', badge: 'TP-103', lat: 28.6280, lng: 77.2210 },
    { name: 'Officer Amit Patel', phone: '9777777704', badge: 'TP-104', lat: 28.6350, lng: 77.2270 },
    { name: 'Officer Sunita Rao', phone: '9777777705', badge: 'TP-105', lat: 28.6420, lng: 77.2330 },
  ];

  for (const off of officersData) {
    const user = await prisma.user.upsert({
      where: { phone: off.phone },
      update: {},
      create: {
        phone: off.phone,
        password: passwordHash,
        name: off.name,
        role: 'OFFICER',
        badgeNumber: off.badge,
        verified: true,
        verificationStatus: 'APPROVED',
        officerProfile: {
          create: {
            onDuty: true,
            currentLat: off.lat,
            currentLng: off.lng,
            lastLocationAt: new Date(),
          },
        },
      },
    });
  }

  console.log('Seeding completed successfully!');
  console.log('Admin: 9999999999 / password123');
  console.log('Driver: 9888888888 / password123');
  console.log('Officers: 9777777701..9777777705 / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
