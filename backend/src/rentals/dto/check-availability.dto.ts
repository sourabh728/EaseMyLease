import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CheckAvailabilityDto {
  @IsDateString()
  rentalStartDate!: string;

  @IsDateString()
  expectedReturnDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  inventoryItemIds!: string[];

  /** Exclude this rental when editing/confirming an existing draft. */
  @IsOptional()
  @IsString()
  excludeRentalId?: string;
}
