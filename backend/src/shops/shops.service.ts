import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string) {
    return this.prisma.shop.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createForTenant(tenantId: string, dto: CreateShopDto) {
    try {
      return await this.prisma.shop.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          logo: dto.logo?.trim() || null,
          ownerName: dto.ownerName?.trim() || null,
          phone: dto.phone?.trim() || null,
          whatsapp: dto.whatsapp?.trim() || null,
          email: dto.email?.trim() || null,
          address: dto.address?.trim() || null,
          city: dto.city?.trim() || null,
          state: dto.state?.trim() || null,
          pincode: dto.pincode?.trim() || null,
          gstNumber: dto.gstNumber?.trim() || null,
          businessHours: dto.businessHours
            ? (dto.businessHours as Prisma.InputJsonValue)
            : undefined,
          rentalTerms: dto.rentalTerms?.trim() || null,
          defaultDeposit:
            dto.defaultDeposit !== undefined
              ? new Prisma.Decimal(dto.defaultDeposit)
              : null,
          defaultLateCharge:
            dto.defaultLateCharge !== undefined
              ? new Prisma.Decimal(dto.defaultLateCharge)
              : null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A shop with this name already exists');
      }
      throw error;
    }
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

  async updateForTenant(id: string, tenantId: string, dto: UpdateShopDto) {
    await this.findOneForTenant(id, tenantId);

    const data: Prisma.ShopUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.logo !== undefined) data.logo = dto.logo.trim() || null;
    if (dto.ownerName !== undefined)
      data.ownerName = dto.ownerName.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.whatsapp !== undefined)
      data.whatsapp = dto.whatsapp.trim() || null;
    if (dto.email !== undefined) data.email = dto.email.trim() || null;
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.state !== undefined) data.state = dto.state.trim() || null;
    if (dto.pincode !== undefined) data.pincode = dto.pincode.trim() || null;
    if (dto.gstNumber !== undefined)
      data.gstNumber = dto.gstNumber.trim() || null;
    if (dto.businessHours !== undefined) {
      data.businessHours = dto.businessHours as Prisma.InputJsonValue;
    }
    if (dto.rentalTerms !== undefined)
      data.rentalTerms = dto.rentalTerms.trim() || null;
    if (dto.defaultDeposit !== undefined) {
      data.defaultDeposit = new Prisma.Decimal(dto.defaultDeposit);
    }
    if (dto.defaultLateCharge !== undefined) {
      data.defaultLateCharge = new Prisma.Decimal(dto.defaultLateCharge);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    try {
      return await this.prisma.shop.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A shop with this name already exists');
      }
      throw error;
    }
  }
}
