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

  private getActiveSharePercentageForDate(configs: any[], date: Date): number {
    const dReport = new Date(date);
    const reportDateStr = `${dReport.getUTCFullYear()}-${String(dReport.getUTCMonth() + 1).padStart(2, '0')}-${String(dReport.getUTCDate()).padStart(2, '0')}`;

    const adminConfigs: any[] = [];
    const defaultConfigs: any[] = [];

    for (const config of configs) {
      const isPublisher = config.creator?.role === 'PUBLISHER';
      if (isPublisher) {
        defaultConfigs.push(config);
      } else {
        adminConfigs.push(config);
      }
    }

    const sortByEffectiveFromDesc = (a: any, b: any) => {
      return (
        new Date(b.effectiveFrom).getTime() -
        new Date(a.effectiveFrom).getTime()
      );
    };
    adminConfigs.sort(sortByEffectiveFromDesc);
    defaultConfigs.sort(sortByEffectiveFromDesc);

    for (const config of adminConfigs) {
      const dFrom = new Date(config.effectiveFrom);
      const effectiveFromStr = `${dFrom.getUTCFullYear()}-${String(dFrom.getUTCMonth() + 1).padStart(2, '0')}-${String(dFrom.getUTCDate()).padStart(2, '0')}`;

      const effectiveToStr = config.effectiveTo
        ? (() => {
            const dTo = new Date(config.effectiveTo);
            return `${dTo.getUTCFullYear()}-${String(dTo.getUTCMonth() + 1).padStart(2, '0')}-${String(dTo.getUTCDate()).padStart(2, '0')}`;
          })()
        : null;

      if (
        reportDateStr >= effectiveFromStr &&
        (!effectiveToStr || reportDateStr <= effectiveToStr)
      ) {
        return Number(config.sharePercentage);
      }
    }

    for (const config of defaultConfigs) {
      const dFrom = new Date(config.effectiveFrom);
      const effectiveFromStr = `${dFrom.getUTCFullYear()}-${String(dFrom.getUTCMonth() + 1).padStart(2, '0')}-${String(dFrom.getUTCDate()).padStart(2, '0')}`;

      const effectiveToStr = config.effectiveTo
        ? (() => {
            const dTo = new Date(config.effectiveTo);
            return `${dTo.getUTCFullYear()}-${String(dTo.getUTCMonth() + 1).padStart(2, '0')}-${String(dTo.getUTCDate()).padStart(2, '0')}`;
          })()
        : null;

      if (
        reportDateStr >= effectiveFromStr &&
        (!effectiveToStr || reportDateStr <= effectiveToStr)
      ) {
        return Number(config.sharePercentage);
      }
    }

    return 80.0;
  }

  async findAll() {
    const publishers = await this.prisma.publisher.findMany({
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
          include: {
            creator: {
              select: { role: true },
            },
          },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    return publishers.map((pub) => {
      const activePct = this.getActiveSharePercentageForDate(
        pub.revenueShareConfigs,
        new Date(),
      );
      const activeConfig =
        pub.revenueShareConfigs.find(
          (c) => Number(c.sharePercentage) === activePct,
        ) || pub.revenueShareConfigs[0];
      const otherConfigs = pub.revenueShareConfigs.filter(
        (c) => c.id !== activeConfig?.id,
      );
      return {
        ...pub,
        revenueShareConfigs: activeConfig
          ? [activeConfig, ...otherConfigs]
          : [],
      };
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
          include: {
            creator: {
              select: { role: true },
            },
          },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    if (!publisher) {
      throw new NotFoundException(`Publisher not found`);
    }

    const activePct = this.getActiveSharePercentageForDate(
      publisher.revenueShareConfigs,
      new Date(),
    );
    const activeConfig =
      publisher.revenueShareConfigs.find(
        (c) => Number(c.sharePercentage) === activePct,
      ) || publisher.revenueShareConfigs[0];
    const otherConfigs = publisher.revenueShareConfigs.filter(
      (c) => c.id !== activeConfig?.id,
    );

    return {
      ...publisher,
      revenueShareConfigs: activeConfig ? [activeConfig, ...otherConfigs] : [],
    };
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
      include: {
        creator: {
          select: { role: true },
        },
      },
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
      const dReport = new Date(report.reportDate);
      const reportDateStr = `${dReport.getUTCFullYear()}-${String(dReport.getUTCMonth() + 1).padStart(2, '0')}-${String(dReport.getUTCDate()).padStart(2, '0')}`;
      let activeShare = 80.0; // Fallback default

      const adminConfigs = configs.filter(
        (c: any) => c.creator?.role !== 'PUBLISHER',
      );
      const defaultConfigs = configs.filter(
        (c: any) => c.creator?.role === 'PUBLISHER',
      );

      let found = false;

      // First try to match admin configs
      for (const config of adminConfigs) {
        const dFrom = new Date(config.effectiveFrom);
        const effectiveFromStr = `${dFrom.getUTCFullYear()}-${String(dFrom.getUTCMonth() + 1).padStart(2, '0')}-${String(dFrom.getUTCDate()).padStart(2, '0')}`;

        const effectiveToStr = config.effectiveTo
          ? (() => {
              const dTo = new Date(config.effectiveTo);
              return `${dTo.getUTCFullYear()}-${String(dTo.getUTCMonth() + 1).padStart(2, '0')}-${String(dTo.getUTCDate()).padStart(2, '0')}`;
            })()
          : null;

        if (
          reportDateStr >= effectiveFromStr &&
          (!effectiveToStr || reportDateStr <= effectiveToStr)
        ) {
          activeShare = Number(config.sharePercentage);
          found = true;
          break;
        }
      }

      // If no admin config matched, try default configs
      if (!found) {
        for (const config of defaultConfigs) {
          const dFrom = new Date(config.effectiveFrom);
          const effectiveFromStr = `${dFrom.getUTCFullYear()}-${String(dFrom.getUTCMonth() + 1).padStart(2, '0')}-${String(dFrom.getUTCDate()).padStart(2, '0')}`;

          const effectiveToStr = config.effectiveTo
            ? (() => {
                const dTo = new Date(config.effectiveTo);
                return `${dTo.getUTCFullYear()}-${String(dTo.getUTCMonth() + 1).padStart(2, '0')}-${String(dTo.getUTCDate()).padStart(2, '0')}`;
              })()
            : null;

          if (
            reportDateStr >= effectiveFromStr &&
            (!effectiveToStr || reportDateStr <= effectiveToStr)
          ) {
            activeShare = Number(config.sharePercentage);
            found = true;
            break;
          }
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

  async delete(id: string) {
    const publisher = await this.prisma.publisher.findUnique({
      where: { id },
    });
    if (!publisher) {
      throw new NotFoundException(`Publisher not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete websites (which cascades tags and reports)
      await tx.website.deleteMany({
        where: { publisherId: id },
      });

      // 2. Delete revenue share configs
      await tx.revenueShareConfig.deleteMany({
        where: { publisherId: id },
      });

      // 3. Delete dependent user logs/records
      await tx.auditLog.deleteMany({
        where: { userId: publisher.userId },
      });

      await tx.notificationRead.deleteMany({
        where: { userId: publisher.userId },
      });

      await tx.uploadLog.deleteMany({
        where: { uploadedBy: publisher.userId },
      });

      // 4. Delete publisher profile
      await tx.publisher.delete({
        where: { id },
      });

      // 5. Delete user account
      await tx.user.delete({
        where: { id: publisher.userId },
      });

      return {
        message: 'Publisher and associated user account deleted successfully',
      };
    });
  }
}
