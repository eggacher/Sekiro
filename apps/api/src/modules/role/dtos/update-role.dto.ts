import { IsString, IsOptional, Length } from "class-validator";

export class UpdateRoleDto {
  @IsString({ message: "角色名称必须是字符串" })
  @Length(1, 32, { message: "角色名称长度必须 1-32 位" })
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
