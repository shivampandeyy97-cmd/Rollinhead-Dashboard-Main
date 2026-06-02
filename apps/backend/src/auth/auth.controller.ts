import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import type { Response, Request } from 'express';
import { PaymentCycle } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const validatedUser = await this.authService.validateUser(email, password);
    const loginResult = await this.authService.login(validatedUser);

    // Set cookie
    res.cookie('access_token', loginResult.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    return {
      user: loginResult.user,
      accessToken: loginResult.accessToken,
    };
  }

  @Post('register')
  async register(@Req() req: Request, @Body() body: any) {
    const {
      email,
      name,
      password,
      companyName,
      contactEmail,
      paymentDetails,
      paymentCycle,
    } = body;

    // Try to extract and decode JWT to check if requester is an admin
    let requesterRole: string | undefined = undefined;
    try {
      const token = req.cookies?.access_token || 
                    (req.headers.authorization?.startsWith('Bearer ') 
                      ? req.headers.authorization.substring(7) 
                      : null);
      if (token) {
        const payload = this.jwtService.verify(token);
        requesterRole = payload?.role;
      }
    } catch (e) {
      // Ignore token verification errors (means it is an unauthenticated guest signup)
    }

    const isAdminOnboard = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';

    if (!email || !name || (!isAdminOnboard && !password) || !companyName) {
      throw new BadRequestException(
        'Email, Name, ' + (isAdminOnboard ? '' : 'Password, ') + 'and Company Name are required',
      );
    }

    return this.authService.registerPublisher(
      {
        email,
        name,
        password,
        companyName,
        contactEmail,
        paymentDetails,
        paymentCycle: paymentCycle as PaymentCycle,
      },
      requesterRole,
    );
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    const { name, companyName, contactEmail, paymentDetails } = body;
    return this.authService.updateProfile(req.user.id, {
      name,
      companyName,
      contactEmail,
      paymentDetails,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() body: any) {
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) {
      throw new BadRequestException(
        'Old password and new password are required',
      );
    }

    if (newPassword.length < 6) {
      throw new BadRequestException(
        'New password must be at least 6 characters long',
      );
    }

    return this.authService.changePassword(req.user.id, {
      oldPass: oldPassword,
      newPass: newPassword,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('purge-db')
  async purgeDatabase(@Req() req: any, @Body() body: any) {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can purge the database');
    }
    const { password } = body;
    if (!password) {
      throw new BadRequestException('Administrator password is required to reset the database');
    }
    return this.authService.purgeProductionDatabase(req.user.id, password);
  }

  @Get('smtp-status')
  async checkSmtpStatus() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'Rollinhead Adtech <no-reply@rollinhead.com>';

    const isSmtpConfigured = !!(host && smtpUser && smtpPass);

    if (!isSmtpConfigured) {
      return {
        configured: false,
        host: host || null,
        port,
        hasUser: !!smtpUser,
        hasPass: !!smtpPass,
        from,
        error: 'SMTP host, user, or pass environment variables are missing.',
      };
    }

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
        tls: {
          rejectUnauthorized: false,
        },
      });

      await transporter.verify();
      return {
        configured: true,
        host,
        port,
        hasUser: !!smtpUser,
        hasPass: !!smtpPass,
        from,
        connection: 'SUCCESSFUL',
      };
    } catch (err: any) {
      return {
        configured: true,
        host,
        port,
        hasUser: !!smtpUser,
        hasPass: !!smtpPass,
        from,
        connection: 'FAILED',
        error: err.message || String(err),
      };
    }
  }
}

