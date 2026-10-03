import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
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
    return this.tenantsService.getMyTenantWithLimits(tenantId);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  listAll() {
    return this.tenantsService.listAll();
  }

  @Patch(':id/subscription')
  @Roles(Role.SUPER_ADMIN)
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.tenantsService.updateSubscription(id, dto);
  }
}
