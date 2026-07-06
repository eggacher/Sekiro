import { IsString, IsInt, IsOptional, Length, Min, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateDictItemDto {
  @ApiProperty({ type: Number, required: true, description: "所属字典类型 ID", example: 1 })
  @IsInt()
  @Min(1)
  typeId!: number;

  @ApiProperty({ type: String, required: true, description: "字典项标签，1-64 位", example: "启用" })
  @IsString()
  @Length(1, 64)
  label!: string;

  @ApiProperty({ type: String, required: true, description: "字典项值，1-64 位", example: "enabled" })
  @IsString()
  @Length(1, 64)
  value!: string;

  @ApiProperty({ type: Number, required: false, description: "排序，最小 0", example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiProperty({ type: String, required: false, description: "字典项状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
