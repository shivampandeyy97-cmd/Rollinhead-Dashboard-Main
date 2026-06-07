import { PrismaClient } from '@prisma/client';
import { PublishersService } from '../src/publishers/publishers.service';

const prisma = new PrismaClient();

async function main() {
  console.log('⚡ Starting validation of revenue share ranges...');

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: `admin-test-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      role: 'ADMIN',
      name: 'Admin Test User',
    },
  });

  // Create publisher user and profile
  const pubUser = await prisma.user.create({
    data: {
      email: `pub-test-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      role: 'PUBLISHER',
      name: 'Pub Test User',
    },
  });

  const publisher = await prisma.publisher.create({
    data: {
      userId: pubUser.id,
      companyName: 'Test Recalculate Co',
      contactEmail: pubUser.email,
      paymentDetails: 'Bank Account Info',
      status: 'ACTIVE',
    },
  });

  // Create website
  const website = await prisma.website.create({
    data: {
      publisherId: publisher.id,
      domain: `test-recalculate-${Date.now()}.com`,
      category: 'OTHER',
    },
  });

  // Create upload log
  const uploadLog = await prisma.uploadLog.create({
    data: {
      uploadedBy: admin.id,
      fileName: 'test-upload.csv',
      status: 'COMPLETED',
    },
  });

  // Create test reports
  // Dates:
  // June 2 (before range)
  // June 3 (inclusive start)
  // June 4 (inside range)
  // June 5 (inclusive end)
  // June 6 (after range)
  const reportDates = [
    '2026-06-02',
    '2026-06-03',
    '2026-06-04',
    '2026-06-05',
    '2026-06-06',
  ];

  const reports = [];
  for (const dateStr of reportDates) {
    const report = await prisma.revenueReport.create({
      data: {
        websiteId: website.id,
        uploadLogId: uploadLog.id,
        reportDate: new Date(dateStr),
        country: 'USA',
        impressions: 1000,
        grossRevenue: 100.0,
        netRevenue: 80.0, // Default 80%
        grossCpm: 100.0,
        netCpm: 80.0,
      },
    });
    reports.push(report);
  }

  // Create a default publisher configuration (created by publisher user, representing registration default)
  // E.g., 80% starting on 2026-06-04
  console.log('📌 Creating default publisher rev share config: 80% starting on 2026-06-04');
  await prisma.revenueShareConfig.create({
    data: {
      publisherId: publisher.id,
      sharePercentage: 80.0,
      effectiveFrom: new Date('2026-06-04'),
      createdBy: pubUser.id,
    },
  });

  // Create Admin Revenue Share Config
  // percentage: 70.0 (30% margin)
  // range: 2026-06-03 to 2026-06-05
  console.log('📌 Creating admin rev share config: 70% from 2026-06-03 to 2026-06-05');
  const service = new PublishersService(prisma as any);
  await service.addRevenueShareConfig(publisher.id, {
    sharePercentage: 70.0,
    effectiveFrom: new Date('2026-06-03'),
    effectiveTo: new Date('2026-06-05'),
    adminUserId: admin.id,
  });

  // Query reports and verify values
  const updatedReports = await prisma.revenueReport.findMany({
    where: { websiteId: website.id },
    orderBy: { reportDate: 'asc' },
  });

  console.log('\n📊 Verifying calculations:');
  const expectedShares = [80.0, 70.0, 70.0, 70.0, 80.0];
  let success = true;

  for (let idx = 0; idx < updatedReports.length; idx++) {
    const report = updatedReports[idx];
    const dateStr = report.reportDate.toISOString().split('T')[0];
    const netRev = Number(report.netRevenue);
    const expectedShare = expectedShares[idx];
    const expectedNetRev = 100.0 * (expectedShare / 100.0);

    console.log(`- Date: ${dateStr} | Net Revenue: $${netRev.toFixed(2)} | Expected: $${expectedNetRev.toFixed(2)}`);

    if (Math.abs(netRev - expectedNetRev) > 0.001) {
      console.error(`❌ Mismatch on date ${dateStr}: got ${netRev}, expected ${expectedNetRev}`);
      success = false;
    }
  }

  // Clean up
  console.log('\n🧹 Cleaning up test records...');
  await prisma.revenueReport.deleteMany({ where: { websiteId: website.id } });
  await prisma.uploadLog.delete({ where: { id: uploadLog.id } });
  await prisma.website.delete({ where: { id: website.id } });
  await prisma.revenueShareConfig.deleteMany({ where: { publisherId: publisher.id } });
  await prisma.publisher.delete({ where: { id: publisher.id } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: [admin.id, pubUser.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [admin.id, pubUser.id] } } });

  if (success) {
    console.log('✅ Validation SUCCESSFUL! All date calculations work correctly.');
  } else {
    console.error('❌ Validation FAILED.');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during validation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
