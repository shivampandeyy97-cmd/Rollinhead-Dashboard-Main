// =============================================================================
// Rollinhead Dashboard — Database Purge Script
// =============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all sample database records from live Supabase...');

  // 1. Delete in order of dependencies (leaves, then parents) to prevent foreign key errors
  const deletedNotificationRead = await prisma.notificationRead.deleteMany({});
  console.log(`- Deleted ${deletedNotificationRead.count} NotificationRead entries`);

  const deletedNotification = await prisma.notification.deleteMany({});
  console.log(`- Deleted ${deletedNotification.count} Notification entries`);

  const deletedAuditLog = await prisma.auditLog.deleteMany({});
  console.log(`- Deleted ${deletedAuditLog.count} AuditLog entries`);

  const deletedUploadLog = await prisma.uploadLog.deleteMany({});
  console.log(`- Deleted ${deletedUploadLog.count} UploadLog entries`);

  const deletedRevenueReport = await prisma.revenueReport.deleteMany({});
  console.log(`- Deleted ${deletedRevenueReport.count} RevenueReport entries`);

  const deletedTag = await prisma.tag.deleteMany({});
  console.log(`- Deleted ${deletedTag.count} Tag entries`);

  const deletedWebsite = await prisma.website.deleteMany({});
  console.log(`- Deleted ${deletedWebsite.count} Website entries`);

  const deletedRevShare = await prisma.revenueShareConfig.deleteMany({});
  console.log(`- Deleted ${deletedRevShare.count} RevenueShareConfig entries`);

  const deletedPublisher = await prisma.publisher.deleteMany({});
  console.log(`- Deleted ${deletedPublisher.count} Publisher entries`);

  // 2. Delete all users except the Super Admin
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        not: 'admin@rollinhead.com'
      }
    }
  });
  console.log(`- Deleted ${deletedUsers.count} publisher and guest User accounts`);

  console.log('\n✅ Supabase database is completely clean! Only the Super Admin (admin@rollinhead.com) remains.');
}

main()
  .catch((e) => {
    console.error('❌ Failed to purge Supabase database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
