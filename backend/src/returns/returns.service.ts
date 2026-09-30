import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryStatus,
  Prisma,
  RentalStatus,
  ReturnCondition,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginateMeta } from '../common/dto/pagination-query.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns-query.dto';
import {
  CreateDamageRecordDto,
  UpdateDamageRecordDto,
} from './dto/damage-record.dto';

const returnInclude = {
  rental: {
    select: {
      id: true,
      rentalNumber: true,
      status: true,
      customerId: true,
      customer: { select: { id: true, name: true, phone: true } },
      totalRent: true,
      totalDeposit: true,
      amountPaid: true,
      balanceAmount: true,
    },
  },
  items: true,
  damageRecords: true,
} satisfies Prisma.RentalReturnInclude;

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListReturnsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.RentalReturnWhereInput = { tenantId };

    if (query.rentalId) where.rentalId = query.rentalId;
    if (query.fromDate || query.toDate) {
      where.returnDate = {};
      if (query.fromDate) where.returnDate.gte = new Date(query.fromDate);
      if (query.toDate) where.returnDate.lte = new Date(query.toDate);
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { rental: { rentalNumber: { contains: term, mode: 'insensitive' } } },
        {
          rental: {
            customer: { name: { contains: term, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.rentalReturn.count({ where }),
      this.prisma.rentalReturn.findMany({
        where,
        include: returnInclude,
        orderBy: { returnDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, meta: paginateMeta(total, page, pageSize) };
  }

  async findOne(tenantId: string, id: string) {
    const row = await this.prisma.rentalReturn.findFirst({
      where: { id, tenantId },
      include: returnInclude,
    });
    if (!row) throw new NotFoundException('Return not found');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateReturnDto) {
    const rental = await this.prisma.rental.findFirst({
      where: { id: dto.rentalId, tenantId },
      include: { items: true },
    });
    if (!rental) throw new NotFoundException('Rental not found');

    const allowed: RentalStatus[] = [
      RentalStatus.ACTIVE,
      RentalStatus.OVERDUE,
      RentalStatus.RETURN_PENDING,
    ];
    if (!allowed.includes(rental.status)) {
      throw new BadRequestException(
        'Returns are only allowed for ACTIVE, OVERDUE, or RETURN_PENDING rentals',
      );
    }

    const rentalItemById = new Map(rental.items.map((i) => [i.id, i]));
    for (const line of dto.items) {
      const ri = rentalItemById.get(line.rentalItemId);
      if (!ri) {
        throw new BadRequestException(
          `Rental item ${line.rentalItemId} does not belong to this rental`,
        );
      }
    }

    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();
    const lateFee = new Prisma.Decimal(dto.lateFee ?? 0);
    const complete = dto.completeSettlement !== false;

    return this.prisma.$transaction(async (tx) => {
      const rentalReturn = await tx.rentalReturn.create({
        data: {
          tenantId,
          rentalId: rental.id,
          returnDate,
          lateFee,
          notes: dto.notes?.trim() || null,
          createdBy: userId,
          items: {
            create: dto.items.map((line) => {
              const ri = rentalItemById.get(line.rentalItemId)!;
              return {
                tenantId,
                rentalItemId: line.rentalItemId,
                inventoryItemId: ri.inventoryItemId,
                condition: line.condition,
                damageNotes: line.damageNotes?.trim() || null,
                missingAccessories: line.missingAccessories?.trim() || null,
                stains: line.stains ?? false,
                isLost:
                  line.isLost ?? line.condition === ReturnCondition.LOST,
                additionalCharge: new Prisma.Decimal(
                  line.additionalCharge ?? 0,
                ),
                notes: line.notes?.trim() || null,
                photoUrls: line.photoUrls ?? undefined,
              };
            }),
          },
        },
        include: returnInclude,
      });

      let extraCharges = lateFee;
      for (const line of dto.items) {
        const ri = rentalItemById.get(line.rentalItemId)!;
        const additional = new Prisma.Decimal(line.additionalCharge ?? 0);
        const damageCharge = new Prisma.Decimal(line.damageCharge ?? 0);
        extraCharges = extraCharges.plus(additional).plus(damageCharge);

        const damageConditions: ReturnCondition[] = [
          ReturnCondition.MINOR_DAMAGE,
          ReturnCondition.MAJOR_DAMAGE,
          ReturnCondition.MISSING_ACCESSORY,
          ReturnCondition.LOST,
        ];
        const needsDamage =
          damageCharge.greaterThan(0) ||
          Boolean(line.damageDescription?.trim()) ||
          damageConditions.includes(line.condition);

        if (needsDamage) {
          await tx.damageRecord.create({
            data: {
              tenantId,
              rentalId: rental.id,
              returnId: rentalReturn.id,
              rentalItemId: ri.id,
              inventoryItemId: ri.inventoryItemId,
              description:
                line.damageDescription?.trim() ||
                line.damageNotes?.trim() ||
                `Return condition: ${line.condition}`,
              chargeAmount: damageCharge.greaterThan(0)
                ? damageCharge
                : additional,
              photoUrls: line.photoUrls ?? undefined,
              createdBy: userId,
            },
          });
        }

        await tx.rentalItem.update({
          where: { id: ri.id },
          data: { conditionAtReturn: line.condition },
        });

        const nextStatus = this.mapInventoryStatus(line.condition, complete);
        await tx.inventoryItem.update({
          where: { id: ri.inventoryItemId },
          data: { status: nextStatus },
        });
      }

      const newTotalRent = rental.totalRent.plus(extraCharges);
      const balanceAmount = newTotalRent
        .plus(rental.totalDeposit)
        .minus(rental.amountPaid);

      await tx.rental.update({
        where: { id: rental.id },
        data: {
          actualReturnDate: returnDate,
          totalRent: newTotalRent,
          balanceAmount,
          status: complete
            ? RentalStatus.COMPLETED
            : RentalStatus.RETURN_PENDING,
        },
      });

      return tx.rentalReturn.findFirstOrThrow({
        where: { id: rentalReturn.id },
        include: returnInclude,
      });
    });
  }

  async listDamage(tenantId: string, rentalId?: string) {
    return this.prisma.damageRecord.findMany({
      where: {
        tenantId,
        ...(rentalId ? { rentalId } : {}),
      },
      include: {
        inventoryItem: {
          select: { id: true, itemCode: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDamage(
    tenantId: string,
    userId: string,
    dto: CreateDamageRecordDto,
  ) {
    const rental = await this.prisma.rental.findFirst({
      where: { id: dto.rentalId, tenantId },
      include: { items: true },
    });
    if (!rental) throw new NotFoundException('Rental not found');

    const inv = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.inventoryItemId, tenantId },
    });
    if (!inv) throw new BadRequestException('Inventory item not found');

    if (dto.returnId) {
      const ret = await this.prisma.rentalReturn.findFirst({
        where: { id: dto.returnId, tenantId, rentalId: rental.id },
      });
      if (!ret) throw new BadRequestException('Return not found for rental');
    }

    if (dto.rentalItemId) {
      const ri = rental.items.find((i) => i.id === dto.rentalItemId);
      if (!ri) {
        throw new BadRequestException('Rental item not found on rental');
      }
    }

    const charge = new Prisma.Decimal(dto.chargeAmount);

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.damageRecord.create({
        data: {
          tenantId,
          rentalId: dto.rentalId,
          returnId: dto.returnId,
          rentalItemId: dto.rentalItemId,
          inventoryItemId: dto.inventoryItemId,
          description: dto.description.trim(),
          chargeAmount: charge,
          photoUrls: dto.photoUrls ?? undefined,
          createdBy: userId,
        },
      });

      if (charge.greaterThan(0)) {
        const newTotalRent = rental.totalRent.plus(charge);
        await tx.rental.update({
          where: { id: rental.id },
          data: {
            totalRent: newTotalRent,
            balanceAmount: newTotalRent
              .plus(rental.totalDeposit)
              .minus(rental.amountPaid),
          },
        });
      }

      return record;
    });
  }

  async updateDamage(
    tenantId: string,
    id: string,
    dto: UpdateDamageRecordDto,
  ) {
    const existing = await this.prisma.damageRecord.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Damage record not found');

    const rental = await this.prisma.rental.findFirst({
      where: { id: existing.rentalId, tenantId },
    });
    if (!rental) throw new NotFoundException('Rental not found');

    const oldCharge = existing.chargeAmount;
    const newCharge =
      dto.chargeAmount !== undefined
        ? new Prisma.Decimal(dto.chargeAmount)
        : oldCharge;
    const delta = newCharge.minus(oldCharge);

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.damageRecord.update({
        where: { id },
        data: {
          description: dto.description?.trim(),
          chargeAmount: dto.chargeAmount !== undefined ? newCharge : undefined,
          photoUrls: dto.photoUrls ?? undefined,
        },
      });

      if (!delta.equals(0)) {
        const newTotalRent = rental.totalRent.plus(delta);
        await tx.rental.update({
          where: { id: rental.id },
          data: {
            totalRent: newTotalRent,
            balanceAmount: newTotalRent
              .plus(rental.totalDeposit)
              .minus(rental.amountPaid),
          },
        });
      }

      return record;
    });
  }

  private mapInventoryStatus(
    condition: ReturnCondition,
    complete: boolean,
  ): InventoryStatus {
    if (condition === ReturnCondition.LOST) return InventoryStatus.LOST;
    if (condition === ReturnCondition.MAJOR_DAMAGE) {
      return InventoryStatus.DAMAGED;
    }
    if (!complete) return InventoryStatus.UNDER_INSPECTION;
    if (
      condition === ReturnCondition.MINOR_DAMAGE ||
      condition === ReturnCondition.MISSING_ACCESSORY
    ) {
      return InventoryStatus.UNDER_INSPECTION;
    }
    return InventoryStatus.AVAILABLE;
  }
}
