import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { WebsitesService } from './websites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, WebsiteCategory, TagType } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebsitesController {
  constructor(private websitesService: WebsitesService) {}

  @Get('websites')
  async getWebsites(@Req() req: any) {
    return this.websitesService.findAll(req.user.id, req.user.role as UserRole);
  }

  @Get('websites/:id')
  async getWebsite(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.websitesService.findOne(id, req.user.id, req.user.role as UserRole);
  }

  @Post('websites')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createWebsite(@Body() body: any) {
    return this.websitesService.createWebsite({
      publisherId: body.publisherId,
      domain: body.domain,
      category: body.category as WebsiteCategory,
    });
  }

  @Patch('websites/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateWebsite(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.websitesService.updateWebsite(id, {
      category: body.category as WebsiteCategory,
      isActive: body.isActive,
    });
  }

  @Delete('websites/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteWebsite(@Param('id') id: string) {
    return this.websitesService.deleteWebsite(id);
  }

  // --- Tags Endpoints ---

  @Get('websites/:id/tags')
  async getWebsiteTags(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.websitesService.findTagsForWebsite(id, req.user.id, req.user.role as UserRole);
  }

  @Post('websites/:id/tags')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createTag(
    @Param('id') websiteId: string,
    @Body() body: any,
  ) {
    return this.websitesService.createTag(websiteId, {
      tagType: body.tagType as TagType,
      placementId: body.placementId,
      config: body.config,
    });
  }

  @Patch('tags/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateTag(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.websitesService.updateTag(id, {
      isActive: body.isActive,
      config: body.config,
    });
  }

  @Delete('tags/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteTag(@Param('id') id: string) {
    return this.websitesService.deleteTag(id);
  }
}
