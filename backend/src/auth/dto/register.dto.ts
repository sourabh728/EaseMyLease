import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
  Length,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  businessName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  /** Optional; User.name / shop.ownerName are derived from the email local-part. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shopName?: string;

  /** 6-digit email OTP required to confirm registration */
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp!: string;
}
