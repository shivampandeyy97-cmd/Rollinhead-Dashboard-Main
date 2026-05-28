import { Controller, Get, Post, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, NotificationType, DeliveryType } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Req() req: any) {
    return this.notificationsService.findAllForUser(req.user.id, req.user.role as UserRole);
  }

  @Post(':id/read')
  async markRead(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id, req.user.role as UserRole);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createNotification(
    @Req() req: any,
    @Body() body: any,
  ) {
    const { title, message, type, delivery, targetRoles } = body;
    if (!title || !message || !targetRoles || !Array.isArray(targetRoles)) {
      throw new BadRequestException('Title, Message, and targetRoles (array) are required');
    }

    return this.notificationsService.createNotification({
      createdBy: req.user.id,
      title,
      message,
      type: type as NotificationType,
      delivery: delivery as DeliveryType,
      targetRoles: targetRoles as UserRole[],
    });
  }
}
