import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class QueryDeptDto {
  @ApiProperty({ type: String, required: false, description: "部门状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ type: String, required: false, description: "搜索关键词", example: "研发" })
  @IsOptional()
  @IsString()
  keyword?: string;
}
