import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  OtpPurpose,
  Prisma,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { JwtPayload } from '../common/types/auth.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OtpService } from './otp.service';

const BCRYPT_ROUNDS = 12;

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  async sendOtp(email: string, purpose: OtpPurpose) {
    const normalized = email.toLowerCase().trim();

    if (purpose === OtpPurpose.REGISTER) {
      const existing = await this.prisma.user.findUnique({
        where: { email: normalized },
      });
      if (existing) {
        throw new ConflictException('Email is already registered');
      }
    }

    if (purpose === OtpPurpose.RESET_PASSWORD) {
      const user = await this.prisma.user.findUnique({
        where: { email: normalized },
      });
      if (!user || !user.isActive) {
        throw new NotFoundException('No account found with this email.');
      }
    }

    if (purpose === OtpPurpose.LOGIN) {
      const user = await this.prisma.user.findUnique({
        where: { email: normalized },
      });
      if (!user || !user.isActive) {
        // Avoid email enumeration: same response shape
        return { message: 'If that email is registered, a code was sent' };
      }
    }

    await this.otpService.send(normalized, purpose);

    if (purpose === OtpPurpose.LOGIN) {
      return { message: 'If that email is registered, a code was sent' };
    }

    return { message: 'Verification code sent' };
  }

  async verifyOtp(email: string, code: string, purpose: OtpPurpose) {
    return this.otpService.verify(email, code, purpose);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    await this.otpService.consume(email, dto.otp, OtpPurpose.REGISTER);

    const baseSlug = slugify(dto.slug || dto.businessName);
    if (!baseSlug) {
      throw new BadRequestException(
        'Business name must include letters or numbers to create a shop slug',
      );
    }

    const slug = await this.ensureUniqueSlug(baseSlug);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const displayName = this.nameFromEmail(email);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        const tenant = await tx.tenant.create({
          data: {
            name: dto.businessName.trim(),
            slug,
            plan: SubscriptionPlan.FREE,
            subscriptionStatus: SubscriptionStatus.TRIAL,
            trialEndsAt,
          },
        });

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: displayName,
            email,
            phone: dto.phone?.trim() || null,
            passwordHash,
            role: Role.SHOP_OWNER,
          },
        });

        const shop = await tx.shop.create({
          data: {
            tenantId: tenant.id,
            name: (dto.shopName || dto.businessName).trim(),
            ownerName: displayName,
            phone: dto.phone?.trim() || null,
            email,
          },
        });

        return { tenant, user, shop };
      });

      const accessToken = await this.signToken(result.user);

      return {
        accessToken,
        user: this.toSafeUser(result.user),
        tenant: result.tenant,
        shop: result.shop,
      };
    } catch (error) {
      this.rethrowRegisterConflict(error);
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signToken(user);

    return {
      accessToken,
      user: this.toSafeUser(user),
    };
  }

  async loginWithOtp(emailRaw: string, code: string) {
    const email = emailRaw.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid verification code');
    }

    try {
      await this.otpService.consume(email, code, OtpPurpose.LOGIN);
    } catch {
      throw new UnauthorizedException('Invalid verification code');
    }

    const accessToken = await this.signToken(user);

    return {
      accessToken,
      user: this.toSafeUser(user),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();

    await this.otpService.consume(email, dto.otp, OtpPurpose.RESET_PASSWORD);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      // OTP was valid; avoid leaking account state after consume
      return { message: 'Password updated. You can sign in with your new password.' };
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { message: 'Password updated. You can sign in with your new password.' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  private async signToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return this.jwtService.signAsync(payload);
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  /** User display name from the email local-part (e.g. name@example.com → name). */
  private nameFromEmail(email: string): string {
    const local = email.split('@')[0]?.trim() ?? '';
    const name = local.slice(0, 120);
    return name || 'User';
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 1;

    while (await this.prisma.tenant.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private rethrowRegisterConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const fields = Array.isArray(target)
        ? target.map(String)
        : typeof target === 'string'
          ? [target]
          : [];

      if (fields.some((field) => field.includes('email'))) {
        throw new ConflictException('Email is already registered');
      }
      if (fields.some((field) => field.includes('slug'))) {
        throw new ConflictException(
          'That business name is already taken. Try a different name or slug.',
        );
      }
      throw new ConflictException('Registration conflict. Please try again.');
    }

    throw new InternalServerErrorException(
      'Registration failed. Please try again later.',
    );
  }
}
