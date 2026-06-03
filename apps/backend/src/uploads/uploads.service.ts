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

    // Pre-cache publishers and websites to optimize performance and enforce strict validations
    const [publishers, websites] = await Promise.all([
      this.prisma.publisher.findMany({
        include: {
          revenueShareConfigs: {
            orderBy: { effectiveFrom: 'desc' },
          },
          user: true,
        },
      }),
      this.prisma.website.findMany(),
    ]);

    // Build Maps for O(1) lookups
    const publisherMap = new Map<string, any>();
    publishers.forEach((p) => {
      if (p.companyName) {
        publisherMap.set(p.companyName.toLowerCase().trim(), p);
      }
      if (p.contactEmail) {
        publisherMap.set(p.contactEmail.toLowerCase().trim(), p);
      }
      if (p.user?.name) {
        publisherMap.set(p.user.name.toLowerCase().trim(), p);
      }
    });

    const websiteMap = new Map<string, any>();
    websites.forEach((w) => {
      websiteMap.set(w.domain.toLowerCase().trim(), w);
    });

    const reportsToInsert: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Row number in spreadsheet (1-indexed + header)

      try {
        // Normalize CSV keys to ignore spacing/case differences
        const cleanRow: any = {};
        for (const key of Object.keys(row)) {
          const cleanKey = key.trim().replace(/\s+/g, '').toLowerCase();
          cleanRow[cleanKey] = row[key];
        }

        const dateStr = cleanRow['date'] || '';
        const publisherVal = cleanRow['publisher'] || '';
        const websiteVal = cleanRow['website'] || '';
        const revenueStr = cleanRow['revenue'] || '';
        const impressionsStr = cleanRow['impressions'] || '';

        // Validation
        if (!dateStr || !publisherVal || !websiteVal || !revenueStr || !impressionsStr) {
          throw new Error(`Missing required fields. Row must contain Date, Publisher, Website, Revenue, and Impressions.`);
        }

        const publisher = publisherMap.get(publisherVal.toLowerCase().trim());
        if (!publisher) {
          throw new Error(`Publisher '${publisherVal}' is not registered in our system`);
        }

        const website = websiteMap.get(websiteVal.toLowerCase().trim());
        if (!website) {
          throw new Error(`Website domain '${websiteVal}' is not registered in our system`);
        }

        // Strict validation: Website must belong to the Publisher
        if (website.publisherId !== publisher.id) {
          throw new Error(
            `Website domain '${websiteVal}' belongs to another publisher and cannot be uploaded under Publisher '${publisherVal}'`
          );
        }

        const reportDate = new Date(dateStr);
        if (isNaN(reportDate.getTime())) {
          throw new Error(`Invalid date format: '${dateStr}'`);
        }

        const impressions = parseInt(impressionsStr, 10);
        const grossRevenue = parseFloat(revenueStr);

        if (isNaN(impressions) || isNaN(grossRevenue)) {
          throw new Error(`Impressions and Revenue must be numeric values`);
        }

        if (impressions < 0 || grossRevenue < 0) {
          throw new Error(`Impressions and Revenue must be non-negative`);
        }

        // Find active revenue share config for the publisher for that date
        const configs = publisher.revenueShareConfigs;
        let activeShare = 80.0; // Default fallback to 80% share to publisher (20% margin)

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

        // Apply share config (e.g. if margin is 30%, activeShare is 70% of grossRevenue)
        const netRevenue = grossRevenue * (activeShare / 100);
        const grossCpm =
          impressions > 0 ? (grossRevenue / impressions) * 1000 : 0;
        const netCpm = impressions > 0 ? (netRevenue / impressions) * 1000 : 0;

        reportsToInsert.push({
          websiteId: website.id,
          uploadLogId: logId,
          reportDate,
          country: 'USA',
          device: DeviceType.DESKTOP,
          impressions: BigInt(impressions),
          pageviews: BigInt(0),
          clicks: BigInt(0),
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
