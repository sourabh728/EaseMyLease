import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  getMyTenant(@TenantId() tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }
}
