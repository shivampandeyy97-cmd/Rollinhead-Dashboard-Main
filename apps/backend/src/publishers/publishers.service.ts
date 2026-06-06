import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PublisherStatus, PaymentCycle } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PublishersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.publisher.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        websites: {
          select: {
            id: true,
            domain: true,
            isActive: true,
            tags: true,
          },
        },
        revenueShareConfigs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findOne(id: string) {
    const publisher = await this.prisma.publisher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
          },
        },
        websites: {
          include: {
            tags: true,
          },
        },
        revenueShareConfigs: {
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    if (!publisher) {
      throw new NotFoundException(`Publisher not found`);
    }

    return publisher;
  }

  async update(
    id: string,
    data: {
      companyName?: string;
      contactEmail?: string;
      paymentDetails?: string;
      paymentCycle?: PaymentCycle;
      status?: PublisherStatus;
      isActive?: boolean; // User active flag
      name?: string; // User name
    },
  ) {
    const publisher = await this.prisma.publisher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!publisher) {
      throw new NotFoundException(`Publisher not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update User if name or isActive is provided
      if (data.isActive !== undefined || data.name !== undefined) {
        await tx.user.update({
          where: { id: publisher.userId },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
          },
        });
      }

      // 2. Update Publisher Profile
      const updatedPublisher = await tx.publisher.update({
        where: { id },
        data: {
          ...(data.companyName && { companyName: data.companyName }),
          ...(data.contactEmail && { contactEmail: data.contactEmail }),
          ...(data.paymentDetails && { paymentDetails: data.paymentDetails }),
          ...(data.paymentCycle && { paymentCycle: data.paymentCycle }),
          ...(data.status && { status: data.status }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      // 3. Log the update
      await tx.auditLog.create({
        data: {
          userId: publisher.userId, // Logs referencing the publisher user
          action: 'UPDATE_PUBLISHER',
          entity: 'Publisher',
          entityId: id,
          newValue: data,
        },
      });

      return updatedPublisher;
    });
  }

  async resetPassword(id: string, newPass: string) {
    const publisher = await this.prisma.publisher.findUnique({
      where: { id },
    });
    if (!publisher) {
      throw new NotFoundException(`Publisher not found`);
    }

    if (newPass.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }

    const passwordHash = await bcrypt.hash(newPass, 10);

    await this.prisma.user.update({
      where: { id: publisher.userId },
      data: { passwordHash },
    });

    return { message: 'Publisher password reset successfully' };
  }

  // --- Revenue Share Management ---

  async recalculatePublisherReports(publisherId: string, tx: any) {
    // 1. Get all revenue configs for the publisher ordered by effectiveFrom desc
    const configs = await tx.revenueShareConfig.findMany({
      where: { publisherId },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (configs.length === 0) return;

    // 2. Get all websites of the publisher
    const websites = await tx.website.findMany({
      where: { publisherId },
      select: { id: true },
    });
    const websiteIds = websites.map((w: any) => w.id);

    if (websiteIds.length === 0) return;

    // 3. Query all reports for these websites
    const reports = await tx.revenueReport.findMany({
      where: { websiteId: { in: websiteIds } },
    });

    if (reports.length === 0) return;

    // 4. For each report, find its matching active configuration and update
    for (const report of reports) {
      const reportDateStr = new Date(report.reportDate).toISOString().split('T')[0];
      let activeShare = 80.0; // Fallback default

      // Find active config for this date
      for (const config of configs) {
        const effectiveFromStr = new Date(config.effectiveFrom).toISOString().split('T')[0];
        const effectiveToStr = config.effectiveTo
          ? new Date(config.effectiveTo).toISOString().split('T')[0]
          : null;

        if (reportDateStr >= effectiveFromStr && (!effectiveToStr || reportDateStr <= effectiveToStr)) {
          activeShare = Number(config.sharePercentage);
          break;
        }
      }

      const grossRev = Number(report.grossRevenue);
      const imps = Number(report.impressions);
      
      const newNetRevenue = grossRev * (activeShare / 100);
      const newNetCpm = imps > 0 ? (newNetRevenue / imps) * 1000 : 0;

      // Update the report in DB
      await tx.revenueReport.update({
        where: { id: report.id },
        data: {
          netRevenue: newNetRevenue,
          netCpm: newNetCpm,
        },
      });
    }
  }

  async addRevenueShareConfig(
    id: string,
    data: {
      sharePercentage: number;
      effectiveFrom: Date;
      effectiveTo: Date | null;
      adminUserId: string;
    },
  ) {
    const publisher = await this.prisma.publisher.findUnique({
      where: { id },
    });
    if (!publisher) {
      throw new NotFoundException(`Publisher not found`);
    }

    if (data.sharePercentage < 0 || data.sharePercentage > 100) {
      throw new BadRequestException(
        'Revenue share percentage must be between 0 and 100',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the new config
      const newConfig = await tx.revenueShareConfig.create({
        data: {
          publisherId: id,
          sharePercentage: data.sharePercentage,
          effectiveFrom: data.effectiveFrom,
          effectiveTo: data.effectiveTo,
          createdBy: data.adminUserId,
        },
      });

      // Recalculate existing reports to apply the updated shareconfigs
      await this.recalculatePublisherReports(id, tx);

      // 2. Audit log
      await tx.auditLog.create({
        data: {
          userId: data.adminUserId,
          action: 'CREATE_REV_SHARE_CONFIG',
          entity: 'RevenueShareConfig',
          entityId: newConfig.id,
          newValue: {
            percentage: data.sharePercentage,
            effectiveFrom: data.effectiveFrom,
          },
        },
      });

      return newConfig;
    });
  }

  async getRevenueShareHistory(id: string) {
    const publisher = await this.prisma.publisher.findUnique({
      where: { id },
    });
    if (!publisher) {
      throw new NotFoundException(`Publisher not found`);
    }

    return this.prisma.revenueShareConfig.findMany({
      where: { publisherId: id },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
