import { prisma } from './prisma.js';
import bcrypt from 'bcryptjs';
import { logger } from '../core/logger.js';

async function main(): Promise<void> {
  logger.info('Starting database seed...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@servcraft.local' },
    update: {},
    create: {
      email: 'admin@servcraft.local',
      password: hashedPassword,
      name: 'Administrator',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  logger.info({ userId: admin.id }, 'Admin user created/updated');

  // Create default settings
  const defaultSettings = [
    { key: 'app.name', value: 'Servcraft', type: 'string', group: 'general' },
    { key: 'app.description', value: 'A modular Node.js backend framework', type: 'string', group: 'general' },
    { key: 'auth.registration_enabled', value: true, type: 'boolean', group: 'auth' },
    { key: 'auth.email_verification_required', value: false, type: 'boolean', group: 'auth' },
    { key: 'email.enabled', value: false, type: 'boolean', group: 'email' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
        type: setting.type,
        group: setting.group,
      },
    });
  }

  logger.info('Default settings created');
  logger.info('Seed completed successfully');
}

main()
  .catch((e) => {
    logger.error({ err: e }, 'Seed failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
