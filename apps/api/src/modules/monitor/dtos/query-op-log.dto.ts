import { IsOptional, IsString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class QueryOpLogDto {
  @ApiProperty({ type: Number, required: false, description: "页码", example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ type: Number, required: false, description: "每页条数", example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 10;

  @ApiProperty({ type: String, required: false, description: "操作人用户名", example: "admin" })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiProperty({ type: String, required: false, description: "操作模块", example: "用户管理" })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiProperty({ type: String, required: false, description: "操作类型", example: "CREATE" })
  @IsOptional()
  @IsString()
  type?: string;
}
