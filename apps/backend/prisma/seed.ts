// =============================================================================
// Rollinhead Dashboard — Database Seed Script
// =============================================================================

import { PrismaClient, UserRole, PublisherStatus, PaymentCycle, WebsiteCategory, TagType, DeviceType, UploadStatus, NotificationType, DeliveryType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Users & Super Admin
  const adminEmail = 'admin@rollinhead.com';
  const publisherEmail = 'publisher@rollinhead.com';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log('⚠️ Seed skipped: Admin user already exists.');
    return;
  }

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const publisherPasswordHash = await bcrypt.hash('publisher123', 10);

  // Super Admin
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Rollinhead Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log('✅ Created Super Admin user (admin@rollinhead.com / admin123)');

  // Publisher User
  const pubUser = await prisma.user.create({
    data: {
      email: publisherEmail,
      name: 'TechMedia Group',
      passwordHash: publisherPasswordHash,
      role: UserRole.PUBLISHER,
      isActive: true,
    },
  });
  console.log('✅ Created Publisher user (publisher@rollinhead.com / publisher123)');

  // 2. Create Publisher Profile
  const publisher = await prisma.publisher.create({
    data: {
      userId: pubUser.id,
      companyName: 'TechMedia Group LLC',
      contactEmail: 'contact@techmedia.com',
      paymentDetails: 'Bank Transfer - IBAN: DE12 3456 7890 1234 5678 90, Swift: DEUTDEDDXXX',
      paymentCycle: PaymentCycle.NET_30,
      status: PublisherStatus.ACTIVE,
    },
  });
  console.log('✅ Created Publisher Profile');

  // 3. Create Publisher Revenue Share Config (80%)
  const revShare = await prisma.revenueShareConfig.create({
    data: {
      publisherId: publisher.id,
      sharePercentage: 80.00,
      effectiveFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      createdBy: adminUser.id,
    },
  });
  console.log('✅ Created 80% Revenue Share Config');

  // 4. Create Websites
  const techWebsite = await prisma.website.create({
    data: {
      publisherId: publisher.id,
      domain: 'techblog.com',
      category: WebsiteCategory.TECH,
      isActive: true,
    },
  });

  const sportsWebsite = await prisma.website.create({
    data: {
      publisherId: publisher.id,
      domain: 'sportshub.net',
      category: WebsiteCategory.SPORTS,
      isActive: true,
    },
  });
  console.log('✅ Created Websites (techblog.com, sportshub.net)');

  // 5. Create Tags
  await prisma.tag.createMany({
    data: [
      {
        websiteId: techWebsite.id,
        tagType: TagType.DISPLAY,
        placementId: 'pb-techblog-sidebar-300x250',
        config: { adUnit: 'Sidebar_Medium_Rectangle', size: [300, 250] },
        isActive: true,
      },
      {
        websiteId: techWebsite.id,
        tagType: TagType.VIDEO,
        placementId: 'pb-techblog-outstream-video',
        config: { adUnit: 'Outstream_Video', player: 'jwplayer' },
        isActive: true,
      },
      {
        websiteId: sportsWebsite.id,
        tagType: TagType.DISPLAY,
        placementId: 'pb-sportshub-leaderboard-728x90',
        config: { adUnit: 'Header_Leaderboard', size: [728, 90] },
        isActive: true,
      },
    ],
  });
  console.log('✅ Created Ad Tags');

  // 6. Create Upload Log for historical data
  const uploadLog = await prisma.uploadLog.create({
    data: {
      uploadedBy: adminUser.id,
      fileName: 'demand_report_may_2026.csv',
      status: UploadStatus.COMPLETED,
      rowsProcessed: 180,
      rowsFailed: 0,
    },
  });

  // 7. Create 30 Days of Historical Revenue Data
  const reportsData = [];
  const countries = ['USA', 'GBR', 'CAN', 'DEU', 'IND'];
  const devices = [DeviceType.DESKTOP, DeviceType.MOBILE, DeviceType.TABLET];
  
  const baseImpressions = {
    'techblog.com': 150000,
    'sportshub.net': 80000,
  };

  const baseCpm = {
    'techblog.com': 2.50,
    'sportshub.net': 1.80,
  };

  // Generate daily reports for the past 30 days
  for (let i = 29; i >= 0; i--) {
    const reportDate = new Date();
    reportDate.setDate(reportDate.getDate() - i);
    reportDate.setHours(0, 0, 0, 0);

    // Loop through websites
    for (const site of [techWebsite, sportsWebsite]) {
      const siteName = site.domain as 'techblog.com' | 'sportshub.net';
      
      // Loop through countries
      for (const country of countries) {
        // Loop through devices
        for (const device of devices) {
          // Add some random variation
          const multiplier = 0.8 + Math.random() * 0.4;
          const countryWeight = country === 'USA' ? 1.5 : country === 'GBR' ? 1.2 : 0.8;
          const deviceWeight = device === DeviceType.MOBILE ? 1.3 : device === DeviceType.DESKTOP ? 1.0 : 0.4;

          const impressions = Math.floor(baseImpressions[siteName] * multiplier * countryWeight * deviceWeight / (countries.length * devices.length));
          const pageviews = Math.floor(impressions * (1.2 + Math.random() * 0.4));
          const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.015)); // 1% - 2.5% CTR
          
          const rawCpm = baseCpm[siteName] * (0.9 + Math.random() * 0.2) * (country === 'USA' ? 1.6 : 1.0);
          const grossRevenue = (impressions / 1000) * rawCpm;
          
          // Apply 80% Publisher Share
          const netRevenue = grossRevenue * 0.80;
          
          const grossCpm = grossRevenue / (impressions / 1000);
          const netCpm = netRevenue / (impressions / 1000);

          reportsData.push({
            websiteId: site.id,
            uploadLogId: uploadLog.id,
            reportDate,
            country,
            device,
            impressions: BigInt(impressions),
            pageviews: BigInt(pageviews),
            clicks: BigInt(clicks),
            grossRevenue,
            netRevenue,
            grossCpm,
            netCpm,
          });
        }
      }
    }
  }

  // Bulk create revenue reports in chunks
  const chunkSize = 100;
  for (let i = 0; i < reportsData.length; i += chunkSize) {
    const chunk = reportsData.slice(i, i + chunkSize);
    await prisma.revenueReport.createMany({ data: chunk });
  }
  console.log(`✅ Seeded ${reportsData.length} daily performance rows over 30 days`);

  // 8. Create Demo Notifications
  await prisma.notification.createMany({
    data: [
      {
        createdBy: adminUser.id,
        title: 'Welcome to Rollinhead Adtech!',
        message: 'Welcome to your new publisher reporting dashboard. Here you can track your websites, generate new tags, view daily metrics, and check payment schedules.',
        type: NotificationType.INFO,
        delivery: DeliveryType.IN_APP,
        targetRoles: ['PUBLISHER', 'ADMIN', 'ANALYST'],
      },
      {
        createdBy: adminUser.id,
        title: 'Scheduled Core Upgrades',
        message: 'We will be conducting database migrations on Saturday, May 30th from 02:00 to 04:00 UTC. The reporting engine may experience brief downtime.',
        type: NotificationType.ALERT,
        delivery: DeliveryType.BOTH,
        targetRoles: ['PUBLISHER', 'ADMIN'],
      },
    ],
  });
  console.log('✅ Created Demo Notifications');

  // 9. Add Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'SEED_DATABASE',
        entity: 'System',
        createdAt: new Date(),
      },
      {
        userId: adminUser.id,
        action: 'CREATE_PUBLISHER',
        entity: 'Publisher',
        entityId: publisher.id,
        newValue: { name: publisher.companyName, status: publisher.status },
        createdAt: new Date(),
      },
    ],
  });
  console.log('✅ Created Audit Logs');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
