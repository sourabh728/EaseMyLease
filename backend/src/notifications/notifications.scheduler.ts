import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(private readonly notifications: NotificationsService) {}

  /** Daily at 08:00 server local time. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyReminders() {
    this.logger.log('Starting daily rental reminder cron');
    try {
      await this.notifications.runDailyReminders();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Daily reminder cron failed: ${message}`);
    }
  }
}
