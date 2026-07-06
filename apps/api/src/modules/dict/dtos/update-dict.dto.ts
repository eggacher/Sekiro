import { IsString, IsOptional, Length, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateDictDto {
  @ApiProperty({ type: String, required: true, description: "字典名称，1-32 位", example: "用户状态" })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ type: String, required: true, description: "字典状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsString()
  @IsIn(["enabled", "disabled"])
  status!: string;

  @ApiProperty({ type: String, required: false, description: "备注，最大 255 位", example: "用户账号状态字典" })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}
