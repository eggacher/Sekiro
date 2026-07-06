import { IsOptional, IsString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class QueryLoginLogDto {
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

  @ApiProperty({ type: String, required: false, description: "登录用户名", example: "admin" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ type: String, required: false, description: "登录 IP", example: "192.168.1.1" })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiProperty({ type: String, required: false, description: "登录状态：success 成功、fail 失败", example: "success" })
  @IsOptional()
  @IsString()
  status?: string; // success | fail
}
