import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { UserRole, PublisherStatus, PaymentCycle } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };

    // Fetch publisher details if the user is a publisher
    let publisherInfo = null;
    if (user.role === UserRole.PUBLISHER) {
      publisherInfo = await this.prisma.publisher.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          companyName: true,
          status: true,
        },
      });
    }

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        publisher: publisherInfo,
      },
    };
  }

  async registerPublisher(
    data: {
      email: string;
      name: string;
      password?: string;
      companyName: string;
      contactEmail: string;
      paymentDetails: string;
      paymentCycle?: PaymentCycle;
    },
    requesterRole?: string,
  ) {
    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email address already exists',
      );
    }

    // Auto-generate secure temporary password if not provided by admin
    const rawPassword =
      data.password ||
      'rollinhead_' + Math.random().toString(36).substring(2, 10);
    const passwordHash = await this.hashPassword(rawPassword);
    const isAdminOnboarded =
      requesterRole === UserRole.ADMIN ||
      requesterRole === UserRole.SUPER_ADMIN;

    // Run in a transaction to create User, Publisher, and default Revenue Share Config
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          role: UserRole.PUBLISHER,
          isActive: true,
        },
      });

      // 2. Create Publisher Profile
      const publisher = await tx.publisher.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          contactEmail: data.contactEmail || data.email,
          paymentDetails:
            data.paymentDetails || 'Bank Transfer details pending',
          paymentCycle: data.paymentCycle || PaymentCycle.NET_30,
          status: isAdminOnboarded
            ? PublisherStatus.ACTIVE
            : PublisherStatus.PENDING,
        },
      });

      // 3. Create default Revenue Share Config (80% to publisher)
      await tx.revenueShareConfig.create({
        data: {
          publisherId: publisher.id,
          spanPercentage: undefined, // Wait, prisma has sharePercentage
          sharePercentage: 80.0,
          effectiveFrom: new Date(),
          createdBy: user.id, // Self-created initial record or system
        } as any,
      });

      // 4. Log the action
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: isAdminOnboarded
            ? 'PUBLISHER_ONBOARDED_BY_ADMIN'
            : 'PUBLISHER_REGISTER',
          entity: 'Publisher',
          entityId: publisher.id,
          newValue: { email: user.email, companyName: publisher.companyName },
        },
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        publisher,
      };
    });

    // Send emails in the background using the generated or provided password
    this.sendOnboardingOrReachoutEmails(
      result,
      result.publisher,
      rawPassword,
      requesterRole,
    ).catch((err) =>
      console.error('Failed to dispatch onboarding/reachout emails:', err),
    );

    return result;
  }

  private async sendOnboardingOrReachoutEmails(
    user: any,
    publisher: any,
    passwordPlainText: string,
    requesterRole?: string,
  ) {
    const smtpPass = process.env.SMTP_PASS;
    const from = 'Rollinhead <contact@rollinhead.com>';
    const isAdminOnboarded =
      requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';
    const frontendUrl = 'https://dash.rollinhead.com';

    // 1. Fallback: Log email details cleanly if API key isn't set
    if (!smtpPass) {
      console.log(
        '\n------------------------------------------------------------',
      );
      if (isAdminOnboarded) {
        console.log(
          '📢 [SMTP CONFIG NOT SET] Rollinhead Welcome Onboarding Email',
        );
        console.log(`To: ${user.name} <${user.email}>`);
        console.log(
          `Subject: [Rollinhead] Welcome to the Publisher Dashboard!`,
        );
        console.log(
          `Body:\nHi ${user.name},\n\nWelcome to your new Rollinhead publisher dashboard! You have been onboarded as a partner by our administrator.\n\nHere are your login credentials:\n  - Dashboard URL: ${frontendUrl}/\n  - Email Address: ${user.email}\n  - Temporary Password: ${passwordPlainText}\n\nYou can change your password at any time in your Account Settings panel.\n\nBest regards,\nRollinhead Ops Team`,
        );
      } else {
        console.log(
          '📢 [SMTP CONFIG NOT SET] Rollinhead Self-Registration Alert',
        );
        console.log(`To: contact@rollinhead.com`);
        console.log(`Subject: New publisher reachout`);
        console.log(
          `Body:\nA new publisher has self-registered on the Rollinhead Dashboard.\n\nPublisher Profile Details:\n  - Contact Name: ${user.name}\n  - Company Name: ${publisher.companyName}\n  - Email Address: ${user.email}\n  - Status: PENDING admin approval\n\nPlease log in to approve this partner's website inventory.\n\nLink: ${frontendUrl}/`,
        );
      }
      console.log(
        '------------------------------------------------------------\n',
      );

      // Log skip in AuditLog database table
      await this.prisma.auditLog
        .create({
          data: {
            userId: user.id,
            action: 'EMAIL_SKIPPED_SMTP_NOT_CONFIGURED',
            entity: 'Publisher',
            entityId: publisher.id,
            newValue: {
              recipient: isAdminOnboarded
                ? user.email
                : 'contact@rollinhead.com',
              type: isAdminOnboarded ? 'ONBOARDING' : 'REACHOUT',
              reason:
                'SMTP_PASS (Resend API Key) environment variable is missing.',
            },
          },
        })
        .catch((e) => console.error('Failed to log email skip to DB:', e));

      return;
    }

    // 2. Send actual emails using Resend HTTP API (bypassing SMTP port blocking)
    try {
      const recipient = isAdminOnboarded
        ? user.email
        : 'contact@rollinhead.com';
      const subject = isAdminOnboarded
        ? '[Rollinhead] Welcome to the Publisher Dashboard!'
        : 'New publisher reachout';
      const text = isAdminOnboarded
        ? `Hi ${user.name},\n\nWelcome to your new Rollinhead publisher dashboard! You have been onboarded as a partner by our administrator.\n\nHere are your login credentials:\n  - Dashboard URL: ${frontendUrl}/\n  - Email Address: ${user.email}\n  - Temporary Password: ${passwordPlainText}\n\nYou can change your password at any time in your Account Settings panel.\n\nBest regards,\nRollinhead Ops Team`
        : `Hi Ops Team,\n\nA new publisher has self-registered on the Rollinhead Dashboard.\n\nPublisher Profile Details:\n  - Contact Name: ${user.name}\n  - Company Name: ${publisher.companyName}\n  - Email Address: ${user.email}\n  - Status: PENDING admin approval\n\nPlease log in to approve this partner's website inventory.\n\nLink: ${frontendUrl}/`;

      const html = isAdminOnboarded
        ? `
          <div style="font-family: sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e9ecef; border-radius: 8px; color: #333;">
            <h2 style="color: #e50914; margin-top: 0; font-weight: 900; tracking-tight: -0.05em;">ROLLINHEAD</h2>
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Welcome to your new Rollinhead publisher dashboard! You have been onboarded as a partner by our administrator.</p>
            <div style="background-color: #f8f9fa; border-left: 4px solid #e50914; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h4 style="margin: 0 0 10px 0; color: #0f1115; font-size: 14px; font-weight: bold;">Your Login Credentials</h4>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Dashboard Link:</strong> <a href="${frontendUrl}/" style="color: #e50914; text-decoration: none;">Access Dashboard</a></p>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Email Address:</strong> ${user.email}</p>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-family: monospace;">${passwordPlainText}</code></p>
            </div>
            <p style="font-size: 13px; color: #495057; line-height: 1.5;">You can change this temporary password at any time in your <strong>Account Settings</strong> panel after logging in.</p>
            <p style="font-size: 11px; color: #6c757d; margin-top: 30px; border-top: 1px solid #e9ecef; padding-top: 15px;">
              This is an automated operational broadcast from Rollinhead Adtech. Please do not reply directly to this mail.
            </p>
          </div>
        `
        : `
          <div style="font-family: sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e9ecef; border-radius: 8px; color: #333;">
            <h2 style="color: #000000; margin-top: 0; font-weight: 900; tracking-tight: -0.05em;">ROLLINHEAD OPS</h2>
            <p>Hi Team,</p>
            <p>A new publisher has self-registered on the Rollinhead Dashboard and is awaiting approval.</p>
            <div style="background-color: #f8f9fa; border-left: 4px solid #333; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h4 style="margin: 0 0 10px 0; color: #0f1115; font-size: 14px; font-weight: bold;">New Publisher Details</h4>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Owner Name:</strong> ${user.name}</p>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Company Name:</strong> ${publisher.companyName}</p>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Email Address:</strong> ${user.email}</p>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Approval Status:</strong> <span style="color: #facc15; font-weight: bold;">PENDING</span></p>
            </div>
            <p style="font-size: 13px; color: #495057; line-height: 1.5;">Please log in to the administrator portal to review their inventory and approve their account.</p>
            <p style="margin-top: 25px;"><a href="${frontendUrl}/" style="background-color: #e50914; color: white; padding: 10px 18px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Access Admin Panel</a></p>
          </div>
        `;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${smtpPass}`,
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject,
          text,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Resend HTTP API returned status ${response.status}: ${errorText}`,
        );
      }

      const resData = await response.json();

      // Log success
      await this.prisma.auditLog
        .create({
          data: {
            userId: user.id,
            action: isAdminOnboarded
              ? 'EMAIL_ONBOARDING_SENT_SUCCESS'
              : 'EMAIL_REACHOUT_SENT_SUCCESS',
            entity: 'Publisher',
            entityId: publisher.id,
            newValue: { recipient, resendId: resData.id },
          },
        })
        .catch((e) => console.error('Failed to log email success to DB:', e));
    } catch (err: any) {
      console.error('Failed to send emails via Resend HTTP API:', err);
      // Log failure in AuditLog
      await this.prisma.auditLog
        .create({
          data: {
            userId: user.id,
            action: 'EMAIL_SENT_FAILURE',
            entity: 'Publisher',
            entityId: publisher.id,
            newValue: {
              recipient: isAdminOnboarded
                ? user.email
                : 'contact@rollinhead.com',
              error: err.message || String(err),
              type: isAdminOnboarded ? 'ONBOARDING' : 'REACHOUT',
            },
          },
        })
        .catch((e) => console.error('Failed to log email failure to DB:', e));
    }
  }

  async changePassword(
    userId: string,
    data: { oldPass: string; newPass: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(data.oldPass, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect old password');
    }

    const newPasswordHash = await this.hashPassword(data.newPass);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password updated successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Generic message to avoid user enumeration
      return {
        message:
          'If the email exists in our system, a temporary password has been sent.',
      };
    }

    if (!user.isActive) {
      // Inactive user security
      return {
        message:
          'If the email exists in our system, a temporary password has been sent.',
      };
    }

    // Generate secure temporary password
    const tempPassword = 'rh_' + Math.random().toString(36).substring(2, 10);
    const passwordHash = await this.hashPassword(tempPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Send email using Resend HTTP API
    const smtpPass = process.env.SMTP_PASS;
    const from = 'Rollinhead <contact@rollinhead.com>';
    const frontendUrl = 'https://dash.rollinhead.com';

    if (!smtpPass) {
      console.log(
        '\n------------------------------------------------------------',
      );
      console.log('📢 [SMTP CONFIG NOT SET] Rollinhead Password Reset Email');
      console.log(`To: ${user.name} <${user.email}>`);
      console.log(`Subject: [Rollinhead] Temporary Password Reset`);
      console.log(
        `Body:\nHi ${user.name},\n\nYou requested a password reset. A temporary password has been generated for you:\n\nTemporary Password: ${tempPassword}\n\nPlease use this to log in at ${frontendUrl}/login and then update your password immediately in your Account Settings panel.\n\nBest regards,\nRollinhead Team`,
      );
      console.log(
        '------------------------------------------------------------\n',
      );
    } else {
      try {
        const subject = '[Rollinhead] Temporary Password Reset';
        const text = `Hi ${user.name},\n\nYou requested a password reset. A temporary password has been generated for you:\n\nTemporary Password: ${tempPassword}\n\nPlease use this to log in at ${frontendUrl}/login and then update your password immediately in your Account Settings panel.\n\nBest regards,\nRollinhead Team`;
        const html = `
          <div style="font-family: sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e9ecef; border-radius: 8px; color: #333;">
            <h2 style="color: #e50914; margin-top: 0; font-weight: 900; tracking-tight: -0.05em;">ROLLINHEAD</h2>
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>You requested a password reset. A temporary password has been generated for you:</p>
            <div style="background-color: #f8f9fa; border-left: 4px solid #e50914; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h4 style="margin: 0 0 10px 0; color: #0f1115; font-size: 14px; font-weight: bold;">Temporary Credentials</h4>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Login URL:</strong> <a href="${frontendUrl}/login" style="color: #e50914; text-decoration: none;">Access Login</a></p>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Email Address:</strong> ${user.email}</p>
              <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-family: monospace;">${tempPassword}</code></p>
            </div>
            <p style="font-size: 13px; color: #495057; line-height: 1.5;">Please use this temporary password to access your account, then update it immediately in your <strong>Account Settings</strong> panel.</p>
            <p style="font-size: 11px; color: #6c757d; margin-top: 30px; border-top: 1px solid #e9ecef; padding-top: 15px;">
              This is an automated operational broadcast from Rollinhead Adtech. Please do not reply directly to this mail.
            </p>
          </div>
        `;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${smtpPass}`,
          },
          body: JSON.stringify({
            from,
            to: [user.email],
            subject,
            text,
            html,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const errTxt = await res.text();
            throw new Error(`Resend API Error: ${res.status} ${errTxt}`);
          }
        });

        // Audit log success
        await this.prisma.auditLog
          .create({
            data: {
              userId: user.id,
              action: 'PASSWORD_RESET_EMAIL_SENT_SUCCESS',
              entity: 'User',
              entityId: user.id,
              newValue: { email: user.email },
            },
          })
          .catch((e) => console.error('Failed to log reset success to DB:', e));
      } catch (err: any) {
        console.error(
          'Failed to send password reset email via Resend API:',
          err,
        );
        // Audit log failure
        await this.prisma.auditLog
          .create({
            data: {
              userId: user.id,
              action: 'PASSWORD_RESET_EMAIL_SENT_FAILURE',
              entity: 'User',
              entityId: user.id,
              newValue: {
                email: user.email,
                error: err.message || String(err),
              },
            },
          })
          .catch((e) => console.error('Failed to log reset failure to DB:', e));
      }
    }

    return {
      message:
        'If the email exists in our system, a temporary password has been sent.',
    };
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      companyName?: string;
      contactEmail?: string;
      paymentDetails?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { publisher: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update User if name is provided
      if (data.name) {
        await tx.user.update({
          where: { id: userId },
          data: { name: data.name },
        });
      }

      // 2. Update Publisher profile if user is a publisher and fields are provided
      if (user.role === UserRole.PUBLISHER && user.publisher) {
        await tx.publisher.update({
          where: { id: user.publisher.id },
          data: {
            companyName: data.companyName,
            contactEmail: data.contactEmail,
            paymentDetails: data.paymentDetails,
          },
        });
      }

      // 3. Log the audit
      await tx.auditLog.create({
        data: {
          userId,
          action: 'PROFILE_SELF_UPDATE',
          entity: 'User',
          entityId: userId,
          newValue: data,
        },
      });

      return { message: 'Profile updated successfully' };
    });
  }

  async purgeProductionDatabase(userId: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Administrator account not found');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect administrator password');
    }

    await this.prisma.notificationRead.deleteMany({});
    await this.prisma.notification.deleteMany({});
    await this.prisma.auditLog.deleteMany({});
    await this.prisma.uploadLog.deleteMany({});
    await this.prisma.revenueReport.deleteMany({});
    await this.prisma.tag.deleteMany({});
    await this.prisma.website.deleteMany({});
    await this.prisma.revenueShareConfig.deleteMany({});
    await this.prisma.publisher.deleteMany({});
    await this.prisma.user.deleteMany({
      where: {
        email: {
          not: 'contact@rollinhead.com',
        },
      },
    });
    return { message: 'Production database successfully purged!' };
  }

  async getDbStatus() {
    try {
      const usersCount = await this.prisma.user.count();
      const publisherCount = await this.prisma.publisher.count();
      const auditLogs = await this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entity: true,
          newValue: true,
          createdAt: true,
        },
      });
      return {
        usersCount,
        publisherCount,
        auditLogs,
      };
    } catch (e: any) {
      return {
        error: e.message || String(e),
      };
    }
  }
}
