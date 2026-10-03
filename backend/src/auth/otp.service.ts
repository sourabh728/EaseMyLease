import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_BCRYPT_ROUNDS = 10;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async send(emailRaw: string, purpose: OtpPurpose): Promise<{ message: string }> {
    const email = emailRaw.toLowerCase().trim();

    const latest = await this.prisma.emailOtp.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (
      latest &&
      Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        'Please wait before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, OTP_BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await this.prisma.$transaction([
      this.prisma.emailOtp.updateMany({
        where: { email, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.emailOtp.create({
        data: { email, codeHash, purpose, expiresAt },
      }),
    ]);

    await this.mail.sendOtpEmail(email, code, purpose);

    return { message: 'Verification code sent' };
  }

  /** Validates OTP and marks it consumed. Throws on failure. */
  async consume(emailRaw: string, code: string, purpose: OtpPurpose): Promise<void> {
    const email = emailRaw.toLowerCase().trim();

    const record = await this.prisma.emailOtp.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No verification code found. Request a new one.');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Verification code expired. Request a new one.');
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many invalid attempts. Request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const valid = await bcrypt.compare(code, record.codeHash);
    if (!valid) {
      await this.prisma.emailOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.prisma.emailOtp.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }

  async verify(emailRaw: string, code: string, purpose: OtpPurpose) {
    await this.consume(emailRaw, code, purpose);
    return { verified: true as const };
  }

  private generateCode(): string {
    const max = 10 ** OTP_LENGTH;
    return randomInt(0, max).toString().padStart(OTP_LENGTH, '0');
  }
}
