import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../types/auth.types';

/**
 * Resolves tenantId from the authenticated JWT user.
 * Never trust a client-supplied tenantId.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'SUPER_ADMIN operations require an explicit tenant context',
      );
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Tenant context missing from token');
    }

    return user.tenantId;
  },
);
