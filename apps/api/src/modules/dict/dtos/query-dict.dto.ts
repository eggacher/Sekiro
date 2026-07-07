import { IsString, IsOptional, IsInt, Min } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class QueryDictDto {
  @ApiProperty({ type: Number, required: false, description: "页码", example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({ type: Number, required: false, description: "每页条数", example: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  pageSize: number = 10;

  @ApiProperty({ type: String, required: false, description: "搜索关键词", example: "user" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ type: String, required: false, description: "字典状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsOptional()
  @IsString()
  status?: string;
}
