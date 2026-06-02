import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Database Diagnostic Check...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  const usersCount = await prisma.user.count();
  const publisherCount = await prisma.publisher.count();
  const websiteCount = await prisma.website.count();
  const tagCount = await prisma.tag.count();
  const revShareCount = await prisma.revenueShareConfig.count();
  const reportsCount = await prisma.revenueReport.count();
  const uploadLogsCount = await prisma.uploadLog.count();

  console.log('\n📊 Row Counts in Active DB:');
  console.log(`- Users: ${usersCount}`);
  console.log(`- Publishers: ${publisherCount}`);
  console.log(`- Websites: ${websiteCount}`);
  console.log(`- Tags: ${tagCount}`);
  console.log(`- Revenue Share Configs: ${revShareCount}`);
  console.log(`- Revenue Reports: ${reportsCount}`);
  console.log(`- Upload Logs: ${uploadLogsCount}`);
}

main()
  .catch((e) => console.error('❌ Error during database check:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
