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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  list(
    @TenantId() tenantId: string,
    @Query() query: ListCustomersQueryDto,
  ) {
    return this.customersService.list(tenantId, query);
  }

  @Get(':id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  getOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.customersService.findOne(tenantId, id);
  }

  @Post()
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  create(@TenantId() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SHOP_OWNER)
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.customersService.remove(tenantId, id);
  }
}
