import { IsString, IsOptional, IsInt, Length, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdatePositionDto {
  @ApiProperty({ type: String, required: true, description: "岗位名称，1-32 位", example: "Java 工程师" })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ type: Number, required: false, description: "排序", example: 0 })
  @IsOptional()
  @IsInt()
  sort?: number;

  @ApiProperty({ type: String, required: false, description: "岗位状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
