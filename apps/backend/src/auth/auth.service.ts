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

  async registerPublisher(data: {
    email: string;
    name: string;
    password: string;
    companyName: string;
    contactEmail: string;
    paymentDetails: string;
    paymentCycle?: PaymentCycle;
  }) {
    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email address already exists',
      );
    }

    const passwordHash = await this.hashPassword(data.password);

    // Run in a transaction to create User, Publisher, and default Revenue Share Config
    return this.prisma.$transaction(async (tx) => {
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
          status: PublisherStatus.PENDING, // Pending admin approval by default
        },
      });

      // 3. Create default Revenue Share Config (80% to publisher)
      await tx.revenueShareConfig.create({
        data: {
          publisherId: publisher.id,
          sharePercentage: 80.0,
          effectiveFrom: new Date(),
          createdBy: user.id, // Self-created initial record or system
        },
      });

      // 4. Log the action
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PUBLISHER_REGISTER',
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
}
