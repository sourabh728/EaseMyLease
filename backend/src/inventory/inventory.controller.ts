import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  list(
    @TenantId() tenantId: string,
    @Query() query: ListInventoryQueryDto,
  ) {
    return this.inventoryService.list(tenantId, query);
  }

  /** Lookup by unique itemCode (QR / barcode / manual entry). */
  @Get('by-code/:itemCode')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  getByCode(
    @Param('itemCode') itemCode: string,
    @TenantId() tenantId: string,
  ) {
    return this.inventoryService.findByCode(tenantId, itemCode);
  }

  /**
   * Resolve an item for rental/return flows (same tenant-scoped lookup,
   * plus light rental-context hints).
   */
  @Get('resolve/:itemCode')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  resolveForFlow(
    @Param('itemCode') itemCode: string,
    @TenantId() tenantId: string,
  ) {
    return this.inventoryService.resolveForFlow(tenantId, itemCode);
  }

  @Get(':id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  getOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.inventoryService.findOne(tenantId, id);
  }

  @Post()
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SHOP_OWNER)
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.inventoryService.remove(tenantId, id);
  }
}
