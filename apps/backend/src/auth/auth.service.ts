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
    const rawPassword = data.password || 'rollinhead_' + Math.random().toString(36).substring(2, 10);
    const passwordHash = await this.hashPassword(rawPassword);
    const isAdminOnboarded = requesterRole === UserRole.ADMIN || requesterRole === UserRole.SUPER_ADMIN;

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
          status: isAdminOnboarded ? PublisherStatus.ACTIVE : PublisherStatus.PENDING,
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
          action: isAdminOnboarded ? 'PUBLISHER_ONBOARDED_BY_ADMIN' : 'PUBLISHER_REGISTER',
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
    this.sendOnboardingOrReachoutEmails(result, result.publisher, rawPassword, requesterRole).catch(
      (err) => console.error('Failed to dispatch onboarding/reachout emails:', err),
    );

    return result;
  }

  private async sendOnboardingOrReachoutEmails(
    user: any,
    publisher: any,
    passwordPlainText: string,
    requesterRole?: string,
  ) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'Rollinhead Adtech <no-reply@rollinhead.com>';

    const isSmtpConfigured = !!(host && smtpUser && smtpPass);
    const isAdminOnboarded = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';

    // 1. Fallback: Log email details cleanly if credentials aren't set
    if (!isSmtpConfigured) {
      console.log('\n------------------------------------------------------------');
      if (isAdminOnboarded) {
        console.log('📢 [SMTP CONFIG NOT SET] Rollinhead Welcome Onboarding Email');
        console.log(`To: ${user.name} <${user.email}>`);
        console.log(`Subject: [Rollinhead] Welcome to the Publisher Dashboard!`);
        console.log(`Body:\nHi ${user.name},\n\nWelcome to your new Rollinhead publisher dashboard! You have been onboarded as a partner by our administrator.\n\nHere are your login credentials:\n  - Dashboard URL: https://shivampandeyy97-cmd.github.io/Rollinhead-Dashboard-Main/\n  - Email Address: ${user.email}\n  - Temporary Password: ${passwordPlainText}\n\nYou can change your password at any time in your Account Settings panel.\n\nBest regards,\nRollinhead Ops Team`);
      } else {
        console.log('📢 [SMTP CONFIG NOT SET] Rollinhead Self-Registration Alert');
        console.log(`To: contact@rollinhead.com`);
        console.log(`Subject: New publisher reachout`);
        console.log(`Body:\nA new publisher has self-registered on the Rollinhead Dashboard.\n\nPublisher Profile Details:\n  - Contact Name: ${user.name}\n  - Company Name: ${publisher.companyName}\n  - Email Address: ${user.email}\n  - Status: PENDING admin approval\n\nPlease log in to approve this partner's website inventory.\n\nLink: https://shivampandeyy97-cmd.github.io/Rollinhead-Dashboard-Main/`);
      }
      console.log('------------------------------------------------------------\n');
      return;
    }

    // 2. Send actual SMTP emails using nodemailer
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      if (isAdminOnboarded) {
        // Send onboarding email to publisher
        await transporter.sendMail({
          from,
          to: user.email,
          subject: '[Rollinhead] Welcome to the Publisher Dashboard!',
          text: `Hi ${user.name},\n\nWelcome to your new Rollinhead publisher dashboard! You have been onboarded as a partner by our administrator.\n\nHere are your login credentials:\n  - Dashboard URL: https://shivampandeyy97-cmd.github.io/Rollinhead-Dashboard-Main/\n  - Email Address: ${user.email}\n  - Temporary Password: ${passwordPlainText}\n\nYou can change your password at any time in your Account Settings panel.\n\nBest regards,\nRollinhead Ops Team`,
          html: `
            <div style="font-family: sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e9ecef; border-radius: 8px; color: #333;">
              <h2 style="color: #e50914; margin-top: 0; font-weight: 900; tracking-tight: -0.05em;">ROLLINHEAD</h2>
              <p>Hi <strong>${user.name}</strong>,</p>
              <p>Welcome to your new Rollinhead publisher dashboard! You have been onboarded as a partner by our administrator.</p>
              <div style="background-color: #f8f9fa; border-left: 4px solid #e50914; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0; color: #0f1115; font-size: 14px; font-weight: bold;">Your Login Credentials</h4>
                <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Dashboard Link:</strong> <a href="https://shivampandeyy97-cmd.github.io/Rollinhead-Dashboard-Main/" style="color: #e50914; text-decoration: none;">Access Dashboard</a></p>
                <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Email Address:</strong> ${user.email}</p>
                <p style="margin: 3px 0; font-size: 13px; color: #495057;"><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-family: monospace;">${passwordPlainText}</code></p>
              </div>
              <p style="font-size: 13px; color: #495057; line-height: 1.5;">You can change this temporary password at any time in your <strong>Account Settings</strong> panel after logging in.</p>
              <p style="font-size: 11px; color: #6c757d; margin-top: 30px; border-top: 1px solid #e9ecef; padding-top: 15px;">
                This is an automated operational broadcast from Rollinhead Adtech. Please do not reply directly to this mail.
              </p>
            </div>
          `,
        });
      } else {
        // Send alert email to contact@rollinhead.com
        await transporter.sendMail({
          from,
          to: 'contact@rollinhead.com',
          subject: 'New publisher reachout',
          text: `Hi Ops Team,\n\nA new publisher has self-registered on the Rollinhead Dashboard.\n\nPublisher Profile Details:\n  - Contact Name: ${user.name}\n  - Company Name: ${publisher.companyName}\n  - Email Address: ${user.email}\n  - Status: PENDING admin approval\n\nPlease log in to approve this partner's website inventory.\n\nLink: https://shivampandeyy97-cmd.github.io/Rollinhead-Dashboard-Main/`,
          html: `
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
              <p style="margin-top: 25px;"><a href="https://shivampandeyy97-cmd.github.io/Rollinhead-Dashboard-Main/" style="background-color: #e50914; color: white; padding: 10px 18px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Access Admin Panel</a></p>
            </div>
          `,
        });
      }
    } catch (err) {
      console.error('Failed to send SMTP emails inside registerPublisher:', err);
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

  async purgeProductionDatabase() {
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
          not: 'admin@rollinhead.com'
        }
      }
    });
    return { message: 'Production database successfully purged!' };
  }
}
