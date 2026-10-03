import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryStatus, Prisma, RentalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginateMeta } from '../common/dto/pagination-query.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { resolveShopId } from '../common/utils/shop-context';
import {
  FREE_INVENTORY_SOFT_LIMIT,
} from '../tenants/tenants.service';

const itemInclude = {
  category: {
    select: {
      id: true,
      name: true,
      parentId: true,
      parent: { select: { id: true, name: true } },
    },
  },
  shop: { select: { id: true, name: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.InventoryItemInclude;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListInventoryQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = await this.buildWhere(tenantId, query);
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const [total, data] = await this.prisma.$transaction([
      this.prisma.inventoryItem.count({ where }),
      this.prisma.inventoryItem.findMany({
        where,
        include: itemInclude,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, meta: paginateMeta(total, page, pageSize) };
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: itemInclude,
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return item;
  }

  async findByCode(tenantId: string, itemCode: string) {
    const code = itemCode.trim().toUpperCase();
    const item = await this.prisma.inventoryItem.findFirst({
      where: { tenantId, itemCode: code },
      include: itemInclude,
    });
    if (!item) {
      throw new NotFoundException(`No inventory item with code ${code}`);
    }
    return item;
  }

  async resolveForFlow(tenantId: string, itemCode: string) {
    const item = await this.findByCode(tenantId, itemCode);
    const activeRentalItem = await this.prisma.rentalItem.findFirst({
      where: {
        tenantId,
        inventoryItemId: item.id,
        rental: {
          status: {
            in: [
              RentalStatus.ACTIVE,
              RentalStatus.OVERDUE,
              RentalStatus.RETURN_PENDING,
              RentalStatus.CONFIRMED,
            ],
          },
        },
      },
      include: {
        rental: {
          select: {
            id: true,
            rentalNumber: true,
            status: true,
            expectedReturnDate: true,
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { rental: { createdAt: 'desc' } },
    });

    return {
      item,
      suggestedAction:
        item.status === InventoryStatus.AVAILABLE
          ? 'RENT'
          : item.status === InventoryStatus.ON_RENT ||
              item.status === InventoryStatus.RESERVED
            ? 'RETURN'
            : 'VIEW',
      activeRental: activeRentalItem?.rental ?? null,
    };
  }

  async create(tenantId: string, dto: CreateInventoryItemDto) {
    await this.assertCategory(tenantId, dto.categoryId);
    const shopId = await resolveShopId(this.prisma, tenantId, dto.shopId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    const activeCount = await this.prisma.inventoryItem.count({
      where: { tenantId, status: { not: InventoryStatus.RETIRED } },
    });
    const softLimitWarning =
      tenant?.plan === 'FREE' && activeCount >= FREE_INVENTORY_SOFT_LIMIT
        ? `FREE plan soft limit reached (${FREE_INVENTORY_SOFT_LIMIT} items). Item was still created.`
        : null;

    try {
      const item = await this.prisma.inventoryItem.create({
        data: {
          tenantId,
          shopId,
          categoryId: dto.categoryId,
          itemCode: dto.itemCode.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          size: dto.size?.trim() || null,
          color: dto.color?.trim() || null,
          brand: dto.brand?.trim() || null,
          purchasePrice:
            dto.purchasePrice !== undefined
              ? new Prisma.Decimal(dto.purchasePrice)
              : null,
          rentalPrice: new Prisma.Decimal(dto.rentalPrice),
          securityDeposit:
            dto.securityDeposit !== undefined
              ? new Prisma.Decimal(dto.securityDeposit)
              : null,
          condition: dto.condition?.trim() || null,
          status: dto.status ?? InventoryStatus.AVAILABLE,
          location: dto.location?.trim() || null,
          occasion: dto.occasion?.trim() || null,
          images: dto.images?.length
            ? {
                create: dto.images.map((image, index) => ({
                  tenantId,
                  url: image.url.trim(),
                  sortOrder: image.sortOrder ?? index,
                })),
              }
            : undefined,
        },
        include: itemInclude,
      });
      return softLimitWarning ? { ...item, softLimitWarning } : item;
    } catch (error) {
      this.handleUnique(error);
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateInventoryItemDto) {
    await this.findOne(tenantId, id);

    if (dto.categoryId) {
      await this.assertCategory(tenantId, dto.categoryId);
    }

    const data: Prisma.InventoryItemUpdateInput = {};

    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.itemCode !== undefined)
      data.itemCode = dto.itemCode.trim().toUpperCase();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description.trim() || null;
    if (dto.size !== undefined) data.size = dto.size.trim() || null;
    if (dto.color !== undefined) data.color = dto.color.trim() || null;
    if (dto.brand !== undefined) data.brand = dto.brand.trim() || null;
    if (dto.purchasePrice !== undefined) {
      data.purchasePrice =
        dto.purchasePrice === null
          ? null
          : new Prisma.Decimal(dto.purchasePrice);
    }
    if (dto.rentalPrice !== undefined) {
      data.rentalPrice = new Prisma.Decimal(dto.rentalPrice);
    }
    if (dto.securityDeposit !== undefined) {
      data.securityDeposit =
        dto.securityDeposit === null
          ? null
          : new Prisma.Decimal(dto.securityDeposit);
    }
    if (dto.condition !== undefined)
      data.condition = dto.condition.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.location !== undefined)
      data.location = dto.location.trim() || null;
    if (dto.occasion !== undefined)
      data.occasion = dto.occasion.trim() || null;
    if (dto.shopId !== undefined) {
      const shopId = await resolveShopId(this.prisma, tenantId, dto.shopId);
      data.shop = shopId ? { connect: { id: shopId } } : { disconnect: true };
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.images !== undefined) {
          await tx.inventoryImage.deleteMany({
            where: { tenantId, inventoryItemId: id },
          });
          if (dto.images.length > 0) {
            await tx.inventoryImage.createMany({
              data: dto.images.map((image, index) => ({
                tenantId,
                inventoryItemId: id,
                url: image.url.trim(),
                sortOrder: image.sortOrder ?? index,
              })),
            });
          }
        }

        return tx.inventoryItem.update({
          where: { id },
          data,
          include: itemInclude,
        });
      });
    } catch (error) {
      this.handleUnique(error);
      throw error;
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.inventoryItem.update({
      where: { id },
      data: { status: InventoryStatus.RETIRED },
      include: itemInclude,
    });
  }

  private async buildWhere(
    tenantId: string,
    query: ListInventoryQueryDto,
  ): Promise<Prisma.InventoryItemWhereInput> {
    const where: Prisma.InventoryItemWhereInput = { tenantId };

    if (query.shopId) where.shopId = query.shopId;

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    } else if (query.parentCategoryId) {
      const children = await this.prisma.category.findMany({
        where: { tenantId, parentId: query.parentCategoryId },
        select: { id: true },
      });
      const ids = [query.parentCategoryId, ...children.map((c) => c.id)];
      where.categoryId = { in: ids };
    }

    if (query.size) where.size = { equals: query.size, mode: 'insensitive' };
    if (query.color) where.color = { equals: query.color, mode: 'insensitive' };
    if (query.occasion) {
      where.occasion = { equals: query.occasion, mode: 'insensitive' };
    }

    if (query.availableOnly) {
      where.status = InventoryStatus.AVAILABLE;
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.rentalPrice = {};
      if (query.minPrice !== undefined) {
        where.rentalPrice.gte = new Prisma.Decimal(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        where.rentalPrice.lte = new Prisma.Decimal(query.maxPrice);
      }
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { itemCode: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async assertCategory(tenantId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, tenantId, isActive: true },
    });
    if (!category) {
      throw new BadRequestException('Category not found or inactive');
    }
  }

  private handleUnique(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'An inventory item with this item code already exists',
      );
    }
  }
}
