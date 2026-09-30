import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReleaseRentalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  conditionAtRelease?: string;
}
