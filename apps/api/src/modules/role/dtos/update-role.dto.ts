import { IsString, IsOptional, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateRoleDto {
  @ApiProperty({ type: String, required: true, description: "角色名称，1-32 位", example: "系统管理员" })
  @IsString({ message: "角色名称必须是字符串" })
  @Length(1, 32, { message: "角色名称长度必须 1-32 位" })
  name!: string;

  @ApiProperty({ type: String, required: false, description: "角色描述，最大 255 位", example: "拥有所有权限" })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
