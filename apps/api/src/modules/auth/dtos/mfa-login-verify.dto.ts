import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaLoginVerifyDto {
  @ApiProperty({ description: 'MFA 临时 token' })
  @IsString()
  @IsNotEmpty()
  mfaToken!: string;

  @ApiProperty({ description: '6 位 TOTP 验证码', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
