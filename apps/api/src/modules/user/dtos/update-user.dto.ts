import { IsString, IsOptional, IsEmail, Matches, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateUserDto {
  @ApiProperty({ type: String, required: true, description: "用户昵称，1-32 位", example: "管理员" })
  @IsString({ message: "显示名必须是字符串" })
  @Length(1, 32, { message: "显示名长度必须 1-32 位" })
  nickname!: string;

  @ApiProperty({ type: String, required: false, description: "电子邮箱", example: "admin@example.com" })
  @IsOptional()
  @IsEmail({}, { message: "邮箱格式不正确" })
  email?: string;

  @ApiProperty({ type: String, required: false, description: "手机号，11 位数字", example: "13800138000" })
  @IsOptional()
  @Matches(/^\d{11}$/, { message: "手机号必须是 11 位数字" })
  phone?: string;

  @ApiProperty({ type: String, required: false, description: "头像地址", example: "https://example.com/avatar.png" })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ type: Number, required: false, description: "所属部门 ID", example: 1 })
  @IsOptional()
  deptId?: number;
}
