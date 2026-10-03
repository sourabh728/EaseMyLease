import { IsEmail, IsEnum, IsString, Length, Matches } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
