import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnCondition } from '@prisma/client';

export class CreateReturnItemDto {
  @IsString()
  rentalItemId!: string;

  @IsEnum(ReturnCondition)
  condition!: ReturnCondition;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  damageNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  missingAccessories?: string;

  @IsOptional()
  @IsBoolean()
  stains?: boolean;

  @IsOptional()
  @IsBoolean()
  isLost?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  additionalCharge?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  damageCharge?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  damageDescription?: string;
}

export class CreateReturnDto {
  @IsString()
  rentalId!: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  lateFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /** When true, marks rental COMPLETED and settles inventory after inspection. */
  @IsOptional()
  @IsBoolean()
  completeSettlement?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items!: CreateReturnItemDto[];
}
