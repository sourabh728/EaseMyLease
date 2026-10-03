import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendOtpEmail(to: string, code: string, purpose: string): Promise<void> {
    const subject =
      purpose === 'LOGIN'
        ? 'Your EaseMyLease login code'
        : purpose === 'RESET_PASSWORD'
          ? 'Your EaseMyLease password reset code'
          : 'Your EaseMyLease verification code';
    const text = `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`;
    const html = `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`;

    if (!this.transporter) {
      this.logger.warn(
        `[DEV OTP] SMTP not configured. purpose=${purpose} email=${to} code=${code}`,
      );
      return;
    }

    await this.sendMail(to, subject, text, html);
  }

  /** Generic transactional email (reminders, receipt summaries). */
  async sendPlainEmail(to: string, subject: string, text: string): Promise<void> {
    const html = `<pre style="font-family:inherit;white-space:pre-wrap">${text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</pre>`;

    if (!this.transporter) {
      this.logger.warn(
        `[DEV MAIL] SMTP not configured. to=${to} subject=${subject}\n${text}`,
      );
      return;
    }

    await this.sendMail(to, subject, text, html);
  }

  private async sendMail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ) {
    const from =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'noreply@easemylease.local';

    await this.transporter!.sendMail({ from, to, subject, text, html });
  }
}
