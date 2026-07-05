import { IsString, IsOptional, IsEmail, Matches, Length } from "class-validator";

export class UpdateUserDto {
  @IsString({ message: "显示名必须是字符串" })
  @Length(1, 32, { message: "显示名长度必须 1-32 位" })
  nickname!: string;

  @IsOptional()
  @IsEmail({}, { message: "邮箱格式不正确" })
  email?: string;

  @IsOptional()
  @Matches(/^\d{11}$/, { message: "手机号必须是 11 位数字" })
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  deptId?: number;
}
