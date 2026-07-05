import { IsString, IsOptional, IsBoolean, Length } from "class-validator";
import type {
  LoginRequest as ILoginRequest,
  LoginResponse,
} from "@sekiro/shared";

/**
 * 登录请求 DTO
 * 实现 @sekiro/shared 中的 LoginRequest 接口
 */
export class LoginDto implements ILoginRequest {
  @IsString({ message: "用户名必须是字符串" })
  @Length(3, 32, { message: "用户名必须 3-32 位" })
  username!: string;

  @IsString({ message: "密码必须是字符串" })
  password!: string;

  @IsOptional()
  @IsBoolean({ message: "记住密码必须是布尔值" })
  remember?: boolean;

  @IsOptional()
  @IsString()
  captcha?: string;

  @IsOptional()
  @IsString()
  captchaId?: string;
}

// 重导出登录响应类型，供 controller 使用
export { LoginResponse };
