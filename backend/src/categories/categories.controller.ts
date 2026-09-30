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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  list(
    @TenantId() tenantId: string,
    @Query() query: ListCategoriesQueryDto,
  ) {
    return this.categoriesService.list(tenantId, query);
  }

  @Get(':id')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  getOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.categoriesService.findOne(tenantId, id);
  }

  @Post()
  @Roles(Role.SHOP_OWNER)
  create(@TenantId() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(Role.SHOP_OWNER)
  update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SHOP_OWNER)
  remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Query('hard') hard?: string,
  ) {
    return this.categoriesService.remove(tenantId, id, hard === 'true');
  }
}
