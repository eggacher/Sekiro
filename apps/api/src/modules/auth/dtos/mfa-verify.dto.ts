import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaVerifyDto {
  @ApiProperty({ description: '6 位 TOTP 验证码', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}

export class MfaVerifyResponseDto {
  @ApiProperty({ description: '是否已启用' })
  enabled!: boolean;
}
