import { IsString, IsOptional, Matches, Length } from "class-validator";

export class CreateRoleDto {
  @IsString({ message: "角色名称必须是字符串" })
  @Length(1, 32, { message: "角色名称长度必须 1-32 位" })
  name!: string;

  @IsString({ message: "角色编码必须是字符串" })
  @Matches(/^[a-z][a-z0-9_]*$/, { message: "角色编码只能包含小写字母、数字和下划线，且以字母开头" })
  code!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
