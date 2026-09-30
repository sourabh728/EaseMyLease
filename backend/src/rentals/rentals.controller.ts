import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { ListRentalsQueryDto } from './dto/list-rentals-query.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { ReleaseRentalDto } from './dto/release-rental.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth.types';

@Controller('rentals')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post('availability')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  checkAvailability(
    @TenantId() tenantId: string,
    @Body() dto: CheckAvailabilityDto,
  ) {
    return this.rentalsService.checkAvailability(tenantId, dto);
  }

  @Get()
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  list(
    @TenantId() tenantId: string,
    @Query() query: ListRentalsQueryDto,
  ) {
    return this.rentalsService.list(tenantId, query);
  }

  @Get(':id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  getOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.rentalsService.findOne(tenantId, id);
  }

  @Post()
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRentalDto,
  ) {
    return this.rentalsService.create(tenantId, user.id, dto);
  }

  @Patch(':id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateRentalDto,
  ) {
    return this.rentalsService.update(tenantId, id, dto);
  }

  @Post(':id/confirm')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  confirm(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.rentalsService.confirm(tenantId, id);
  }

  @Post(':id/release')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  release(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: ReleaseRentalDto,
  ) {
    return this.rentalsService.release(tenantId, id, dto);
  }

  @Post(':id/cancel')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  cancel(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.rentalsService.cancel(tenantId, id);
  }
}
