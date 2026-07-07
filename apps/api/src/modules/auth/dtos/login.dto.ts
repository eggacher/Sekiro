import { IsString, IsOptional, IsBoolean, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 登录请求 DTO
 * 实现 @sekiro/shared 中的 LoginRequest 接口
 */
export class LoginDto {
  @ApiProperty({ type: String, required: true, description: "用户名", example: "admin" })
  @IsString({ message: "用户名必须是字符串" })
  @Length(3, 32, { message: "用户名必须 3-32 位" })
  username!: string;

  @ApiProperty({ type: String, required: true, description: "密码", example: "admin123" })
  @IsString({ message: "密码必须是字符串" })
  password!: string;

  @ApiProperty({ type: Boolean, required: false, description: "是否记住密码", example: false })
  @IsOptional()
  @IsBoolean({ message: "记住密码必须是布尔值" })
  remember?: boolean;

  @ApiProperty({ type: String, required: false, description: "图形验证码", example: "1234" })
  @IsOptional()
  @IsString()
  captcha?: string;

  @ApiProperty({ type: String, required: false, description: "验证码标识", example: "uuid-xxx" })
  @IsOptional()
  @IsString()
  captchaId?: string;
}

// 重导出登录响应类型，供 controller 使用
export type { LoginResponse } from "@sekiro/shared";
