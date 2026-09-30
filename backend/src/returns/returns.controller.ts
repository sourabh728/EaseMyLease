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
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns-query.dto';
import {
  CreateDamageRecordDto,
  ListDamageQueryDto,
  UpdateDamageRecordDto,
} from './dto/damage-record.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth.types';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('returns')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  list(
    @TenantId() tenantId: string,
    @Query() query: ListReturnsQueryDto,
  ) {
    return this.returnsService.list(tenantId, query);
  }

  @Get('returns/:id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  getOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.returnsService.findOne(tenantId, id);
  }

  @Post('returns')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.create(tenantId, user.id, dto);
  }

  @Get('damage-records')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  listDamage(
    @TenantId() tenantId: string,
    @Query() query: ListDamageQueryDto,
  ) {
    return this.returnsService.listDamage(tenantId, query);
  }

  @Post('damage-records')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  createDamage(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDamageRecordDto,
  ) {
    return this.returnsService.createDamage(tenantId, user.id, dto);
  }

  @Patch('damage-records/:id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  updateDamage(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateDamageRecordDto,
  ) {
    return this.returnsService.updateDamage(tenantId, id, dto);
  }
}
