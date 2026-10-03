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

  async revenueTrend(
    tenantId: string,
    fromDate?: string,
    toDate?: string,
    granularity: 'day' | 'week' = 'day',
  ) {
    const base = await this.revenue(tenantId, fromDate, toDate);
    if (granularity === 'day') {
      return { ...base, granularity: 'day' as const, series: base.byDate };
    }

    const byWeek = new Map<
      string,
      { period: string; inflow: number; refunds: number; net: number }
    >();
    for (const row of base.byDate) {
      const d = new Date(row.date + 'T00:00:00');
      const weekStart = startOfWeek(d);
      const key = dayKey(weekStart);
      const agg = byWeek.get(key) ?? {
        period: key,
        inflow: 0,
        refunds: 0,
        net: 0,
      };
      agg.inflow += row.inflow;
      agg.refunds += row.refunds;
      agg.net += row.net;
      byWeek.set(key, agg);
    }

    return {
      fromDate: base.fromDate,
      toDate: base.toDate,
      totalInflow: base.totalInflow,
      totalRefunds: base.totalRefunds,
      netRevenue: base.netRevenue,
      granularity: 'week' as const,
      series: [...byWeek.values()],
    };
  }

  async topRentedItems(tenantId: string, fromDate?: string, toDate?: string) {
    const { from, to } = resolveDateRange(fromDate, toDate);
    const rows = await this.prisma.rentalItem.findMany({
      where: {
        tenantId,
        rental: {
          status: { not: RentalStatus.CANCELLED },
          rentalStartDate: { gte: from, lte: to },
        },
      },
      select: {
        inventoryItemId: true,
        rentalPrice: true,
        inventoryItem: {
          select: {
            itemCode: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const map = new Map<
      string,
      {
        inventoryItemId: string;
        itemCode: string;
        name: string;
        categoryName: string | null;
        rentalCount: number;
        revenue: number;
      }
    >();
    for (const row of rows) {
      const cur = map.get(row.inventoryItemId) ?? {
        inventoryItemId: row.inventoryItemId,
        itemCode: row.inventoryItem.itemCode,
        name: row.inventoryItem.name,
        categoryName: row.inventoryItem.category?.name ?? null,
        rentalCount: 0,
        revenue: 0,
      };
      cur.rentalCount += 1;
      cur.revenue += Number(row.rentalPrice);
      map.set(row.inventoryItemId, cur);
    }

    const items = [...map.values()].sort(
      (a, b) => b.rentalCount - a.rentalCount || b.revenue - a.revenue,
    );
    return {
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      items: items.slice(0, 25),
    };
  }

  async topCategories(tenantId: string, fromDate?: string, toDate?: string) {
    const top = await this.topRentedItems(tenantId, fromDate, toDate);
    const map = new Map<
      string,
      { categoryName: string; rentalCount: number; revenue: number }
    >();
    for (const item of top.items) {
      const name = item.categoryName ?? 'Uncategorized';
      const cur = map.get(name) ?? {
        categoryName: name,
        rentalCount: 0,
        revenue: 0,
      };
      cur.rentalCount += item.rentalCount;
      cur.revenue += item.revenue;
      map.set(name, cur);
    }
    return {
      fromDate: top.fromDate,
      toDate: top.toDate,
      categories: [...map.values()].sort(
        (a, b) => b.rentalCount - a.rentalCount,
      ),
    };
  }

  async customerAnalytics(
    tenantId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const { from, to } = resolveDateRange(fromDate, toDate);
    const rentals = await this.prisma.rental.findMany({
      where: {
        tenantId,
        status: { not: RentalStatus.CANCELLED },
        rentalStartDate: { gte: from, lte: to },
      },
      select: {
        customerId: true,
        totalRent: true,
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    const map = new Map<
      string,
      {
        customerId: string;
        name: string;
        phone: string;
        email: string | null;
        rentalCount: number;
        totalSpend: number;
      }
    >();
    for (const r of rentals) {
      const cur = map.get(r.customerId) ?? {
        customerId: r.customerId,
        name: r.customer.name,
        phone: r.customer.phone,
        email: r.customer.email,
        rentalCount: 0,
        totalSpend: 0,
      };
      cur.rentalCount += 1;
      cur.totalSpend += Number(r.totalRent);
      map.set(r.customerId, cur);
    }

    const customers = [...map.values()];
    const repeatCustomers = customers.filter((c) => c.rentalCount >= 2).length;
    const uniqueCustomers = customers.length;
    const repeatRate =
      uniqueCustomers > 0
        ? Number(((repeatCustomers / uniqueCustomers) * 100).toFixed(1))
        : 0;

    return {
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      uniqueCustomers,
      repeatCustomers,
      repeatRate,
      topCustomers: customers
        .sort((a, b) => b.rentalCount - a.rentalCount || b.totalSpend - a.totalSpend)
        .slice(0, 25),
    };
  }

  async overdueAging(tenantId: string) {
    await this.markOverdue(tenantId);
    const overdue = await this.prisma.rental.findMany({
      where: { tenantId, status: RentalStatus.OVERDUE },
      select: {
        id: true,
        rentalNumber: true,
        expectedReturnDate: true,
        balanceAmount: true,
        totalRent: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { expectedReturnDate: 'asc' },
    });

    const now = startOfDay(new Date());
    const buckets = {
      '0-3': [] as typeof overdue,
      '4-7': [] as typeof overdue,
      '8-14': [] as typeof overdue,
      '15+': [] as typeof overdue,
    };

    const rows = overdue.map((r) => {
      const days = Math.max(
        0,
        Math.floor(
          (now.getTime() - startOfDay(r.expectedReturnDate).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      );
      const bucket =
        days <= 3 ? '0-3' : days <= 7 ? '4-7' : days <= 14 ? '8-14' : '15+';
      buckets[bucket].push(r);
      return { ...r, daysOverdue: days, bucket };
    });

    return {
      totalOverdue: overdue.length,
      buckets: {
        '0-3': buckets['0-3'].length,
        '4-7': buckets['4-7'].length,
        '8-14': buckets['8-14'].length,
        '15+': buckets['15+'].length,
      },
      rentals: rows,
    };
  }
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
