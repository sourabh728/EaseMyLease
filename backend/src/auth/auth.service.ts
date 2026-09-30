import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { JwtPayload } from '../common/types/auth.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const baseSlug = slugify(dto.slug || dto.businessName);
    if (!baseSlug) {
      throw new ConflictException('Unable to derive a valid tenant slug');
    }

    const slug = await this.ensureUniqueSlug(baseSlug);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.businessName.trim(),
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: dto.ownerName.trim(),
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
          ownerName: dto.ownerName.trim(),
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

  private async ensureUniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 1;

    while (await this.prisma.tenant.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
