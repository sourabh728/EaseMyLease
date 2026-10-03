import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Resolve a shop belonging to the tenant, or the tenant's first shop. */
export async function resolveShopId(
  prisma: PrismaService,
  tenantId: string,
  shopId?: string | null,
): Promise<string | null> {
  if (shopId) {
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: { id: true },
    });
    if (!shop) {
      throw new BadRequestException('Shop not found for this tenant');
    }
    return shop.id;
  }

  const first = await prisma.shop.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return first?.id ?? null;
}
