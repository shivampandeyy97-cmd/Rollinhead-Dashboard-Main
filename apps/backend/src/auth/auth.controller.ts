import { Controller, Post, Body, Get, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Response, Request } from 'express';
import { PaymentCycle } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response,
  ) {
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
  async register(
    @Body() body: any,
  ) {
    const { email, name, password, companyName, contactEmail, paymentDetails, paymentCycle } = body;
    if (!email || !name || !password || !companyName) {
      throw new BadRequestException('Email, Name, Password, and Company Name are required');
    }

    return this.authService.registerPublisher({
      email,
      name,
      password,
      companyName,
      contactEmail,
      paymentDetails,
      paymentCycle: paymentCycle as PaymentCycle,
    });
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
  @Post('change-password')
  async changePassword(
    @Req() req: any,
    @Body() body: any,
  ) {
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) {
      throw new BadRequestException('Old password and new password are required');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    return this.authService.changePassword(req.user.id, {
      oldPass: oldPassword,
      newPass: newPassword,
    });
  }
}
