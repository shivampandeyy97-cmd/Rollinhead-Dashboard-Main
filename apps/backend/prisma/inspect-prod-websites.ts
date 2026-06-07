import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://rollinhead:rollinhead_dev_2026@db.olrrdwcffjthunvuuish.supabase.co:5432/postgres?schema=public"
    }
  }
});

async function main() {
  console.log('--- ALL WEBSITES ---');
  const websites = await prisma.website.findMany({
    include: {
      publisher: true,
    }
  });
  console.log(`Total: ${websites.length}`);
  for (const w of websites) {
    console.log(`- ID: ${w.id}, Domain: ${w.domain}, Publisher: ${w.publisher?.companyName}`);
  }

  console.log('\n--- ALL REPORTS ---');
  const reports = await prisma.revenueReport.findMany({
    orderBy: { reportDate: 'asc' },
  });
  console.log(`Total reports: ${reports.length}`);
  // group by websiteId and reportDate
  const groups: any = {};
  for (const r of reports) {
    const key = `${r.reportDate.toISOString().split('T')[0]}_${r.websiteId}`;
    groups[key] = (groups[key] || 0) + 1;
  }
  console.log('Report groups (date_websiteId count):', Object.keys(groups).length);
  for (const [key, count] of Object.entries(groups)) {
    console.log(`  - ${key}: count = ${count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
