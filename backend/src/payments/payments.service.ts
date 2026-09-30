import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentType, Prisma, RentalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginateMeta } from '../common/dto/pagination-query.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';

const paymentInclude = {
  rental: {
    select: {
      id: true,
      rentalNumber: true,
      status: true,
      customer: { select: { id: true, name: true, phone: true } },
      totalRent: true,
      totalDeposit: true,
      amountPaid: true,
      balanceAmount: true,
    },
  },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListPaymentsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.PaymentWhereInput = { tenantId };

    if (query.rentalId) where.rentalId = query.rentalId;
    if (query.paymentType) where.paymentType = query.paymentType;
    if (query.fromDate || query.toDate) {
      where.paymentDate = {};
      if (query.fromDate) where.paymentDate.gte = new Date(query.fromDate);
      if (query.toDate) where.paymentDate.lte = new Date(query.toDate);
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { transactionRef: { contains: term, mode: 'insensitive' } },
        { rental: { rentalNumber: { contains: term, mode: 'insensitive' } } },
        {
          rental: {
            customer: { name: { contains: term, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, meta: paginateMeta(total, page, pageSize) };
  }

  async findOne(tenantId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: paymentInclude,
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async create(tenantId: string, userId: string, dto: CreatePaymentDto) {
    const rental = await this.prisma.rental.findFirst({
      where: { id: dto.rentalId, tenantId },
    });
    if (!rental) throw new NotFoundException('Rental not found');
    if (rental.status === RentalStatus.CANCELLED) {
      throw new BadRequestException('Cannot record payment on cancelled rental');
    }

    const amount = new Prisma.Decimal(dto.amount);
    const signed =
      dto.paymentType === PaymentType.REFUND ? amount.negated() : amount;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          rentalId: rental.id,
          amount,
          paymentType: dto.paymentType,
          method: dto.method,
          transactionRef: dto.transactionRef?.trim() || null,
          paymentDate: dto.paymentDate
            ? new Date(dto.paymentDate)
            : new Date(),
          notes: dto.notes?.trim() || null,
          createdBy: userId,
        },
        include: paymentInclude,
      });

      const amountPaid = rental.amountPaid.plus(signed);
      if (amountPaid.lessThan(0)) {
        throw new BadRequestException('Refund exceeds amount paid');
      }

      const balanceAmount = rental.totalRent
        .plus(rental.totalDeposit)
        .minus(amountPaid);

      await tx.rental.update({
        where: { id: rental.id },
        data: { amountPaid, balanceAmount },
      });

      return payment;
    });
  }
}
