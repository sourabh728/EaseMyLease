import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

/** Soft inventory cap for FREE plan (warn only). */
export const FREE_INVENTORY_SOFT_LIMIT = 50;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async getMyTenantWithLimits(tenantId: string) {
    const tenant = await this.findById(tenantId);
    const inventoryCount = await this.prisma.inventoryItem.count({
      where: { tenantId, status: { not: 'RETIRED' } },
    });
    const shopCount = await this.prisma.shop.count({ where: { tenantId } });

    const freeLimitWarning =
      tenant.plan === SubscriptionPlan.FREE &&
      inventoryCount > FREE_INVENTORY_SOFT_LIMIT
        ? `FREE plan soft limit: you have ${inventoryCount} active inventory items (suggested max ${FREE_INVENTORY_SOFT_LIMIT}). Upgrade for higher volume.`
        : null;

    return {
      ...tenant,
      usage: {
        inventoryCount,
        shopCount,
        freeInventorySoftLimit: FREE_INVENTORY_SOFT_LIMIT,
      },
      freeLimitWarning,
    };
  }

  async listAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            shops: true,
            inventoryItems: true,
            rentals: true,
          },
        },
      },
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    await this.findById(id);

    const data: Prisma.TenantUpdateInput = {};
    if (dto.plan !== undefined) data.plan = dto.plan;
    if (dto.subscriptionStatus !== undefined) {
      data.subscriptionStatus = dto.subscriptionStatus;
    }
    if (dto.trialEndsAt !== undefined) {
      data.trialEndsAt = dto.trialEndsAt ? new Date(dto.trialEndsAt) : null;
    }
    if (dto.currentPeriodEnd !== undefined) {
      data.currentPeriodEnd = dto.currentPeriodEnd
        ? new Date(dto.currentPeriodEnd)
        : null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.tenant.update({ where: { id }, data });
  }
}
