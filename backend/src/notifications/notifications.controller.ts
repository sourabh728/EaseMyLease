import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('rentals/:id/send-reminder')
  @Roles(Role.SHOP_OWNER, Role.STAFF)
  sendReminder(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.notificationsService.sendManualReminder(tenantId, id);
  }

  @Post('notifications/run-reminders')
  @Roles(Role.SHOP_OWNER)
  runReminders() {
    return this.notificationsService.runDailyReminders();
  }
}
