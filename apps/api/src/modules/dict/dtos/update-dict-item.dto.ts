import { IsString, IsInt, IsIn, Length, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateDictItemDto {
  @ApiProperty({ type: String, required: true, description: "字典项标签，1-64 位", example: "启用" })
  @IsString()
  @Length(1, 64)
  label!: string;

  @ApiProperty({ type: String, required: true, description: "字典项值，1-64 位", example: "enabled" })
  @IsString()
  @Length(1, 64)
  value!: string;

  @ApiProperty({ type: Number, required: true, description: "排序，最小 0", example: 0 })
  @IsInt()
  @Min(0)
  sort!: number;

  @ApiProperty({ type: String, required: true, description: "字典项状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsString()
  @IsIn(["enabled", "disabled"])
  status!: string;
}
