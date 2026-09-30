import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string) {
    return this.prisma.shop.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneForTenant(id: string, tenantId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }
}
