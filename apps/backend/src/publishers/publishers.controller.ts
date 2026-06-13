import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { PublishersService } from './publishers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, PublisherStatus, PaymentCycle } from '@prisma/client';

function parseDateAsUtc(dateStr: string): Date {
  const clean = dateStr.trim();

  // 1. Try YYYY-MM-DD or YYYY/MM/DD
  let match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month - 1, day));
  }

  // 2. Try MM/DD/YYYY or MM-DD-YYYY
  match = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month - 1, day));
  }

  // Fallback to standard parsing
  const d = new Date(clean);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  if (!clean.includes('T') && !clean.includes(':')) {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  return d;
}

@Controller('publishers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class PublishersController {
  constructor(private publishersService: PublishersService) {}

  @Get()
  async getPublishers() {
    return this.publishersService.findAll();
  }

  @Get(':id')
  async getPublisher(@Param('id') id: string) {
    return this.publishersService.findOne(id);
  }

  @Patch(':id')
  async updatePublisher(@Param('id') id: string, @Body() body: any) {
    return this.publishersService.update(id, {
      companyName: body.companyName,
      contactEmail: body.contactEmail,
      paymentDetails: body.paymentDetails,
      paymentCycle: body.paymentCycle as PaymentCycle,
      status: body.status as PublisherStatus,
      isActive: body.isActive,
      name: body.name,
    });
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() body: any) {
    const { password } = body;
    if (!password) {
      throw new BadRequestException('New password is required');
    }
    return this.publishersService.resetPassword(id, password);
  }

  @Post(':id/rev-share')
  async addRevShare(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const { sharePercentage, effectiveFrom, effectiveTo } = body;
    if (sharePercentage === undefined || !effectiveFrom) {
      throw new BadRequestException(
        'Share percentage and effective from date are required',
      );
    }

    const percentage = parseFloat(sharePercentage);
    if (isNaN(percentage)) {
      throw new BadRequestException('Share percentage must be a valid number');
    }

    return this.publishersService.addRevenueShareConfig(id, {
      sharePercentage: percentage,
      effectiveFrom: parseDateAsUtc(effectiveFrom),
      effectiveTo: effectiveTo ? parseDateAsUtc(effectiveTo) : null,
      adminUserId: req.user.id,
    });
  }

  @Get(':id/rev-share')
  async getRevShareHistory(@Param('id') id: string) {
    return this.publishersService.getRevenueShareHistory(id);
  }

  @Delete(':id')
  async deletePublisher(@Param('id') id: string) {
    return this.publishersService.delete(id);
  }
}
