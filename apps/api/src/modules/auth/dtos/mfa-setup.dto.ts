import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaSetupResponseDto {
  @ApiProperty({ description: '明文 TOTP secret（仅展示一次）' })
  @IsString()
  @IsNotEmpty()
  secret!: string;

  @ApiProperty({ description: '二维码 Data URL' })
  @IsString()
  @IsNotEmpty()
  qrCodeUrl!: string;

  @ApiProperty({ description: '手动输入密钥' })
  @IsString()
  @IsNotEmpty()
  manualEntryKey!: string;
}
