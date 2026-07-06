import { IsString, IsOptional, Matches, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateRoleDto {
  @ApiProperty({ type: String, required: true, description: "角色名称，1-32 位", example: "系统管理员" })
  @IsString({ message: "角色名称必须是字符串" })
  @Length(1, 32, { message: "角色名称长度必须 1-32 位" })
  name!: string;

  @ApiProperty({ type: String, required: true, description: "角色编码，小写字母开头，可包含小写字母、数字、下划线", example: "admin" })
  @IsString({ message: "角色编码必须是字符串" })
  @Matches(/^[a-z][a-z0-9_]*$/, { message: "角色编码只能包含小写字母、数字和下划线，且以字母开头" })
  code!: string;

  @ApiProperty({ type: String, required: false, description: "角色描述，最大 255 位", example: "拥有所有权限" })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
