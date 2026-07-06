import { IsString, IsOptional, Matches, Length, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateDictDto {
  @ApiProperty({ type: String, required: true, description: "字典名称，1-32 位", example: "用户状态" })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ type: String, required: true, description: "字典编码，小写字母开头，可包含小写字母、数字、下划线", example: "user_status" })
  @IsString()
  @Length(1, 64)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: "字典编码必须以小写字母开头，且只能包含小写字母、数字和下划线" })
  code!: string;

  @ApiProperty({ type: String, required: false, description: "字典状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;

  @ApiProperty({ type: String, required: false, description: "备注，最大 255 位", example: "用户账号状态字典" })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}
