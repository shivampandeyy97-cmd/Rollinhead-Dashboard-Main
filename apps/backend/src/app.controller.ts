import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug-db')
  async debugDb() {
    const publishers = await this.prisma.publisher.findMany({
      include: {
        user: { select: { email: true, name: true, role: true } },
        websites: true,
        revenueShareConfigs: {
          include: { creator: { select: { name: true, role: true } } },
          orderBy: { effectiveFrom: 'asc' },
        },
      },
    });

    const reports = await this.prisma.revenueReport.findMany({
      include: {
        website: true,
      },
      orderBy: { reportDate: 'asc' },
    });

    return {
      publishers: publishers.map((p) => ({
        id: p.id,
        companyName: p.companyName,
        user: p.user,
        websites: p.websites.map((w) => ({ id: w.id, domain: w.domain, isActive: w.isActive })),
        configs: p.revenueShareConfigs.map((c) => ({
          id: c.id,
          sharePercentage: c.sharePercentage,
          effectiveFrom: c.effectiveFrom,
          effectiveTo: c.effectiveTo,
          creator: c.creator,
          createdAt: c.createdAt,
        })),
      })),
      reports: reports.map((r) => ({
        id: r.id,
        websiteId: r.websiteId,
        websiteDomain: r.website?.domain,
        reportDate: r.reportDate,
        impressions: r.impressions.toString(),
        grossRevenue: r.grossRevenue,
        netRevenue: r.netRevenue,
        netCpm: r.netCpm,
      })),
      reportsCount: reports.length,
    };
  }
}
