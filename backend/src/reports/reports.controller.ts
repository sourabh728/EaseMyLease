import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { ReportDateRangeDto } from './dto/report-date-range.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  dashboard(@TenantId() tenantId: string) {
    return this.reportsService.dashboard(tenantId);
  }

  @Get('revenue')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  revenue(
    @TenantId() tenantId: string,
    @Query() query: ReportDateRangeDto,
  ) {
    return this.reportsService.revenue(
      tenantId,
      query.fromDate,
      query.toDate,
    );
  }

  @Get('rentals')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  rentalsSummary(
    @TenantId() tenantId: string,
    @Query() query: ReportDateRangeDto,
  ) {
    return this.reportsService.rentalsSummary(
      tenantId,
      query.fromDate,
      query.toDate,
    );
  }

  @Get('inventory')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  inventory(@TenantId() tenantId: string) {
    return this.reportsService.inventoryUtilization(tenantId);
  }

  @Get('outstanding')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  outstanding(@TenantId() tenantId: string) {
    return this.reportsService.outstanding(tenantId);
  }

  @Get('revenue-trend')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  revenueTrend(
    @TenantId() tenantId: string,
    @Query() query: ReportDateRangeDto,
  ) {
    return this.reportsService.revenueTrend(
      tenantId,
      query.fromDate,
      query.toDate,
      query.granularity,
    );
  }

  @Get('top-items')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  topItems(
    @TenantId() tenantId: string,
    @Query() query: ReportDateRangeDto,
  ) {
    return this.reportsService.topRentedItems(
      tenantId,
      query.fromDate,
      query.toDate,
    );
  }

  @Get('top-categories')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  topCategories(
    @TenantId() tenantId: string,
    @Query() query: ReportDateRangeDto,
  ) {
    return this.reportsService.topCategories(
      tenantId,
      query.fromDate,
      query.toDate,
    );
  }

  @Get('customers')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  customersAnalytics(
    @TenantId() tenantId: string,
    @Query() query: ReportDateRangeDto,
  ) {
    return this.reportsService.customerAnalytics(
      tenantId,
      query.fromDate,
      query.toDate,
    );
  }

  @Get('overdue-aging')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  overdueAging(@TenantId() tenantId: string) {
    return this.reportsService.overdueAging(tenantId);
  }
}
