import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('shops')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  list(@TenantId() tenantId: string) {
    return this.shopsService.findByTenant(tenantId);
  }

  @Get(':id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  getOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.shopsService.findOneForTenant(id, tenantId);
  }
}
