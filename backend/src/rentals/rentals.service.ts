import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryStatus,
  Prisma,
  RentalStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginateMeta } from '../common/dto/pagination-query.dto';
import { CreateRentalDto, CreateRentalItemDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { ListRentalsQueryDto } from './dto/list-rentals-query.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { ReleaseRentalDto } from './dto/release-rental.dto';
import { buildRentalReceiptPdf } from './receipt-pdf';
import { resolveShopId } from '../common/utils/shop-context';

/** Statuses that hold an inventory item for a date range (prevent double-booking). */
export const HOLDING_RENTAL_STATUSES: RentalStatus[] = [
  RentalStatus.CONFIRMED,
  RentalStatus.ACTIVE,
  RentalStatus.RETURN_PENDING,
  RentalStatus.OVERDUE,
];

const UNRENTABLE_STATUSES: InventoryStatus[] = [
  InventoryStatus.DAMAGED,
  InventoryStatus.LOST,
  InventoryStatus.RETIRED,
  InventoryStatus.UNDER_REPAIR,
];

const rentalInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
      whatsapp: true,
      email: true,
      city: true,
    },
  },
  items: {
    include: {
      inventoryItem: {
        select: {
          id: true,
          itemCode: true,
          name: true,
          size: true,
          color: true,
          status: true,
          rentalPrice: true,
          securityDeposit: true,
        },
      },
    },
  },
  payments: { orderBy: { paymentDate: 'desc' as const } },
  returns: {
    include: { items: true },
    orderBy: { returnDate: 'desc' as const },
  },
  damageRecords: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.RentalInclude;

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListRentalsQueryDto) {
    await this.markOverdue(tenantId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.RentalWhereInput = { tenantId };

    if (query.status) where.status = query.status;
    if (query.shopId) where.shopId = query.shopId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.fromDate || query.toDate) {
      where.rentalStartDate = {};
      if (query.fromDate) where.rentalStartDate.gte = new Date(query.fromDate);
      if (query.toDate) where.rentalStartDate.lte = new Date(query.toDate);
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { rentalNumber: { contains: term, mode: 'insensitive' } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { customer: { phone: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.rental.count({ where }),
      this.prisma.rental.findMany({
        where,
        include: rentalInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, meta: paginateMeta(total, page, pageSize) };
  }

  async findOne(tenantId: string, id: string) {
    await this.markOverdue(tenantId);

    const rental = await this.prisma.rental.findFirst({
      where: { id, tenantId },
      include: rentalInclude,
    });
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }
    return rental;
  }

  /** ACTIVE past expectedReturnDate → OVERDUE (simple on-read check). */
  async markOverdue(tenantId: string) {
    await this.prisma.rental.updateMany({
      where: {
        tenantId,
        status: RentalStatus.ACTIVE,
        expectedReturnDate: { lt: new Date() },
      },
      data: { status: RentalStatus.OVERDUE },
    });
  }

  async generateReceiptPdf(tenantId: string, id: string) {
    const rental = await this.prisma.rental.findFirst({
      where: { id, tenantId },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        items: {
          include: {
            inventoryItem: {
              select: {
                itemCode: true,
                name: true,
                size: true,
                color: true,
              },
            },
          },
        },
        payments: { orderBy: { paymentDate: 'asc' } },
      },
    });
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        name: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        gstNumber: true,
      },
    });

    const buffer = await buildRentalReceiptPdf(shop, rental);
    return { buffer, rentalNumber: rental.rentalNumber };
  }

  async checkAvailability(tenantId: string, dto: CheckAvailabilityDto) {
    const start = new Date(dto.rentalStartDate);
    const end = new Date(dto.expectedReturnDate);
    this.assertDateRange(start, end);

    const uniqueIds = [...new Set(dto.inventoryItemIds)];
    const items = await this.prisma.inventoryItem.findMany({
      where: { tenantId, id: { in: uniqueIds } },
      select: {
        id: true,
        itemCode: true,
        name: true,
        status: true,
        rentalPrice: true,
        securityDeposit: true,
      },
    });

    if (items.length !== uniqueIds.length) {
      const found = new Set(items.map((i) => i.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Inventory items not found: ${missing.join(', ')}`,
      );
    }

    const conflicts = await this.findConflicts(
      tenantId,
      uniqueIds,
      start,
      end,
      dto.excludeRentalId,
    );

    const conflictMap = new Map<string, typeof conflicts>();
    for (const c of conflicts) {
      const list = conflictMap.get(c.inventoryItemId) ?? [];
      list.push(c);
      conflictMap.set(c.inventoryItemId, list);
    }

    return {
      rentalStartDate: start,
      expectedReturnDate: end,
      results: items.map((item) => {
        const statusBlocked = UNRENTABLE_STATUSES.includes(item.status);
        const itemConflicts = conflictMap.get(item.id) ?? [];
        const available = !statusBlocked && itemConflicts.length === 0;
        return {
          inventoryItemId: item.id,
          itemCode: item.itemCode,
          name: item.name,
          status: item.status,
          rentalPrice: item.rentalPrice,
          securityDeposit: item.securityDeposit,
          available,
          reason: statusBlocked
            ? `Item status is ${item.status} and cannot be rented`
            : itemConflicts.length > 0
              ? `Already booked for overlapping period (${itemConflicts
                  .map((c) => c.rentalNumber)
                  .join(', ')})`
              : null,
          conflicts: itemConflicts,
        };
      }),
    };
  }

  async create(tenantId: string, userId: string, dto: CreateRentalDto) {
    const start = new Date(dto.rentalStartDate);
    const end = new Date(dto.expectedReturnDate);
    this.assertDateRange(start, end);
    await this.assertCustomer(tenantId, dto.customerId);

    const pricedItems = await this.resolveItemPrices(tenantId, dto.items);
    await this.assertAvailable(
      tenantId,
      pricedItems.map((i) => i.inventoryItemId),
      start,
      end,
    );

    const totals = this.computeTotals(pricedItems, dto.discount ?? 0);
    const rentalNumber = await this.nextRentalNumber(tenantId);
    const shopId = await resolveShopId(this.prisma, tenantId, dto.shopId);

    return this.prisma.rental.create({
      data: {
        tenantId,
        shopId,
        customerId: dto.customerId,
        rentalNumber,
        rentalStartDate: start,
        expectedReturnDate: end,
        subtotal: totals.subtotal,
        discount: totals.discount,
        totalRent: totals.totalRent,
        totalDeposit: totals.totalDeposit,
        amountPaid: new Prisma.Decimal(0),
        balanceAmount: totals.balanceAmount,
        status: RentalStatus.DRAFT,
        notes: dto.notes?.trim() || null,
        createdBy: userId,
        items: {
          create: pricedItems.map((item) => ({
            tenantId,
            inventoryItemId: item.inventoryItemId,
            rentalPrice: item.rentalPrice,
            deposit: item.deposit,
            notes: item.notes,
          })),
        },
      },
      include: rentalInclude,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRentalDto) {
    const rental = await this.findOne(tenantId, id);
    if (rental.status !== RentalStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT rentals can be updated');
    }

    const start = dto.rentalStartDate
      ? new Date(dto.rentalStartDate)
      : rental.rentalStartDate;
    const end = dto.expectedReturnDate
      ? new Date(dto.expectedReturnDate)
      : rental.expectedReturnDate;
    this.assertDateRange(start, end);

    if (dto.customerId) {
      await this.assertCustomer(tenantId, dto.customerId);
    }

    const discount =
      dto.discount !== undefined
        ? dto.discount
        : Number(rental.discount);

    return this.prisma.$transaction(async (tx) => {
      let pricedItems:
        | Array<{
            inventoryItemId: string;
            rentalPrice: Prisma.Decimal;
            deposit: Prisma.Decimal;
            notes: string | null;
          }>
        | undefined;

      if (dto.items) {
        pricedItems = await this.resolveItemPrices(tenantId, dto.items, tx);
        await this.assertAvailable(
          tenantId,
          pricedItems.map((i) => i.inventoryItemId),
          start,
          end,
          id,
          tx,
        );
        await tx.rentalItem.deleteMany({ where: { rentalId: id, tenantId } });
        await tx.rentalItem.createMany({
          data: pricedItems.map((item) => ({
            tenantId,
            rentalId: id,
            inventoryItemId: item.inventoryItemId,
            rentalPrice: item.rentalPrice,
            deposit: item.deposit,
            notes: item.notes,
          })),
        });
      } else {
        await this.assertAvailable(
          tenantId,
          rental.items.map((i) => i.inventoryItemId),
          start,
          end,
          id,
          tx,
        );
      }

      const lineItems =
        pricedItems ??
        rental.items.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          rentalPrice: i.rentalPrice,
          deposit: i.deposit,
          notes: i.notes,
        }));
      const totals = this.computeTotals(lineItems, discount);

      return tx.rental.update({
        where: { id },
        data: {
          customerId: dto.customerId ?? undefined,
          rentalStartDate: start,
          expectedReturnDate: end,
          discount: totals.discount,
          subtotal: totals.subtotal,
          totalRent: totals.totalRent,
          totalDeposit: totals.totalDeposit,
          balanceAmount: totals.totalRent
            .plus(totals.totalDeposit)
            .minus(rental.amountPaid),
          notes:
            dto.notes !== undefined ? dto.notes.trim() || null : undefined,
        },
        include: rentalInclude,
      });
    });
  }

  async confirm(tenantId: string, id: string) {
    const rental = await this.findOne(tenantId, id);
    if (rental.status !== RentalStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT rentals can be confirmed');
    }
    if (rental.items.length === 0) {
      throw new BadRequestException('Rental has no items');
    }

    await this.assertAvailable(
      tenantId,
      rental.items.map((i) => i.inventoryItemId),
      rental.rentalStartDate,
      rental.expectedReturnDate,
      id,
    );

    return this.prisma.$transaction(async (tx) => {
      for (const item of rental.items) {
        const inv = await tx.inventoryItem.findFirst({
          where: { id: item.inventoryItemId, tenantId },
        });
        if (!inv) {
          throw new BadRequestException('Inventory item missing');
        }
        if (UNRENTABLE_STATUSES.includes(inv.status)) {
          throw new ConflictException(
            `${inv.itemCode} cannot be rented (status ${inv.status})`,
          );
        }
        if (
          inv.status === InventoryStatus.AVAILABLE ||
          inv.status === InventoryStatus.RETURNED
        ) {
          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { status: InventoryStatus.RESERVED },
          });
        }
      }

      return tx.rental.update({
        where: { id },
        data: { status: RentalStatus.CONFIRMED },
        include: rentalInclude,
      });
    });
  }

  async release(tenantId: string, id: string, dto: ReleaseRentalDto) {
    const rental = await this.findOne(tenantId, id);
    if (rental.status !== RentalStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED rentals can be released');
    }

    await this.assertAvailable(
      tenantId,
      rental.items.map((i) => i.inventoryItemId),
      rental.rentalStartDate,
      rental.expectedReturnDate,
      id,
    );

    return this.prisma.$transaction(async (tx) => {
      for (const item of rental.items) {
        await tx.rentalItem.update({
          where: { id: item.id },
          data: {
            conditionAtRelease:
              dto.conditionAtRelease?.trim() ||
              item.conditionAtRelease ||
              null,
          },
        });
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { status: InventoryStatus.ON_RENT },
        });
      }

      return tx.rental.update({
        where: { id },
        data: { status: RentalStatus.ACTIVE },
        include: rentalInclude,
      });
    });
  }

  async cancel(tenantId: string, id: string) {
    const rental = await this.findOne(tenantId, id);
    const cancellable: RentalStatus[] = [
      RentalStatus.DRAFT,
      RentalStatus.CONFIRMED,
    ];
    if (!cancellable.includes(rental.status)) {
      throw new BadRequestException(
        'Only DRAFT or CONFIRMED rentals can be cancelled',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (rental.status === RentalStatus.CONFIRMED) {
        for (const item of rental.items) {
          const inv = await tx.inventoryItem.findFirst({
            where: { id: item.inventoryItemId, tenantId },
          });
          if (inv?.status === InventoryStatus.RESERVED) {
            await tx.inventoryItem.update({
              where: { id: inv.id },
              data: { status: InventoryStatus.AVAILABLE },
            });
          }
        }
      }

      return tx.rental.update({
        where: { id },
        data: { status: RentalStatus.CANCELLED },
        include: rentalInclude,
      });
    });
  }

  private assertDateRange(start: Date, end: Date) {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid rental dates');
    }
    if (end <= start) {
      throw new BadRequestException(
        'expectedReturnDate must be after rentalStartDate',
      );
    }
  }

  private async assertCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
  }

  private async resolveItemPrices(
    tenantId: string,
    items: CreateRentalItemDto[],
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const ids = items.map((i) => i.inventoryItemId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate inventory items in rental');
    }

    const inventory = await tx.inventoryItem.findMany({
      where: { tenantId, id: { in: ids } },
    });
    if (inventory.length !== ids.length) {
      throw new BadRequestException('One or more inventory items not found');
    }

    const byId = new Map(inventory.map((i) => [i.id, i]));

    return items.map((line) => {
      const inv = byId.get(line.inventoryItemId)!;
      if (UNRENTABLE_STATUSES.includes(inv.status)) {
        throw new ConflictException(
          `${inv.itemCode} cannot be rented (status ${inv.status})`,
        );
      }
      const rentalPrice =
        line.rentalPrice !== undefined
          ? new Prisma.Decimal(line.rentalPrice)
          : inv.rentalPrice;
      const deposit =
        line.deposit !== undefined
          ? new Prisma.Decimal(line.deposit)
          : inv.securityDeposit ?? new Prisma.Decimal(0);

      return {
        inventoryItemId: inv.id,
        rentalPrice,
        deposit,
        notes: line.notes?.trim() || null,
      };
    });
  }

  private computeTotals(
    items: Array<{ rentalPrice: Prisma.Decimal; deposit: Prisma.Decimal }>,
    discountInput: number,
  ) {
    const subtotal = items.reduce(
      (sum, i) => sum.plus(i.rentalPrice),
      new Prisma.Decimal(0),
    );
    const totalDeposit = items.reduce(
      (sum, i) => sum.plus(i.deposit),
      new Prisma.Decimal(0),
    );
    const discount = new Prisma.Decimal(discountInput);
    if (discount.greaterThan(subtotal)) {
      throw new BadRequestException('Discount cannot exceed subtotal');
    }
    const totalRent = subtotal.minus(discount);
    const balanceAmount = totalRent.plus(totalDeposit);

    return { subtotal, discount, totalRent, totalDeposit, balanceAmount };
  }

  private async assertAvailable(
    tenantId: string,
    inventoryItemIds: string[],
    start: Date,
    end: Date,
    excludeRentalId?: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const conflicts = await this.findConflicts(
      tenantId,
      inventoryItemIds,
      start,
      end,
      excludeRentalId,
      tx,
    );
    if (conflicts.length > 0) {
      const detail = conflicts
        .map(
          (c) =>
            `${c.itemCode} conflicts with ${c.rentalNumber} (${c.status})`,
        )
        .join('; ');
      throw new ConflictException(`Availability conflict: ${detail}`);
    }

    const items = await tx.inventoryItem.findMany({
      where: { tenantId, id: { in: inventoryItemIds } },
    });
    for (const inv of items) {
      if (UNRENTABLE_STATUSES.includes(inv.status)) {
        throw new ConflictException(
          `${inv.itemCode} cannot be rented (status ${inv.status})`,
        );
      }
    }
  }

  private async findConflicts(
    tenantId: string,
    inventoryItemIds: string[],
    start: Date,
    end: Date,
    excludeRentalId?: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const rows = await tx.rentalItem.findMany({
      where: {
        tenantId,
        inventoryItemId: { in: inventoryItemIds },
        rental: {
          tenantId,
          status: { in: HOLDING_RENTAL_STATUSES },
          ...(excludeRentalId ? { id: { not: excludeRentalId } } : {}),
          rentalStartDate: { lt: end },
          expectedReturnDate: { gt: start },
        },
      },
      include: {
        inventoryItem: { select: { itemCode: true, name: true } },
        rental: {
          select: {
            id: true,
            rentalNumber: true,
            status: true,
            rentalStartDate: true,
            expectedReturnDate: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      inventoryItemId: row.inventoryItemId,
      itemCode: row.inventoryItem.itemCode,
      name: row.inventoryItem.name,
      rentalId: row.rental.id,
      rentalNumber: row.rental.rentalNumber,
      status: row.rental.status,
      rentalStartDate: row.rental.rentalStartDate,
      expectedReturnDate: row.rental.expectedReturnDate,
    }));
  }

  private async nextRentalNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `R${year}-`;
    const latest = await this.prisma.rental.findFirst({
      where: { tenantId, rentalNumber: { startsWith: prefix } },
      orderBy: { rentalNumber: 'desc' },
      select: { rentalNumber: true },
    });
    const nextSeq = latest
      ? Number(latest.rentalNumber.slice(prefix.length)) + 1
      : 1;
    if (!Number.isFinite(nextSeq) || nextSeq < 1) {
      return `${prefix}${String(Date.now()).slice(-6)}`;
    }
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }
}
