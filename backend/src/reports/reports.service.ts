import { Injectable } from '@nestjs/common';
import {
  InventoryStatus,
  PaymentType,
  Prisma,
  RentalStatus,
  DamageSettlementStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  dayKey,
  endOfDay,
  resolveDateRange,
  startOfDay,
} from './dto/report-date-range.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mark ACTIVE rentals past expectedReturnDate as OVERDUE (no cron). */
  async markOverdue(tenantId: string) {
    const result = await this.prisma.rental.updateMany({
      where: {
        tenantId,
        status: RentalStatus.ACTIVE,
        expectedReturnDate: { lt: new Date() },
      },
      data: { status: RentalStatus.OVERDUE },
    });
    return result.count;
  }

  async dashboard(tenantId: string) {
    await this.markOverdue(tenantId);

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [
      todayRentals,
      todayReturns,
      currentlyRented,
      overdueRentals,
      todayRevenueAgg,
      pendingPayments,
      availableInventory,
      recentRentals,
      recentPayments,
      recentReturns,
    ] = await Promise.all([
      this.prisma.rental.count({
        where: {
          tenantId,
          rentalStartDate: { gte: todayStart, lte: todayEnd },
          status: { not: RentalStatus.CANCELLED },
        },
      }),
      this.prisma.rentalReturn.count({
        where: {
          tenantId,
          returnDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.rental.count({
        where: {
          tenantId,
          status: { in: [RentalStatus.ACTIVE, RentalStatus.OVERDUE] },
        },
      }),
      this.prisma.rental.count({
        where: { tenantId, status: RentalStatus.OVERDUE },
      }),
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          paymentDate: { gte: todayStart, lte: todayEnd },
          paymentType: { not: PaymentType.REFUND },
        },
        _sum: { amount: true },
      }),
      this.prisma.rental.count({
        where: {
          tenantId,
          balanceAmount: { gt: 0 },
          status: { not: RentalStatus.CANCELLED },
        },
      }),
      this.prisma.inventoryItem.count({
        where: { tenantId, status: InventoryStatus.AVAILABLE },
      }),
      this.prisma.rental.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          rentalNumber: true,
          status: true,
          totalRent: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: { tenantId },
        orderBy: { paymentDate: 'desc' },
        take: 8,
        select: {
          id: true,
          amount: true,
          paymentType: true,
          method: true,
          paymentDate: true,
          rental: {
            select: {
              id: true,
              rentalNumber: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.rentalReturn.findMany({
        where: { tenantId },
        orderBy: { returnDate: 'desc' },
        take: 8,
        select: {
          id: true,
          returnDate: true,
          lateFee: true,
          rental: {
            select: {
              id: true,
              rentalNumber: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const todayRevenueRefunds = await this.prisma.payment.aggregate({
      where: {
        tenantId,
        paymentDate: { gte: todayStart, lte: todayEnd },
        paymentType: PaymentType.REFUND,
      },
      _sum: { amount: true },
    });

    const gross = todayRevenueAgg._sum.amount ?? new Prisma.Decimal(0);
    const refunds = todayRevenueRefunds._sum.amount ?? new Prisma.Decimal(0);
    const todayRevenue = gross.minus(refunds);

    const activities = [
      ...recentRentals.map((r) => ({
        type: 'RENTAL' as const,
        id: r.id,
        at: r.createdAt,
        label: `Rental ${r.rentalNumber}`,
        detail: `${r.customer?.name ?? 'Customer'} · ${r.status}`,
        amount: r.totalRent,
        hrefId: r.id,
      })),
      ...recentPayments.map((p) => ({
        type: 'PAYMENT' as const,
        id: p.id,
        at: p.paymentDate,
        label: `Payment ${p.paymentType}`,
        detail: `${p.rental.rentalNumber} · ${p.rental.customer?.name ?? ''} · ${p.method}`,
        amount: p.amount,
        hrefId: p.rental.id,
      })),
      ...recentReturns.map((r) => ({
        type: 'RETURN' as const,
        id: r.id,
        at: r.returnDate,
        label: `Return ${r.rental.rentalNumber}`,
        detail: r.rental.customer?.name ?? 'Customer',
        amount: r.lateFee,
        hrefId: r.rental.id,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 12);

    return {
      todayRentals,
      todayReturns,
      currentlyRented,
      overdueRentals,
      todayRevenue,
      pendingPayments,
      availableInventory,
      recentActivities: activities,
    };
  }

  async revenue(tenantId: string, fromDate?: string, toDate?: string) {
    const { from, to } = resolveDateRange(fromDate, toDate);

    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        paymentDate: { gte: from, lte: to },
      },
      select: {
        amount: true,
        paymentType: true,
        paymentDate: true,
      },
      orderBy: { paymentDate: 'asc' },
    });

    const byDate = new Map<
      string,
      { date: string; inflow: number; refunds: number; net: number }
    >();
    const byType = new Map<string, number>();

    for (const p of payments) {
      const key = dayKey(p.paymentDate);
      const row = byDate.get(key) ?? {
        date: key,
        inflow: 0,
        refunds: 0,
        net: 0,
      };
      const amt = Number(p.amount);
      if (p.paymentType === PaymentType.REFUND) {
        row.refunds += amt;
        row.net -= amt;
      } else {
        row.inflow += amt;
        row.net += amt;
      }
      byDate.set(key, row);
      byType.set(p.paymentType, (byType.get(p.paymentType) ?? 0) + amt);
    }

    const series = [...byDate.values()];
    const totalInflow = series.reduce((s, r) => s + r.inflow, 0);
    const totalRefunds = series.reduce((s, r) => s + r.refunds, 0);

    return {
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      totalInflow,
      totalRefunds,
      netRevenue: totalInflow - totalRefunds,
      byType: [...byType.entries()].map(([paymentType, amount]) => ({
        paymentType,
        amount,
      })),
      byDate: series,
    };
  }

  async rentalsSummary(tenantId: string, fromDate?: string, toDate?: string) {
    const { from, to } = resolveDateRange(fromDate, toDate);
    await this.markOverdue(tenantId);

    const [byStatus, inPeriod, completedInPeriod] = await Promise.all([
      this.prisma.rental.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.rental.count({
        where: {
          tenantId,
          rentalStartDate: { gte: from, lte: to },
        },
      }),
      this.prisma.rental.count({
        where: {
          tenantId,
          status: RentalStatus.COMPLETED,
          actualReturnDate: { gte: from, lte: to },
        },
      }),
    ]);

    return {
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      createdInPeriod: inPeriod,
      completedInPeriod,
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
    };
  }

  async inventoryUtilization(tenantId: string) {
    const [byStatus, total, onRent, rentedDistinct] = await Promise.all([
      this.prisma.inventoryItem.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.inventoryItem.count({ where: { tenantId } }),
      this.prisma.inventoryItem.count({
        where: { tenantId, status: InventoryStatus.ON_RENT },
      }),
      this.prisma.rentalItem.findMany({
        where: {
          tenantId,
          rental: {
            status: {
              in: [
                RentalStatus.ACTIVE,
                RentalStatus.OVERDUE,
                RentalStatus.RETURN_PENDING,
              ],
            },
          },
        },
        select: { inventoryItemId: true },
        distinct: ['inventoryItemId'],
      }),
    ]);

    const utilizationRate =
      total > 0 ? Number(((onRent / total) * 100).toFixed(1)) : 0;

    return {
      total,
      onRent,
      activelyRentedDistinct: rentedDistinct.length,
      utilizationRate,
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
    };
  }

  async outstanding(tenantId: string) {
    const [pendingBalances, openDamage] = await Promise.all([
      this.prisma.rental.findMany({
        where: {
          tenantId,
          balanceAmount: { gt: 0 },
          status: { not: RentalStatus.CANCELLED },
        },
        orderBy: { balanceAmount: 'desc' },
        take: 100,
        select: {
          id: true,
          rentalNumber: true,
          status: true,
          totalRent: true,
          totalDeposit: true,
          amountPaid: true,
          balanceAmount: true,
          expectedReturnDate: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.damageRecord.findMany({
        where: {
          tenantId,
          settlementStatus: DamageSettlementStatus.OPEN,
          chargeAmount: { gt: 0 },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          chargeAmount: true,
          description: true,
          settlementStatus: true,
          createdAt: true,
          rental: {
            select: {
              id: true,
              rentalNumber: true,
              customer: { select: { name: true } },
            },
          },
          inventoryItem: {
            select: { id: true, itemCode: true, name: true },
          },
        },
      }),
    ]);

    const totalOutstanding = pendingBalances.reduce(
      (sum, r) => sum.plus(r.balanceAmount),
      new Prisma.Decimal(0),
    );
    const totalOpenDamage = openDamage.reduce(
      (sum, d) => sum.plus(d.chargeAmount),
      new Prisma.Decimal(0),
    );
    const pendingDeposits = pendingBalances.reduce(
      (sum, r) => sum.plus(r.totalDeposit),
      new Prisma.Decimal(0),
    );

    return {
      totalOutstanding,
      pendingDepositExposure: pendingDeposits,
      openDamageCharges: totalOpenDamage,
      pendingBalances,
      openDamageRecords: openDamage,
    };
  }
}
