import { Controller, Get, Query, UseGuards, Req, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('overview')
  async getOverview(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('websiteId') websiteId?: string,
  ) {
    return this.reportsService.getOverviewMetrics({
      userId: req.user.id,
      role: req.user.role as UserRole,
      startDate,
      endDate,
      websiteId,
    });
  }

  @Get('performance')
  async getPerformance(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('websiteId') websiteId?: string,
  ) {
    return this.reportsService.getPerformanceChart({
      userId: req.user.id,
      role: req.user.role as UserRole,
      startDate,
      endDate,
      websiteId,
    });
  }

  @Get('breakdown')
  async getBreakdown(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('websiteId') websiteId?: string,
    @Query('country') country?: string,
    @Query('device') device?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.reportsService.getBreakdownReport({
      userId: req.user.id,
      role: req.user.role as UserRole,
      startDate,
      endDate,
      websiteId,
      country,
      device,
      groupBy,
    });
  }

  @Get('export')
  async exportCsv(
    @Req() req: any,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('websiteId') websiteId?: string,
    @Query('country') country?: string,
    @Query('device') device?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    const data = await this.reportsService.getBreakdownReport({
      userId: req.user.id,
      role: req.user.role as UserRole,
      startDate,
      endDate,
      websiteId,
      country,
      device,
      groupBy,
    });

    const isPublisher = req.user.role === UserRole.PUBLISHER;

    // Headers
    const headers = isPublisher
      ? [
          'Dimension',
          'Impressions',
          'Pageviews',
          'Clicks',
          'Net Revenue ($)',
          'Net CPM ($)',
        ]
      : [
          'Dimension',
          'Impressions',
          'Pageviews',
          'Clicks',
          'Gross Revenue ($)',
          'Net Revenue ($)',
          'Margin ($)',
          'Gross CPM ($)',
          'Net CPM ($)',
        ];

    // Map rows to CSV
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const csvRow = isPublisher
        ? [
            row.dimension,
            row.impressions,
            row.pageviews,
            row.clicks,
            row.netRevenue.toFixed(4),
            row.netCpm.toFixed(4),
          ]
        : [
            row.dimension,
            row.impressions,
            row.pageviews,
            row.clicks,
            row.grossRevenue.toFixed(4),
            row.netRevenue.toFixed(4),
            row.margin.toFixed(4),
            row.grossCpm.toFixed(4),
            row.netCpm.toFixed(4),
          ];

      csvRows.push(csvRow.map((val) => `"${val}"`).join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=rollinhead_report_${Date.now()}.csv`,
    );
    res.status(200).send(csvContent);
  }
}
