import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UploadStatus, DeviceType, UserRole } from '@prisma/client';
import * as fs from 'fs';
import csv from 'csv-parser';

@Injectable()
export class UploadsService {
  constructor(private prisma: PrismaService) {}

  async getUploadLogs() {
    return this.prisma.uploadLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async processCsvUpload(
    filePath: string,
    fileName: string,
    uploadedByUserId: string,
  ) {
    // 1. Create a processing upload log
    const uploadLog = await this.prisma.uploadLog.create({
      data: {
        uploadedBy: uploadedByUserId,
        fileName,
        status: UploadStatus.PROCESSING,
      },
    });

    const rows: any[] = [];

    // 2. Read and parse the CSV file
    try {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data: any) => rows.push(data))
          .on('end', () => resolve())
          .on('error', (err: any) => reject(err));
      });
    } catch (err) {
      await this.prisma.uploadLog.update({
        where: { id: uploadLog.id },
        data: {
          status: UploadStatus.FAILED,
          errorDetails: `CSV Parsing Error: ${err.message}`,
        },
      });
      throw new BadRequestException(`Failed to parse CSV file: ${err.message}`);
    }

    if (rows.length === 0) {
      await this.prisma.uploadLog.update({
        where: { id: uploadLog.id },
        data: {
          status: UploadStatus.FAILED,
          errorDetails: 'CSV file is empty or missing headers.',
        },
      });
      throw new BadRequestException('CSV file is empty');
    }

    // 3. Process rows asynchronously in background so client gets quick response
    this.processRowsInBackground(rows, uploadLog.id, uploadedByUserId).catch(
      (e) => {
        console.error('Background CSV processing failed:', e);
      },
    );

    return {
      message: 'File uploaded and is being processed in the background',
      uploadId: uploadLog.id,
      rowCount: rows.length,
    };
  }

  private async processRowsInBackground(
    rows: any[],
    logId: string,
    adminUserId: string,
  ) {
    let rowsProcessed = 0;
    let rowsFailed = 0;
    const errors: string[] = [];

    // Pre-cache websites and their publisher configurations to optimize performance
    const websites = await this.prisma.website.findMany({
      include: {
        publisher: {
          include: {
            revenueShareConfigs: {
              orderBy: { effectiveFrom: 'desc' },
            },
          },
        },
      },
    });

    const websiteMap = new Map<string, any>();
    websites.forEach((w) => websiteMap.set(w.domain.toLowerCase().trim(), w));

    const reportsToInsert: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Row number in spreadsheet (1-indexed + header)

      try {
        const domain = (row.domain || row.Domain || '').toLowerCase().trim();
        const dateStr = row.date || row.Date || '';
        const country = (row.country || row.Country || 'USA')
          .toUpperCase()
          .trim();
        const deviceStr = (row.device || row.Device || 'DESKTOP')
          .toUpperCase()
          .trim();

        const impressions = parseInt(
          row.impressions || row.Impressions || '0',
          10,
        );
        const pageviews = parseInt(row.pageviews || row.Pageviews || '0', 10);
        const clicks = parseInt(row.clicks || row.Clicks || '0', 10);
        const grossRevenue = parseFloat(
          row.gross_revenue || row.GrossRevenue || row.revenue || '0',
        );

        // Validation
        if (!domain || !dateStr) {
          throw new Error(`Missing required fields: domain or date`);
        }

        const website = websiteMap.get(domain);
        if (!website) {
          throw new Error(`Domain '${domain}' is not registered in our system`);
        }

        const reportDate = new Date(dateStr);
        if (isNaN(reportDate.getTime())) {
          throw new Error(`Invalid date format: '${dateStr}'`);
        }

        if (isNaN(impressions) || isNaN(grossRevenue)) {
          throw new Error(`Impressions and Gross Revenue must be numbers`);
        }

        // Resolve device type
        let device: DeviceType = DeviceType.DESKTOP;
        if (deviceStr === 'MOBILE') device = DeviceType.MOBILE;
        if (deviceStr === 'TABLET') device = DeviceType.TABLET;

        // Find active revenue shareconfig for that date
        const configs = website.publisher.revenueShareConfigs;
        let activeShare = 80.0; // Default fallback

        for (const config of configs) {
          const effectiveFrom = new Date(config.effectiveFrom);
          const effectiveTo = config.effectiveTo
            ? new Date(config.effectiveTo)
            : null;

          if (
            reportDate >= effectiveFrom &&
            (!effectiveTo || reportDate < effectiveTo)
          ) {
            activeShare = Number(config.sharePercentage);
            break;
          }
        }

        // Apply share config
        const netRevenue = grossRevenue * (activeShare / 100);
        const grossCpm =
          impressions > 0 ? (grossRevenue / impressions) * 1000 : 0;
        const netCpm = impressions > 0 ? (netRevenue / impressions) * 1000 : 0;

        reportsToInsert.push({
          websiteId: website.id,
          uploadLogId: logId,
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

        rowsProcessed++;
      } catch (err) {
        rowsFailed++;
        if (errors.length < 50) {
          errors.push(`Row ${rowNum}: ${err.message}`);
        }
      }
    }

    // Bulk insert inside a transaction
    try {
      if (reportsToInsert.length > 0) {
        // Chunk inserts to prevent query size limits
        const chunkSize = 100;
        for (let i = 0; i < reportsToInsert.length; i += chunkSize) {
          const chunk = reportsToInsert.slice(i, i + chunkSize);
          await this.prisma.revenueReport.createMany({ data: chunk });
        }
      }

      // Update upload status
      await this.prisma.uploadLog.update({
        where: { id: logId },
        data: {
          status:
            rowsFailed > 0 && rowsProcessed === 0
              ? UploadStatus.FAILED
              : UploadStatus.COMPLETED,
          rowsProcessed,
          rowsFailed,
          errorDetails: errors.length > 0 ? errors.join('\n') : null,
        },
      });

      // Log audit
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'CSV_UPLOAD_PROCESSED',
          entity: 'UploadLog',
          entityId: logId,
          newValue: { processed: rowsProcessed, failed: rowsFailed },
        },
      });
    } catch (e) {
      await this.prisma.uploadLog.update({
        where: { id: logId },
        data: {
          status: UploadStatus.FAILED,
          errorDetails: `Database Insertion Error: ${e.message}`,
        },
      });
    }
  }
}
