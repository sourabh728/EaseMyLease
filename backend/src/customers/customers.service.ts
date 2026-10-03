import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginateMeta } from '../common/dto/pagination-query.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { resolveShopId } from '../common/utils/shop-context';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListCustomersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CustomerWhereInput = { tenantId };
    if (query.shopId) where.shopId = query.shopId;

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { whatsapp: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, meta: paginateMeta(total, page, pageSize) };
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    const shopId = await resolveShopId(this.prisma, tenantId, dto.shopId);
    try {
      return await this.prisma.customer.create({
        data: {
          tenantId,
          shopId,
          name: dto.name.trim(),
          phone: this.normalizePhone(dto.phone),
          whatsapp: dto.whatsapp
            ? this.normalizePhone(dto.whatsapp)
            : null,
          email: dto.email?.trim().toLowerCase() || null,
          address: dto.address?.trim() || null,
          city: dto.city?.trim() || null,
          idProofType: dto.idProofType?.trim() || null,
          idProofNumber: dto.idProofNumber?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      });
    } catch (error) {
      this.handleUnique(error);
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(tenantId, id);

    const data: Prisma.CustomerUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = this.normalizePhone(dto.phone);
    if (dto.whatsapp !== undefined) {
      data.whatsapp = dto.whatsapp
        ? this.normalizePhone(dto.whatsapp)
        : null;
    }
    if (dto.email !== undefined)
      data.email = dto.email.trim().toLowerCase() || null;
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.idProofType !== undefined)
      data.idProofType = dto.idProofType.trim() || null;
    if (dto.idProofNumber !== undefined)
      data.idProofNumber = dto.idProofNumber.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;

    try {
      return await this.prisma.customer.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleUnique(error);
      throw error;
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { deleted: true, id };
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').trim();
  }

  private handleUnique(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A customer with this phone number already exists',
      );
    }
  }
}
