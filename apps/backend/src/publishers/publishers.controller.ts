import { Controller, Get, Patch, Post, Param, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { PublishersService } from './publishers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, PublisherStatus, PaymentCycle } from '@prisma/client';

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
  async updatePublisher(
    @Param('id') id: string,
    @Body() body: any,
  ) {
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
  async resetPassword(
    @Param('id') id: string,
    @Body() body: any,
  ) {
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
    const { sharePercentage, effectiveFrom } = body;
    if (sharePercentage === undefined || !effectiveFrom) {
      throw new BadRequestException('Share percentage and effective from date are required');
    }

    const percentage = parseFloat(sharePercentage);
    if (isNaN(percentage)) {
      throw new BadRequestException('Share percentage must be a valid number');
    }

    return this.publishersService.addRevenueShareConfig(id, {
      sharePercentage: percentage,
      effectiveFrom: new Date(effectiveFrom),
      adminUserId: req.user.id,
    });
  }

  @Get(':id/rev-share')
  async getRevShareHistory(@Param('id') id: string) {
    return this.publishersService.getRevenueShareHistory(id);
  }
}
