import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListCategoriesQueryDto) {
    const where: Prisma.CategoryWhereInput = { tenantId };

    if (!query.includeInactive) {
      where.isActive = true;
    }

    if (query.rootsOnly) {
      where.parentId = null;
    } else if (query.parentId) {
      where.parentId = query.parentId;
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { children: true, items: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            isActive: true,
            sortOrder: true,
          },
        },
        _count: { select: { items: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(tenantId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.assertParent(tenantId, dto.parentId);
    }

    try {
      return await this.prisma.category.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          parentId: dto.parentId || null,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        include: {
          parent: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      this.handleUnique(error);
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(tenantId, id);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
      await this.assertParent(tenantId, dto.parentId);
      await this.assertNotDescendant(tenantId, id, dto.parentId);
    }

    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description.trim() || null;
    if (dto.parentId !== undefined) {
      data.parent =
        dto.parentId === null
          ? { disconnect: true }
          : { connect: { id: dto.parentId } };
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.category.update({
        where: { id },
        data,
        include: {
          parent: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      this.handleUnique(error);
      throw error;
    }
  }

  /** Soft-disable by default; hard-delete only when unused. */
  async remove(tenantId: string, id: string, hard = false) {
    const category = await this.findOne(tenantId, id);

    if (!hard) {
      return this.prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    }

    if (category._count.items > 0) {
      throw new BadRequestException(
        'Cannot delete a category that still has inventory items',
      );
    }

    const childCount = await this.prisma.category.count({
      where: { tenantId, parentId: id },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot delete a category that still has subcategories',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async assertParent(tenantId: string, parentId: string) {
    const parent = await this.prisma.category.findFirst({
      where: { id: parentId, tenantId },
    });
    if (!parent) {
      throw new BadRequestException('Parent category not found');
    }
  }

  private async assertNotDescendant(
    tenantId: string,
    categoryId: string,
    proposedParentId: string,
  ) {
    let currentId: string | null = proposedParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'Cannot set a descendant category as parent',
        );
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const current: { parentId: string | null } | null =
        await this.prisma.category.findFirst({
          where: { id: currentId, tenantId },
          select: { parentId: true },
        });
      currentId = current?.parentId ?? null;
    }
  }

  private handleUnique(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A category with this name already exists for this shop',
      );
    }
  }
}
