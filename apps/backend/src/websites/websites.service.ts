import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole, WebsiteCategory, TagType } from '@prisma/client';

@Injectable()
export class WebsitesService {
  constructor(private prisma: PrismaService) {}

  async createWebsite(data: {
    publisherId: string;
    domain: string;
    category?: WebsiteCategory;
  }) {
    // Check if domain already exists
    const existing = await this.prisma.website.findUnique({
      where: { domain: data.domain },
    });
    if (existing) {
      throw new ConflictException(`Website domain '${data.domain}' is already registered`);
    }

    // Check if publisher exists
    const publisher = await this.prisma.publisher.findUnique({
      where: { id: data.publisherId },
    });
    if (!publisher) {
      throw new NotFoundException(`Publisher with ID '${data.publisherId}' not found`);
    }

    return this.prisma.website.create({
      data: {
        publisherId: data.publisherId,
        domain: data.domain,
        category: data.category || WebsiteCategory.OTHER,
        isActive: true,
      },
    });
  }

  async findAll(userId: string, role: UserRole) {
    if (role === UserRole.PUBLISHER) {
      const publisher = await this.prisma.publisher.findUnique({
        where: { userId },
      });
      if (!publisher) {
        return [];
      }
      return this.prisma.website.findMany({
        where: { publisherId: publisher.id },
        include: { tags: true },
      });
    }

    return this.prisma.website.findMany({
      include: {
        publisher: {
          select: {
            id: true,
            companyName: true,
            contactEmail: true,
          },
        },
        tags: true,
      },
    });
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const website = await this.prisma.website.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!website) {
      throw new NotFoundException(`Website not found`);
    }

    if (role === UserRole.PUBLISHER) {
      const publisher = await this.prisma.publisher.findUnique({
        where: { userId },
      });
      if (!publisher || website.publisherId !== publisher.id) {
        throw new ForbiddenException('You do not have permission to access this website');
      }
    }

    return website;
  }

  async updateWebsite(id: string, data: { category?: WebsiteCategory; isActive?: boolean }) {
    const website = await this.prisma.website.findUnique({ where: { id } });
    if (!website) {
      throw new NotFoundException('Website not found');
    }

    return this.prisma.website.update({
      where: { id },
      data,
    });
  }

  async deleteWebsite(id: string) {
    const website = await this.prisma.website.findUnique({ where: { id } });
    if (!website) {
      throw new NotFoundException('Website not found');
    }

    await this.prisma.website.delete({ where: { id } });
    return { message: 'Website deleted successfully' };
  }

  // --- Tags Management ---

  async createTag(websiteId: string, data: {
    tagType: TagType;
    placementId: string;
    config?: any;
  }) {
    const website = await this.prisma.website.findUnique({ where: { id: websiteId } });
    if (!website) {
      throw new NotFoundException(`Website not found`);
    }

    const existingTag = await this.prisma.tag.findUnique({
      where: { placementId: data.placementId },
    });
    if (existingTag) {
      throw new ConflictException(`Tag placement ID '${data.placementId}' already exists`);
    }

    return this.prisma.tag.create({
      data: {
        websiteId,
        tagType: data.tagType,
        placementId: data.placementId,
        config: data.config || {},
        isActive: true,
      },
    });
  }

  async findTagsForWebsite(websiteId: string, userId: string, role: UserRole) {
    // Validate permission to read website first
    await this.findOne(websiteId, userId, role);

    return this.prisma.tag.findMany({
      where: { websiteId },
    });
  }

  async updateTag(id: string, data: { isActive?: boolean; config?: any }) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return this.prisma.tag.update({
      where: { id },
      data,
    });
  }

  async deleteTag(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.tag.delete({ where: { id } });
    return { message: 'Tag deleted successfully' };
  }
}
