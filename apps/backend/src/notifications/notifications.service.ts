import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole, NotificationType, DeliveryType } from '@prisma/client';
import * as nodemailer from 'nodemailer';

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
    const notification = await this.prisma.notification.create({
      data: {
        createdBy: data.createdBy,
        title: data.title,
        message: data.message,
        type: data.type || NotificationType.INFO,
        delivery: data.delivery || DeliveryType.IN_APP,
        targetRoles: data.targetRoles,
      },
    });

    // If delivery is EMAIL or BOTH, trigger nodemailer dispatch in the background
    if (
      data.delivery === DeliveryType.EMAIL ||
      data.delivery === DeliveryType.BOTH
    ) {
      this.sendNotificationEmails(notification, data.targetRoles).catch(
        (err) => {
          console.error('Failed to send notification emails:', err);
        },
      );
    }

    return notification;
  }

  private async sendNotificationEmails(
    notification: any,
    targetRoles: UserRole[],
  ) {
    // 1. Locate recipients matching the targeted user roles
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: targetRoles },
        isActive: true,
      },
      select: {
        email: true,
        name: true,
      },
    });

    if (users.length === 0) return;

    // 2. Fetch credentials from environment
    const pass = process.env.SMTP_PASS;
    const from = 'Rollinhead <contact@rollinhead.com>';

    // 3. Fallback: Log email details cleanly if credentials aren't set
    if (!pass) {
      console.log(
        '\n------------------------------------------------------------',
      );
      console.log(
        '📢 [SMTP CONFIG NOT SET] Rollinhead Fallback Email Dispatch',
      );
      console.log(`Subject: [Rollinhead Announcement] ${notification.title}`);
      console.log(`Body: ${notification.message}`);
      console.log(`Recipients (${users.length}):`);
      users.forEach((u) => console.log(`  - ${u.name} <${u.email}>`));
      console.log(
        '------------------------------------------------------------\n',
      );

      // Log warning in DB
      await this.prisma.auditLog.create({
        data: {
          userId: notification.createdBy,
          action: 'EMAIL_ANNOUNCEMENT_SKIPPED_SMTP_NOT_CONFIGURED',
          entity: 'Notification',
          entityId: notification.id,
          newValue: {
            reason: 'SMTP_PASS (Resend API Key) environment variable is missing.',
            recipientsCount: users.length,
          },
        },
      }).catch((e) => console.error('Failed to log email skip to DB:', e));

      return;
    }

    // 4. Send actual emails using Resend HTTP API
    const emailPromises = users.map(async (u) => {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pass}`,
          },
          body: JSON.stringify({
            from,
            to: [u.email],
            subject: `[Rollinhead Announcement] ${notification.title}`,
            text: `Hi ${u.name},\n\nYou have a new notification from the Rollinhead Adtech Platform:\n\n${notification.message}\n\nBest regards,\nRollinhead Ops Team`,
            html: `
              <div style="font-family: sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e9ecef; border-radius: 8px; color: #333;">
                <h2 style="color: #e50914; margin-top: 0; font-weight: 900; tracking-tight: -0.05em;">ROLLINHEAD</h2>
                <p>Hi <strong>${u.name}</strong>,</p>
                <p>You have a new announcement from the Rollinhead Adtech Platform:</p>
                <div style="background-color: #f8f9fa; border-left: 4px solid #e50914; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <h4 style="margin: 0 0 10px 0; color: #0f1115; font-size: 14px; font-weight: bold;">${notification.title}</h4>
                  <p style="margin: 0; color: #495057; font-size: 13px; line-height: 1.6;">${notification.message}</p>
                </div>
                <p style="font-size: 11px; color: #6c757d; margin-top: 30px; border-top: 1px solid #e9ecef; padding-top: 15px;">
                  This is an automated operational broadcast from Rollinhead Adtech. Please do not reply directly to this mail.
                </p>
              </div>
            `,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Resend HTTP API returned status ${response.status}: ${errorText}`);
        }

        const resData = await response.json();

        // Log success in AuditLog
        await this.prisma.auditLog.create({
          data: {
            userId: notification.createdBy,
            action: 'EMAIL_ANNOUNCEMENT_SENT_SUCCESS',
            entity: 'Notification',
            entityId: notification.id,
            newValue: { recipient: u.email, resendId: resData.id },
          },
        }).catch((e) => console.error('Failed to log email success to DB:', e));

      } catch (mailErr: any) {
        console.error(`Failed to send email to ${u.email}:`, mailErr);

        // Log failure in AuditLog
        await this.prisma.auditLog.create({
          data: {
            userId: notification.createdBy,
            action: 'EMAIL_ANNOUNCEMENT_SENT_FAILURE',
            entity: 'Notification',
            entityId: notification.id,
            newValue: {
              recipient: u.email,
              error: mailErr.message || String(mailErr),
            },
          },
        }).catch((e) => console.error('Failed to log email failure to DB:', e));
      }
    });

    await Promise.all(emailPromises);
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
