import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole, DeviceType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private parseDate(dateStr: string | undefined, defaultDate: Date): Date {
    if (!dateStr) return defaultDate;
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date format: ${dateStr}`);
    }
    return parsed;
  }

  async getOverviewMetrics(params: {
    userId: string;
    role: UserRole;
    startDate?: string;
    endDate?: string;
    websiteId?: string;
  }) {
    // 1. Resolve date ranges (default past 30 days)
    const end = this.parseDate(params.endDate, new Date());
    const start = this.parseDate(
      params.startDate,
      new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000),
    );

    // Calculate previous period for comparison (for growth indicators)
    const diff = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - diff);
    const prevEnd = new Date(start.getTime());

    // 2. Build where clause
    const where: any = {
      reportDate: {
        gte: start,
        lte: end,
      },
    };

    const prevWhere: any = {
      reportDate: {
        gte: prevStart,
        lt: prevEnd,
      },
    };

    // Filter by publisher website if publisher role
    if (params.role === UserRole.PUBLISHER) {
      const publisher = await this.prisma.publisher.findUnique({
        where: { userId: params.userId },
      });
      if (!publisher) {
        return this.emptyMetrics();
      }

      where.website = { publisherId: publisher.id };
      prevWhere.website = { publisherId: publisher.id };
    }

    // Optional website ID filter
    if (params.websiteId) {
      where.websiteId = params.websiteId;
      prevWhere.websiteId = params.websiteId;
    }

    // 3. Query current and previous period stats
    const [currentSum, prevSum] = await Promise.all([
      this.prisma.revenueReport.aggregate({
        where,
        _sum: {
          impressions: true,
          pageviews: true,
          clicks: true,
          grossRevenue: true,
          netRevenue: true,
        },
      }),
      this.prisma.revenueReport.aggregate({
        where: prevWhere,
        _sum: {
          impressions: true,
          pageviews: true,
          clicks: true,
          grossRevenue: true,
          netRevenue: true,
        },
      }),
    ]);

    return this.formatOverviewResponse(currentSum, prevSum, params.role);
  }

  async getPerformanceChart(params: {
    userId: string;
    role: UserRole;
    startDate?: string;
    endDate?: string;
    websiteId?: string;
  }) {
    const end = this.parseDate(params.endDate, new Date());
    const start = this.parseDate(
      params.startDate,
      new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000),
    );

    const where: any = {
      reportDate: {
        gte: start,
        lte: end,
      },
    };

    if (params.role === UserRole.PUBLISHER) {
      const publisher = await this.prisma.publisher.findUnique({
        where: { userId: params.userId },
      });
      if (!publisher) return [];
      where.website = { publisherId: publisher.id };
    }

    if (params.websiteId) {
      where.websiteId = params.websiteId;
    }

    // Group by day
    const rawDailyData = await this.prisma.revenueReport.groupBy({
      by: ['reportDate'],
      where,
      _sum: {
        impressions: true,
        pageviews: true,
        clicks: true,
        grossRevenue: true,
        netRevenue: true,
      },
      orderBy: {
        reportDate: 'asc',
      },
    });

    return rawDailyData.map((row) => {
      const imps = Number(row._sum.impressions || 0);
      const grossRev = Number(row._sum.grossRevenue || 0);
      const netRev = Number(row._sum.netRevenue || 0);

      const baseRow: any = {
        date: row.reportDate.toISOString().split('T')[0],
        impressions: imps,
        pageviews: Number(row._sum.pageviews || 0),
        clicks: Number(row._sum.clicks || 0),
        netRevenue: netRev,
        netCpm: imps > 0 ? (netRev / imps) * 1000 : 0,
      };

      // Admins get extra gross metrics
      if (params.role !== UserRole.PUBLISHER) {
        baseRow.grossRevenue = grossRev;
        baseRow.margin = grossRev - netRev;
        baseRow.grossCpm = imps > 0 ? (grossRev / imps) * 1000 : 0;
      }

      return baseRow;
    });
  }

  async getBreakdownReport(params: {
    userId: string;
    role: UserRole;
    startDate?: string;
    endDate?: string;
    websiteId?: string;
    country?: string;
    device?: string;
    groupBy?: string; // 'date' | 'website' | 'country' | 'device'
  }) {
    const end = this.parseDate(params.endDate, new Date());
    const start = this.parseDate(
      params.startDate,
      new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000),
    );

    const where: any = {
      reportDate: {
        gte: start,
        lte: end,
      },
    };

    if (params.role === UserRole.PUBLISHER) {
      const publisher = await this.prisma.publisher.findUnique({
        where: { userId: params.userId },
      });
      if (!publisher) return [];
      where.website = { publisherId: publisher.id };
    }

    if (params.websiteId) {
      where.websiteId = params.websiteId;
    }
    if (params.country) {
      where.country = params.country;
    }
    if (params.device) {
      where.device = params.device as DeviceType;
    }

    const groupField = params.groupBy || 'date';
    const byFields: any[] = ['reportDate'];

    if (groupField === 'website') {
      byFields.push('websiteId');
    } else if (groupField === 'country') {
      byFields.push('country');
    } else if (groupField === 'device') {
      byFields.push('device');
    }

    const aggregated = await this.prisma.revenueReport.groupBy({
      by: byFields,
      where,
      _sum: {
        impressions: true,
        pageviews: true,
        clicks: true,
        grossRevenue: true,
        netRevenue: true,
      },
      orderBy: {
        reportDate: 'desc',
      },
    });

    // Populate website names if grouping by website
    const websiteMap = new Map<string, string>();
    if (groupField === 'website') {
      const websites = await this.prisma.website.findMany();
      websites.forEach((w) => websiteMap.set(w.id, w.domain));
    }

    return aggregated.map((row) => {
      const imps = Number(row._sum.impressions || 0);
      const grossRev = Number(row._sum.grossRevenue || 0);
      const netRev = Number(row._sum.netRevenue || 0);

      const dateStr = row.reportDate!.toISOString().split('T')[0];
      let dimensionName = '';
      if (groupField === 'website') {
        dimensionName = websiteMap.get(row.websiteId) || 'Unknown Website';
      } else if (groupField === 'country') {
        dimensionName = row.country!;
      } else if (groupField === 'device') {
        dimensionName = row.device!;
      }

      // Display every date as a separate row and show the drilldown sub-dimension alongside it
      const displayDimension = dimensionName
        ? `${dateStr} - ${dimensionName}`
        : dateStr;

      const res: any = {
        dimension: displayDimension,
        impressions: imps,
        pageviews: Number(row._sum.pageviews || 0),
        clicks: Number(row._sum.clicks || 0),
        netRevenue: netRev,
        netCpm: imps > 0 ? (netRev / imps) * 1000 : 0,
      };

      if (params.role !== UserRole.PUBLISHER) {
        res.grossRevenue = grossRev;
        res.margin = grossRev - netRev;
        res.grossCpm = imps > 0 ? (grossRev / imps) * 1000 : 0;
      }

      return res;
    });
  }

  // --- Helper Formatting Utilities ---

  private emptyMetrics() {
    return {
      impressions: { current: 0, changePercent: 0 },
      pageviews: { current: 0, changePercent: 0 },
      clicks: { current: 0, changePercent: 0 },
      netRevenue: { current: 0, changePercent: 0 },
      netCpm: { current: 0, changePercent: 0 },
    };
  }

  private formatOverviewResponse(current: any, prev: any, role: UserRole) {
    const getChange = (cVal: number, pVal: number) => {
      if (pVal === 0) return cVal > 0 ? 100 : 0;
      return ((cVal - pVal) / pVal) * 100;
    };

    const cImps = Number(current._sum.impressions || 0);
    const pImps = Number(prev._sum.impressions || 0);

    const cPageviews = Number(current._sum.pageviews || 0);
    const pPageviews = Number(prev._sum.pageviews || 0);

    const cClicks = Number(current._sum.clicks || 0);
    const pClicks = Number(prev._sum.clicks || 0);

    const cNetRev = Number(current._sum.netRevenue || 0);
    const pNetRev = Number(prev._sum.netRevenue || 0);

    const cNetCpm = cImps > 0 ? (cNetRev / cImps) * 1000 : 0;
    const pNetCpm = pImps > 0 ? (pNetRev / pImps) * 1000 : 0;

    const baseStats: any = {
      impressions: { current: cImps, changePercent: getChange(cImps, pImps) },
      pageviews: {
        current: cPageviews,
        changePercent: getChange(cPageviews, pPageviews),
      },
      clicks: { current: cClicks, changePercent: getChange(cClicks, pClicks) },
      netRevenue: {
        current: cNetRev,
        changePercent: getChange(cNetRev, pNetRev),
      },
      netCpm: { current: cNetCpm, changePercent: getChange(cNetCpm, pNetCpm) },
    };

    // Admins get extra gross metrics
    if (role !== UserRole.PUBLISHER) {
      const cGrossRev = Number(current._sum.grossRevenue || 0);
      const pGrossRev = Number(prev._sum.grossRevenue || 0);

      const cGrossCpm = cImps > 0 ? (cGrossRev / cImps) * 1000 : 0;
      const pGrossCpm = pImps > 0 ? (pGrossRev / pImps) * 1000 : 0;

      const cMargin = cGrossRev - cNetRev;
      const pMargin = pGrossRev - pNetRev;

      baseStats.grossRevenue = {
        current: cGrossRev,
        changePercent: getChange(cGrossRev, pGrossRev),
      };
      baseStats.grossCpm = {
        current: cGrossCpm,
        changePercent: getChange(cGrossCpm, pGrossCpm),
      };
      baseStats.margin = {
        current: cMargin,
        changePercent: getChange(cMargin, pMargin),
      };
      baseStats.marginPercent = {
        current: cGrossRev > 0 ? (cMargin / cGrossRev) * 100 : 0,
        changePercent: 0,
      };
    }

    return baseStats;
  }
}
