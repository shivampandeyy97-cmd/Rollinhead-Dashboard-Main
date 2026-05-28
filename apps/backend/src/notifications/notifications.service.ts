import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole, NotificationType, DeliveryType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(data: {
    createdBy: string;
    title: string;
    message: string;
    type?: NotificationType;
    delivery?: DeliveryType;
    targetRoles: UserRole[];
  }) {
    return this.prisma.notification.create({
      data: {
        createdBy: data.createdBy,
        title: data.title,
        message: data.message,
        type: data.type || NotificationType.INFO,
        delivery: data.delivery || DeliveryType.IN_APP,
        targetRoles: data.targetRoles,
      },
    });
  }

  async findAllForUser(userId: string, role: UserRole) {
    // 1. Get all notifications
    const notifications = await this.prisma.notification.findMany({
      orderBy: { sentAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 2. Filter notifications targeted to this user's role
    const filtered = notifications.filter((notif) => {
      const targets = notif.targetRoles as string[];
      return targets.includes(role);
    });

    // 3. Find which ones are read by the user
    const reads = await this.prisma.notificationRead.findMany({
      where: { userId },
      select: { notificationId: true },
    });

    const readIds = new Set(reads.map((r) => r.notificationId));

    return filtered.map((notif) => {
      const { targetRoles, ...rest } = notif;
      return {
        ...rest,
        isRead: readIds.has(notif.id),
      };
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Upsert read record
    await this.prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      create: {
        notificationId,
        userId,
      },
      update: {}, // Nothing to update
    });

    return { success: true };
  }

  async markAllAsRead(userId: string, role: UserRole) {
    const notifications = await this.findAllForUser(userId, role);
    const unread = notifications.filter((n) => !n.isRead);

    const createRecords = unread.map((notif) => ({
      notificationId: notif.id,
      userId,
    }));

    if (createRecords.length > 0) {
      await this.prisma.notificationRead.createMany({
        data: createRecords,
        skipDuplicates: true,
      });
    }

    return { success: true, count: createRecords.length };
  }
}
