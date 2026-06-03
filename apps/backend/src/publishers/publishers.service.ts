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

  async addRevenueShareConfig(
    id: string,
    data: {
      sharePercentage: number;
      effectiveFrom: Date;
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
      // 1. Close active configurations if they overlap or cap effectiveTo
      await tx.revenueShareConfig.updateMany({
        where: {
          publisherId: id,
          effectiveTo: null,
        },
        data: {
          effectiveTo: data.effectiveFrom,
        },
      });

      // 2. Create the new config
      const newConfig = await tx.revenueShareConfig.create({
        data: {
          publisherId: id,
          sharePercentage: data.sharePercentage,
          effectiveFrom: data.effectiveFrom,
          createdBy: data.adminUserId,
        },
      });

      // 3. Audit log
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
