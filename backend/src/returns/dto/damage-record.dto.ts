import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DamageSettlementStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreateDamageRecordDto {
  @IsString()
  rentalId!: string;

  @IsOptional()
  @IsString()
  returnId?: string;

  @IsOptional()
  @IsString()
  rentalItemId?: string;

  @IsString()
  inventoryItemId!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  chargeAmount!: number;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];
}

export class UpdateDamageRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  chargeAmount?: number;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];

  @IsOptional()
  @IsEnum(DamageSettlementStatus)
  settlementStatus?: DamageSettlementStatus;
}

export class ListDamageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  rentalId?: string;

  @IsOptional()
  @IsEnum(DamageSettlementStatus)
  settlementStatus?: DamageSettlementStatus;
}
