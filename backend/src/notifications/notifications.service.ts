import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
  Prisma,
  RentalStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { dayKey, endOfDay, startOfDay } from '../reports/dto/report-date-range.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  get remindersEnabled(): boolean {
    const flag = this.config.get<string>('ENABLE_RENTAL_REMINDERS');
    if (flag === undefined || flag === '') return true;
    return flag === 'true' || flag === '1';
  }

  /** Daily job: due-today + overdue email reminders for all tenants. */
  async runDailyReminders() {
    if (!this.remindersEnabled) {
      this.logger.log('Rental reminders disabled (ENABLE_RENTAL_REMINDERS=false)');
      return { skipped: true, sent: 0 };
    }

    await this.markAllOverdue();

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const key = dayKey(new Date());

    const dueToday = await this.prisma.rental.findMany({
      where: {
        status: { in: [RentalStatus.ACTIVE, RentalStatus.OVERDUE] },
        expectedReturnDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        customer: {
          select: { name: true, email: true, phone: true, whatsapp: true },
        },
      },
    });

    const overdue = await this.prisma.rental.findMany({
      where: {
        status: RentalStatus.OVERDUE,
        expectedReturnDate: { lt: todayStart },
      },
      include: {
        customer: {
          select: { name: true, email: true, phone: true, whatsapp: true },
        },
      },
    });

    let sent = 0;
    for (const rental of dueToday) {
      const ok = await this.sendRentalReminder(
        rental,
        NotificationType.RENTAL_DUE_TODAY,
        key,
      );
      if (ok) sent += 1;
    }
    for (const rental of overdue) {
      const ok = await this.sendRentalReminder(
        rental,
        NotificationType.RENTAL_OVERDUE,
        key,
      );
      if (ok) sent += 1;
    }

    this.logger.log(`Daily reminders complete: sent=${sent}`);
    return { skipped: false, sent, dueToday: dueToday.length, overdue: overdue.length };
  }

  /** Manual reminder from rental detail. */
  async sendManualReminder(tenantId: string, rentalId: string) {
    if (!this.remindersEnabled) {
      throw new BadRequestException('Rental reminders are disabled');
    }

    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId },
      include: {
        customer: {
          select: { name: true, email: true, phone: true, whatsapp: true },
        },
      },
    });
    if (!rental) throw new NotFoundException('Rental not found');

    const now = new Date();
    const expected = rental.expectedReturnDate;
    const type =
      expected < startOfDay(now)
        ? NotificationType.RENTAL_OVERDUE
        : NotificationType.RENTAL_DUE_TODAY;

    const key = dayKey(now);
    const emailResult = await this.sendRentalReminder(rental, type, key, true);
    const waLink = this.buildWhatsAppReminderLink(rental, type);

    if (waLink) {
      await this.logNotification({
        tenantId,
        rentalId: rental.id,
        type,
        channel: NotificationChannel.WHATSAPP,
        recipient: rental.customer.whatsapp || rental.customer.phone || 'unknown',
        status: NotificationDeliveryStatus.SKIPPED,
        dayKey: key,
        payload: {
          note: 'WhatsApp Cloud API not configured; wa.me link generated only',
          waMeUrl: waLink,
        },
        force: true,
      });
    }

    return {
      emailSent: emailResult,
      whatsappShareUrl: waLink,
      type,
    };
  }

  /** Optional receipt summary email when a rental completes. */
  async sendReceiptSummary(tenantId: string, rentalId: string) {
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId },
      include: {
        customer: { select: { name: true, email: true } },
        items: {
          include: {
            inventoryItem: { select: { name: true, itemCode: true } },
          },
        },
      },
    });
    if (!rental) return { sent: false, reason: 'not_found' };
    if (!rental.customer.email) {
      return { sent: false, reason: 'no_email' };
    }

    const key = dayKey(new Date());
    const already = await this.prisma.notificationLog.findFirst({
      where: {
        tenantId,
        rentalId,
        type: NotificationType.RENTAL_RECEIPT,
        channel: NotificationChannel.EMAIL,
        dayKey: key,
        status: NotificationDeliveryStatus.SENT,
      },
    });
    if (already) return { sent: false, reason: 'already_sent' };

    const itemLines = rental.items
      .map(
        (i) =>
          `- ${i.inventoryItem.itemCode} ${i.inventoryItem.name} (₹${i.rentalPrice})`,
      )
      .join('\n');

    const subject = `EaseMyLease receipt — ${rental.rentalNumber}`;
    const text = [
      `Hi ${rental.customer.name},`,
      ``,
      `Your rental ${rental.rentalNumber} is complete.`,
      `Total rent: ₹${rental.totalRent}`,
      `Deposit: ₹${rental.totalDeposit}`,
      `Paid: ₹${rental.amountPaid}`,
      `Balance: ₹${rental.balanceAmount}`,
      ``,
      `Items:`,
      itemLines || '—',
      ``,
      `Thank you for choosing us.`,
    ].join('\n');

    try {
      await this.mail.sendPlainEmail(rental.customer.email, subject, text);
      await this.logNotification({
        tenantId,
        rentalId,
        type: NotificationType.RENTAL_RECEIPT,
        channel: NotificationChannel.EMAIL,
        recipient: rental.customer.email,
        status: NotificationDeliveryStatus.SENT,
        dayKey: key,
        payload: { rentalNumber: rental.rentalNumber },
      });
      return { sent: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send failed';
      await this.logNotification({
        tenantId,
        rentalId,
        type: NotificationType.RENTAL_RECEIPT,
        channel: NotificationChannel.EMAIL,
        recipient: rental.customer.email,
        status: NotificationDeliveryStatus.FAILED,
        dayKey: key,
        errorMessage: message,
      });
      return { sent: false, reason: message };
    }
  }

  buildWhatsAppShareUrl(phone: string | null | undefined, text: string) {
    const digits = (phone || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(text);
    if (digits) return `https://wa.me/${digits}?text=${encoded}`;
    return `https://wa.me/?text=${encoded}`;
  }

  private async markAllOverdue() {
    await this.prisma.rental.updateMany({
      where: {
        status: RentalStatus.ACTIVE,
        expectedReturnDate: { lt: new Date() },
      },
      data: { status: RentalStatus.OVERDUE },
    });
  }

  private async sendRentalReminder(
    rental: {
      id: string;
      tenantId: string;
      rentalNumber: string;
      expectedReturnDate: Date;
      totalRent: Prisma.Decimal;
      balanceAmount: Prisma.Decimal;
      customer: {
        name: string;
        email: string | null;
        phone: string;
        whatsapp: string | null;
      };
    },
    type: NotificationType,
    key: string,
    force = false,
  ): Promise<boolean> {
    const email = rental.customer.email?.trim();
    if (!email) {
      await this.logNotification({
        tenantId: rental.tenantId,
        rentalId: rental.id,
        type,
        channel: NotificationChannel.EMAIL,
        recipient: rental.customer.phone,
        status: NotificationDeliveryStatus.SKIPPED,
        dayKey: key,
        errorMessage: 'Customer has no email',
        force,
      });
      return false;
    }

    if (!force) {
      const existing = await this.prisma.notificationLog.findFirst({
        where: {
          tenantId: rental.tenantId,
          rentalId: rental.id,
          type,
          channel: NotificationChannel.EMAIL,
          dayKey: key,
          status: {
            in: [
              NotificationDeliveryStatus.SENT,
              NotificationDeliveryStatus.SKIPPED,
            ],
          },
        },
      });
      if (existing) return false;
    }

    const dueLabel =
      type === NotificationType.RENTAL_OVERDUE ? 'overdue' : 'due today';
    const subject = `Rental ${rental.rentalNumber} is ${dueLabel}`;
    const text = [
      `Hi ${rental.customer.name},`,
      ``,
      `This is a reminder that rental ${rental.rentalNumber} is ${dueLabel}.`,
      `Expected return: ${rental.expectedReturnDate.toISOString().slice(0, 10)}`,
      `Total rent: ₹${rental.totalRent}`,
      `Balance: ₹${rental.balanceAmount}`,
      ``,
      `Please return the items or contact the shop if you need help.`,
    ].join('\n');

    try {
      await this.mail.sendPlainEmail(email, subject, text);
      await this.logNotification({
        tenantId: rental.tenantId,
        rentalId: rental.id,
        type,
        channel: NotificationChannel.EMAIL,
        recipient: email,
        status: NotificationDeliveryStatus.SENT,
        dayKey: key,
        payload: { rentalNumber: rental.rentalNumber },
        force,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send failed';
      await this.logNotification({
        tenantId: rental.tenantId,
        rentalId: rental.id,
        type,
        channel: NotificationChannel.EMAIL,
        recipient: email,
        status: NotificationDeliveryStatus.FAILED,
        dayKey: key,
        errorMessage: message,
        force,
      });
      this.logger.warn(`Reminder email failed rental=${rental.id}: ${message}`);
      return false;
    }
  }

  private buildWhatsAppReminderLink(
    rental: {
      rentalNumber: string;
      expectedReturnDate: Date;
      balanceAmount: Prisma.Decimal;
      customer: { name: string; phone: string; whatsapp: string | null };
    },
    type: NotificationType,
  ) {
    const dueLabel =
      type === NotificationType.RENTAL_OVERDUE ? 'overdue' : 'due today';
    const text = [
      `Hi ${rental.customer.name},`,
      `Reminder: rental ${rental.rentalNumber} is ${dueLabel}.`,
      `Expected return: ${rental.expectedReturnDate.toISOString().slice(0, 10)}`,
      `Balance: ₹${rental.balanceAmount}`,
    ].join('\n');
    return this.buildWhatsAppShareUrl(
      rental.customer.whatsapp || rental.customer.phone,
      text,
    );
  }

  private async logNotification(input: {
    tenantId: string;
    rentalId: string;
    type: NotificationType;
    channel: NotificationChannel;
    recipient: string;
    status: NotificationDeliveryStatus;
    dayKey: string;
    errorMessage?: string;
    payload?: Prisma.InputJsonValue;
    force?: boolean;
  }) {
    try {
      if (input.force) {
        await this.prisma.notificationLog.deleteMany({
          where: {
            tenantId: input.tenantId,
            rentalId: input.rentalId,
            type: input.type,
            channel: input.channel,
            dayKey: input.dayKey,
          },
        });
      }
      await this.prisma.notificationLog.create({
        data: {
          tenantId: input.tenantId,
          rentalId: input.rentalId,
          type: input.type,
          channel: input.channel,
          recipient: input.recipient,
          status: input.status,
          dayKey: input.dayKey,
          errorMessage: input.errorMessage,
          payload: input.payload,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return;
      }
      throw err;
    }
  }
}
