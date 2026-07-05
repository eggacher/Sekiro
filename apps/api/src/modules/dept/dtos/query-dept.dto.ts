import { IsString, IsOptional } from "class-validator";

export class QueryDeptDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
