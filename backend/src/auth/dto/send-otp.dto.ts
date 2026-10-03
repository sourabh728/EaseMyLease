import { IsEmail, IsEnum } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class SendOtpDto {
  @IsEmail()
  email!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
